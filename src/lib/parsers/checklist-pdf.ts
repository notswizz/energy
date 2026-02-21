// Disable pdfjs worker before importing pdf-parse (not needed in Node.js server)
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "";

import { PDFParse } from "pdf-parse";

// ---- Types ----

export interface ExtractedPhoto {
  imageData: string; // base64 data URL (PNG)
  index: number;
  checklistItem: string; // parent item label
}

export interface ChecklistItem {
  label: string;
  instructions: string | null;
  response: string | null;
  completedBy: string | null;
  completedAt: string | null;
  photos: ExtractedPhoto[];
  expectedPhotoCount: number; // counted from photographer credit pairs in PDF
}

export interface ChecklistSection {
  name: string;
  items: ChecklistItem[];
}

export interface ParsedChecklist {
  projectName: string;
  address: string;
  checklistName: string;
  exportDate: string;
  completionStatus: string;
  company: string;
  sections: ChecklistSection[];
}

// ---- Known section names (longest first for greedy matching) ----

const KNOWN_SECTIONS = [
  "Auditor Recommended Measures",
  "Health and Safety",
  "Check W/ Customer",
  "Air Leakage",
  "Water Heater",
  "Duct System",
  "Crawlspace",
  "Foundation",
  "Appliances",
  "Structure",
  "Electrical",
  "Basement",
  "Building",
  "Exterior",
  "Lighting",
  "Windows",
  "General",
  "Photos",
  "Doors",
  "Walls",
  "Attic",
  "Notes",
  "Roof",
  "HVAC",
];

// Build a regex that matches "Section Name" as a standalone line or "Section Section" doubled pattern
const SECTION_REGEX = new RegExp(
  `^(?:${KNOWN_SECTIONS.map(escapeRegex).join("|")})$`
);

// "Section Section" doubled pattern (CompanyCam repeats section name as a transition)
const DOUBLED_SECTION_REGEX = new RegExp(
  `^(${KNOWN_SECTIONS.map(escapeRegex).join("|")})\\s+\\1$`
);

// ---- Classifier functions for line types ----

// Matches "Dazion (HES) Burks", "John Smith", "Miguel A. Rodriguez", etc.
// A person name: 2-4 capitalized words, optionally with parens
const PERSON_NAME_REGEX = /^[A-Z][a-z]+(?:\s+\([^)]+\))?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/;

// Timestamps: "02/19/2026, 11:36am MST" or "02/19/2026, 1:36pm EST"
const TIMESTAMP_REGEX = /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*(?:am|pm)\s*(?:[A-Z]{2,4})?$/i;

// Option/choice sets: "Yes No N/A", "Yes No", multiple choice labels
const CHOICE_SET_REGEX = /^(?:Yes\s+No(?:\s+N\/A)?|N\s+NE\s+E\s+SE|Single pane|Double pane|Triple pane|Metal\s+Vinyl|Brick Veneer|Duct Board|Fiberglass|Reflective)/i;

// Short response values (numbers, measurements, percentages)
const SHORT_RESPONSE_REGEX = /^(?:\d+(?:\.\d+)?(?:\s*(?:%|feet|ft|inches|in|gallons|gal|amps|watts|btu|seer|tons|cfm|ppm|psi|pa))?|N\/A|None|n\/a)$/i;

