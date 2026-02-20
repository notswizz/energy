const ABBREVIATIONS: Record<string, string> = {
  st: "street",
  str: "street",
  ave: "avenue",
  av: "avenue",
  blvd: "boulevard",
  dr: "drive",
  ln: "lane",
  rd: "road",
  ct: "court",
  cir: "circle",
  pl: "place",
  pkwy: "parkway",
  hwy: "highway",
  trl: "trail",
  ter: "terrace",
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  ne: "northeast",
  nw: "northwest",
  se: "southeast",
  sw: "southwest",
  apt: "",
  unit: "",
  ste: "",
  suite: "",
  "#": "",
};

export function normalizeAddress(raw: string | undefined | null): string {
  if (!raw) return "";
  let addr = raw.toLowerCase().trim();

  // Remove punctuation except hyphens in numbers
  addr = addr.replace(/[.,#]/g, " ");

  // Split into tokens
  let tokens = addr.split(/\s+/).filter(Boolean);

  // Expand abbreviations and remove unit designators
  tokens = tokens
    .map((token) => ABBREVIATIONS[token] ?? token)
    .filter((token) => token !== "");

  // Remove anything after unit-type words were stripped (the unit number itself)
  // e.g., "apt 3" -> "apt" removed, "3" stays — we need to handle this differently
  // Actually, we strip the keyword but keep the number. That's fine for matching.

  return tokens.join(" ");
}

export function matchAddresses(a: string, b: string): { score: number; isMatch: boolean } {
  const normA = normalizeAddress(a);
  const normB = normalizeAddress(b);

  // Exact match
  if (normA === normB) {
    return { score: 1.0, isMatch: true };
  }

  // Token-based Jaccard similarity
  const tokensA = new Set(normA.split(" "));
  const tokensB = new Set(normB.split(" "));

  const intersection = new Set([...tokensA].filter((t) => tokensB.has(t)));
  const union = new Set([...tokensA, ...tokensB]);

  const score = intersection.size / union.size;
  return { score, isMatch: score >= 0.75 };
}