// Lines that are continuations of multi-line text (start lowercase, or specific patterns)
function isContinuation(line: string, prevLine: string): boolean {
  if (!prevLine) return false;
  // Starts with lowercase letter = continuation
  if (/^[a-z]/.test(line)) return true;
  // Previous line ended without punctuation and this looks like a continuation
  if (!/[.?!:,]$/.test(prevLine) && /^[a-z(]/.test(line)) return true;
  // "members." type word after sentence fragment
  if (/^(?:members|replacing|meter|settings|documents|fixed|upgraded)/.test(line.toLowerCase())) return true;
  return false;
}

// Detect instruction/note text that should NOT be treated as a label or response
function isInstructionText(line: string): boolean {
  if (line.length < 20) return false;
  // Starts with instructional patterns
  if (/^(?:NOTE:|Please |If |Make sure|Reference |Ensure |Take |All \d|There are )/i.test(line)) return true;
  // Long sentence with instructional tone (30+ chars, starts uppercase, contains action words)
  if (line.length > 50 && /\b(?:make sure|ensure|note|should|must|need to|remember|check|verify|upload)\b/i.test(line)) return true;
  return false;
}

// Detect if a text line is likely a response/answer rather than a new question label
function isLikelyResponse(line: string, currentLabel: string, hasInstructions: boolean): boolean {
  // After a question ending with ?, most text is a response
  if (currentLabel.endsWith("?") && line.length < 200) return true;

  // Short value-like responses
  if (line.length < 60) {
    // Starts with a digit (e.g., "2 I think", "1977", "30 ft")
    if (/^\d/.test(line)) return true;
    // Very short phrase (1-4 words), shorter than the label
    const wordCount = line.split(/\s+/).length;
    if (wordCount <= 4 && line.length < currentLabel.length) return true;
    // Common response values
    if (/^(?:Yes|No|None|Done|Emailed|N\/A|Good|Fair|Poor|Unknown)$/i.test(line.trim())) return true;
  }

  // After instruction text, non-instruction text is the response
  if (hasInstructions && !isInstructionText(line) && line.length < 200 && !isChoiceSet(line)) return true;

  return false;
}

function isPersonName(line: string): boolean {
  return PERSON_NAME_REGEX.test(line);
}

function isTimestamp(line: string): boolean {
  return TIMESTAMP_REGEX.test(line);
}

function isSectionHeader(line: string): boolean {
  return SECTION_REGEX.test(line) || DOUBLED_SECTION_REGEX.test(line);
}

function isChoiceSet(line: string): boolean {
  return CHOICE_SET_REGEX.test(line);
}

function isShortResponse(line: string): boolean {
  return SHORT_RESPONSE_REGEX.test(line) && line.length < 30;
}

function isPhotoLabel(line: string): boolean {
  return /photo/i.test(line) && line.length < 80;
}

// ---- Image extraction using pdf-parse ----

async function extractImagesFromPdf(pdfBuffer: Buffer): Promise<string[]> {
  const parser = new PDFParse({ data: pdfBuffer });
  const imageResult = await parser.getImage({
    imageDataUrl: true,
    imageThreshold: 50,
  });

  const images: string[] = [];
  for (const page of imageResult.pages) {
    for (const img of page.images) {
      // Filter out logos, icons, checkboxes — real photos are typically > 150px on each side
      if (img.dataUrl && img.width > 150 && img.height > 150) {
        images.push(img.dataUrl);
      }
    }
  }

  await parser.destroy();
  return images;
}

// ---- Text parsing ----

interface TaggedLine {
  text: string;
  type: "section" | "person" | "timestamp" | "choices" | "response" | "photo_label" | "text";
}

function tagLines(lines: string[]): TaggedLine[] {
  const tagged: TaggedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isSectionHeader(line)) {
      tagged.push({ text: line, type: "section" });
    } else if (isTimestamp(line)) {
      tagged.push({ text: line, type: "timestamp" });
    } else if (isPersonName(line)) {
      tagged.push({ text: line, type: "person" });
    } else if (isChoiceSet(line)) {
      tagged.push({ text: line, type: "choices" });
    } else if (isShortResponse(line)) {
      tagged.push({ text: line, type: "response" });
    } else if (isPhotoLabel(line) && line.length < 60) {
      tagged.push({ text: line, type: "photo_label" });
    } else {
      tagged.push({ text: line, type: "text" });
    }
  }

  return tagged;
}

function parseChecklistText(text: string): {
  header: Omit<ParsedChecklist, "sections">;
  sections: ChecklistSection[];
} {
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // ---- Extract header info from first ~30 lines ----
  let projectName = "";
  let address = "";
  let checklistName = "";
  let exportDate = "";
  let completionStatus = "";
  let company = "";

  for (let i = 0; i < Math.min(rawLines.length, 30); i++) {
    const line = rawLines[i];
    if (!address && /\d+\s+\w+.*(?:St|Ave|Blvd|Dr|Ln|Rd|Way|Ct|Pl|Cir|Trl),?\s*\w+,?\s*[A-Z]{2}\s+\d{5}/.test(line)) {
      address = line;
    }
    if (!checklistName && /(?:audit|guide|checklist|ira)/i.test(line) && line.length < 60) {
      checklistName = line;
    }
    if (/\d+\/\d+\s*(?:tasks?|items?)\s*completed/i.test(line)) {
      completionStatus = line;
    }
    if (/(?:exported?|created?|generated?|date)\s*:?\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(line)) {
      exportDate = line;
    }
    if (/(?:company|contractor|firm)\s*:?\s*/i.test(line)) {
      company = line.replace(/(?:company|contractor|firm)\s*:?\s*/i, "").trim();
    }
  }
  // Try to find project name (homeowner) - usually a 2-word capitalized name near the top
  if (!projectName) {
    for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
      if (PERSON_NAME_REGEX.test(rawLines[i])) {
        projectName = rawLines[i];
        break;
      }
    }
  }
  if (!projectName) {
    for (let i = 0; i < Math.min(rawLines.length, 15); i++) {
      if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(rawLines[i]) && rawLines[i].length < 40) {
        projectName = rawLines[i];
        break;
      }
    }
  }

  // ---- Tag all lines ----
  const tagged = tagLines(rawLines);

  // ---- Split into sections ----
  // Merge lines between section headers into section content.
  // Deduplicate sections by merging items with the same name.
  const sectionMap = new Map<string, TaggedLine[]>();
  let currentSectionName = "_header";
  let currentSectionLines: TaggedLine[] = [];

  for (const tl of tagged) {
    if (tl.type === "section") {
      // Flush previous section
      if (currentSectionLines.length > 0) {
        const existing = sectionMap.get(currentSectionName) || [];
        existing.push(...currentSectionLines);
        sectionMap.set(currentSectionName, existing);
      }
      // Normalize "Section Section" → "Section"
      const match = tl.text.match(DOUBLED_SECTION_REGEX);
      currentSectionName = match ? match[1] : tl.text;
      currentSectionLines = [];
    } else {
      currentSectionLines.push(tl);
    }
  }
  // Flush last section
  if (currentSectionLines.length > 0) {
    const existing = sectionMap.get(currentSectionName) || [];
    existing.push(...currentSectionLines);
    sectionMap.set(currentSectionName, existing);
  }

  // Remove the header pseudo-section
  sectionMap.delete("_header");

  // ---- Parse items within each section ----
  const sections: ChecklistSection[] = [];

  for (const [sectionName, sectionLines] of sectionMap) {
    const items = parseSectionItems(sectionLines);
    if (items.length > 0 || sectionLines.length > 0) {
      sections.push({ name: sectionName, items });
    }
  }

  return {
    header: { projectName, address, checklistName, exportDate, completionStatus, company },
    sections,
  };
}

function parseSectionItems(lines: TaggedLine[]): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // State machine
  let label = "";
  let instructions = "";
  let response = "";
  let completedBy: string | null = null;
  let completedAt: string | null = null;
  let photoCredits = 0; // count person+timestamp pairs (= photo count for photo items)
  let lastWasPerson = false; // track person→timestamp pairs

  function flushItem() {
    if (!label) return;

    // Clean up: if label is just a person name or timestamp, skip it
    if (PERSON_NAME_REGEX.test(label) || TIMESTAMP_REGEX.test(label)) {
      label = "";
      instructions = "";
      response = "";
      completedBy = null;
      completedAt = null;
      photoCredits = 0;
      lastWasPerson = false;
      return;
    }

    // For photo-labeled items, expectedPhotoCount = number of photographer credits
    // For other items, it's 0 (they don't have photos)
    const isPhoto = /photo/i.test(label);

    items.push({
      label: label.trim(),
      instructions: instructions.trim() || null,
      response: response.trim() || null,
      completedBy,
      completedAt,
      photos: [],
      expectedPhotoCount: isPhoto ? photoCredits : 0,
    });

    label = "";
    instructions = "";
    response = "";
    completedBy = null;
    completedAt = null;
    photoCredits = 0;
    lastWasPerson = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const tl = lines[i];
    const prev = i > 0 ? lines[i - 1] : null;

    switch (tl.type) {
      case "person":
        completedBy = tl.text;
        lastWasPerson = true;
        break;

      case "timestamp":
        completedAt = tl.text;
        // A person followed by timestamp = one photographer credit (= one photo)
        if (lastWasPerson) {
          photoCredits++;
        }
        lastWasPerson = false;
        break;

      case "choices":
        // Choice sets are part of the current item's context — append to instructions
        if (label) {
          instructions += (instructions ? " " : "") + "[" + tl.text + "]";
        }
        lastWasPerson = false;
        break;

      case "response":
        if (label) {
          response += (response ? ", " : "") + tl.text;
        }
        lastWasPerson = false;
        break;

      case "photo_label":
        flushItem();
        label = tl.text;
        break;

      case "text": {
        if (!label) {
          // No active label — start new item
          label = tl.text;
          break;
        }

        // After completion metadata or choices or response, start a new item
        if (prev && (prev.type === "timestamp" || prev.type === "person" || prev.type === "choices")) {
          // Unless this is a continuation (lowercase start)
          if (!isContinuation(tl.text, label + " " + instructions)) {
            flushItem();
            label = tl.text;
            break;
          }
        }

        // If current item already has a response, this is a new item
        if (response) {
          flushItem();
          label = tl.text;
          break;
        }

        // Check if this text is a response to the current label
        if (!response && isLikelyResponse(tl.text, label, !!instructions)) {
          response = tl.text;
          break;
        }

        // Check if this is instruction/note text
        if (isInstructionText(tl.text)) {
          instructions += (instructions ? " " : "") + tl.text;
          break;
        }

        // If this is a continuation of previous text
        if (isContinuation(tl.text, label + " " + instructions)) {
          if (instructions) {
            instructions += " " + tl.text;
          } else if (label.length < 200) {
            label += " " + tl.text;
          } else {
            instructions += tl.text;
          }
          break;
        }

        // If previous was a response type, start new item
        if (prev && prev.type === "response") {
          flushItem();
          label = tl.text;
          break;
        }

        // If this ends with ?, it's a new question
        if (tl.text.endsWith("?")) {
          flushItem();
          label = tl.text;
          break;
        }

        // Otherwise, append to label or instructions
        if (label.length > 100) {
          instructions += (instructions ? " " : "") + tl.text;
        } else {
          label += " " + tl.text;
        }
        break;
      }

      case "section":
        flushItem();
        break;
    }
  }

  flushItem();

  return items;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---- Main parser ----

export async function parseChecklistPdf(pdfBuffer: Buffer): Promise<{
  checklist: ParsedChecklist;
  photoCount: number;
  sectionsFound: string[];
}> {
  // Parse text
  const textParser = new PDFParse({ data: Buffer.from(pdfBuffer) });
  const textResult = await textParser.getText();
  const fullText = textResult.pages.map((p) => p.text).join("\n");
  await textParser.destroy();

  const { header, sections } = parseChecklistText(fullText);

  // Extract images (filter out small logos/icons)
  let images: string[] = [];
  try {
    images = await extractImagesFromPdf(pdfBuffer);
  } catch (err) {
    console.error("Image extraction failed:", err);
  }

  // Collect photo items in document order
  const photoItems: ChecklistItem[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.expectedPhotoCount > 0) {
        photoItems.push(item);
      }
    }
  }

  // Distribute images using expectedPhotoCount from photographer credits
  // Images are in page order from PDF, photo items are in document order
  // Each photo item gets exactly as many images as it has photographer credits
  let imageIndex = 0;

  if (photoItems.length > 0 && images.length > 0) {
    // First pass: assign based on expectedPhotoCount
    for (const item of photoItems) {
      const count = item.expectedPhotoCount;
      const batchEnd = Math.min(imageIndex + count, images.length);
      for (let j = imageIndex; j < batchEnd; j++) {
        item.photos.push({ imageData: images[j], index: j, checklistItem: item.label });
      }
      imageIndex = batchEnd;
      if (imageIndex >= images.length) break;
    }

    // If there are leftover images (e.g. logo/header images that shifted the count),
    // skip them rather than mis-assigning
  } else if (images.length > 0) {
    // No photo items found — fall back to distributing across all items
    const allItems = sections.flatMap((s) => s.items);
    if (allItems.length > 0) {
      const imagesPerItem = Math.max(1, Math.ceil(images.length / allItems.length));
      for (const item of allItems) {
        const batchEnd = Math.min(imageIndex + imagesPerItem, images.length);
        for (let j = imageIndex; j < batchEnd; j++) {
          item.photos.push({ imageData: images[j], index: j, checklistItem: item.label });
        }
        imageIndex = batchEnd;
        if (imageIndex >= images.length) break;
      }
    }
  }

  const checklist: ParsedChecklist = {
    ...header,
    sections,
  };

  return {
    checklist,
    photoCount: images.length,
    sectionsFound: sections.map((s) => s.name),
  };
}
