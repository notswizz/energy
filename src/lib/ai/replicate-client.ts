import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const CLASSIFICATION_CATEGORIES = [
  "blower_door_setup",
  "blower_door_result",
  "manometer_reading",
  "hvac_unit_outdoor",
  "hvac_unit_indoor",
  "hvac_nameplate",
  "ductwork",
  "water_heater",
  "water_heater_nameplate",
  "thermostat",
  "electrical_panel",
  "attic_insulation",
  "wall_insulation",
  "crawlspace",
  "basement",
  "window",
  "door",
  "siding_exterior",
  "roof",
  "kitchen_appliance",
  "laundry_appliance",
  "lighting",
  "solar_panel",
  "combustion_safety",
  "other",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  blower_door_setup: "a blower door test setup",
  blower_door_result: "a blower door test result display",
  manometer_reading: "a manometer or pressure gauge",
  hvac_unit_outdoor: "an outdoor HVAC condenser/heat pump unit",
  hvac_unit_indoor: "an indoor furnace or air handler",
  hvac_nameplate: "an HVAC equipment nameplate/data plate",
  ductwork: "ductwork or duct insulation",
  water_heater: "a water heater",
  water_heater_nameplate: "a water heater nameplate",
  thermostat: "a thermostat display",
  electrical_panel: "an electrical service panel/breaker box",
  attic_insulation: "attic insulation",
  wall_insulation: "wall insulation or wall cavity",
  crawlspace: "a crawlspace",
  basement: "a basement",
  window: "a window",
  door: "an exterior door",
  siding_exterior: "the exterior/siding of a home",
  roof: "a roof",
  kitchen_appliance: "a kitchen appliance (range/oven/fridge/dishwasher)",
  laundry_appliance: "a laundry appliance (washer/dryer)",
  lighting: "lighting fixtures or bulbs",
  solar_panel: "solar panels",
  combustion_safety: "combustion safety test equipment/results",
};

const CLASSIFICATION_PROMPT = `Classify this home energy audit photo into exactly one of these categories:
${CLASSIFICATION_CATEGORIES.join(", ")}

Respond with ONLY the category name, nothing else.`;

// SnuggPro-aligned extraction prompts — field names and value formats match SnuggPro input schema
export const EXTRACTION_PROMPTS: Record<string, string> = {
  blower_door_setup: `This is a blower door test setup photo from an energy audit. Read the gauge/manometer display carefully. Respond with valid JSON only: {"cfm50": number|null, "pressure_pa": number|null, "test_performed": true}`,

  blower_door_result: `This is a blower door test result display. Read the exact CFM50 value from the gauge or screen. This is critical for the energy audit. Respond with valid JSON only: {"cfm50": number|null, "pressure_pa": number|null, "ach50": number|null}`,

  manometer_reading: `This shows a manometer or pressure gauge reading from an energy audit. Read the numbers on the display. Respond with valid JSON only: {"cfm50": number|null, "pressure_pa": number|null, "duct_leakage_cfm25": number|null}`,

  hvac_unit_outdoor: `This is an outdoor HVAC unit (condenser/heat pump). Read the nameplate if visible. For fuel_type use one of: "Electricity", "Natural Gas", "Propane". Respond with valid JSON only: {"manufacturer": string|null, "model_number": string|null, "serial_number": string|null, "fuel_type": string|null, "system_type": string|null, "seer": number|null, "tonnage": number|null, "year_manufactured": number|null}`,

  hvac_unit_indoor: `This is an indoor HVAC unit (furnace/air handler). Read the nameplate if visible. For fuel_type use one of: "Electricity", "Natural Gas", "Propane". Respond with valid JSON only: {"manufacturer": string|null, "model_number": string|null, "serial_number": string|null, "btu_input": number|null, "btu_output": number|null, "fuel_type": string|null, "afue": number|null, "year_manufactured": number|null}`,

  hvac_nameplate: `This is an HVAC equipment nameplate. Read ALL text carefully — manufacturer, model, serial, ratings. For fuel_type use: "Electricity", "Natural Gas", or "Propane". Respond with valid JSON only: {"manufacturer": string|null, "model_number": string|null, "serial_number": string|null, "seer": number|null, "hspf": number|null, "afue": number|null, "btu_input": number|null, "btu_output": number|null, "fuel_type": string|null, "tonnage": number|null, "year_manufactured": number|null}`,

  ductwork: `This shows ductwork from an energy audit. Describe what you see. For material use: "Flex", "Sheet Metal", "Duct Board", "Fiberglass". Respond with valid JSON only: {"material": string|null, "insulated": boolean|null, "insulation_r_value": number|null, "condition": string|null, "sealed": boolean|null, "location": string|null}`,

  water_heater: `This is a water heater. Read the label/nameplate. For fuel use: "Natural Gas", "Electricity", or "Propane". For type use: "Tank Water Heater", "Tankless", or "Heat Pump". For location use: "Garage/Unconditioned", "Conditioned", "Attic", "Basement", or "Crawlspace". Respond with valid JSON only: {"manufacturer": string|null, "model_number": string|null, "fuel_type": string|null, "type": string|null, "capacity_gallons": number|null, "energy_factor": number|null, "year_manufactured": number|null, "location": string|null, "tank_wrap": boolean|null, "pipe_wrap": boolean|null}`,

  water_heater_nameplate: `This is a water heater nameplate. Read ALL text carefully. For fuel use: "Natural Gas", "Electricity", or "Propane". Respond with valid JSON only: {"manufacturer": string|null, "model_number": string|null, "serial_number": string|null, "fuel_type": string|null, "capacity_gallons": number|null, "energy_factor": number|null, "uef": number|null, "btu_input": number|null, "year_manufactured": number|null, "first_hour_rating": number|null}`,

  thermostat: `This shows a thermostat display. Read the current settings. Respond with valid JSON only: {"manufacturer": string|null, "model": string|null, "heating_setpoint_high": number|null, "heating_setpoint_low": number|null, "cooling_setpoint_low": number|null, "cooling_setpoint_high": number|null, "type": string|null, "programmable": boolean|null}`,

  electrical_panel: `This is an electrical service panel. Count the breaker slots and read the main breaker amperage. Respond with valid JSON only: {"max_amps": number|null, "total_breaker_slots": number|null, "open_breaker_spots": number|null, "manufacturer": string|null, "main_breaker_amps": number|null}`,

  attic_insulation: `This shows attic insulation. Estimate the depth in inches and identify the type. For type use: "Fiberglass batts", "Fiberglass blown", "Rockwool batts", "Rockwool blown", "Cellulose blown", "Spray Foam open-cell", or "Spray Foam closed-cell". For depth_range use: "0", "1-3", "4-6", "7-9", "10-12", "13-15", "16+". Respond with valid JSON only: {"insulation_type": string|null, "depth_inches": number|null, "depth_range": string|null, "condition": string|null, "coverage_percent": number|null}`,

  wall_insulation: `This shows wall insulation or a wall cavity. For insulated use: "Yes", "No", or "Poorly". For construction use: "2x4 Frame", "2x6 Frame", "Block/CMU", or "SIP". For siding use: "Metal/vinyl", "Brick Veneer", "Stucco", or "Wood/Fiber Cement". Respond with valid JSON only: {"insulated": string|null, "insulation_type": string|null, "construction": string|null, "siding": string|null, "condition": string|null}`,

  crawlspace: `This shows a crawlspace. Describe what you see for energy audit purposes. Respond with valid JSON only: {"insulated": boolean|null, "insulation_type": string|null, "moisture_barrier": boolean|null, "vented": boolean|null, "condition": string|null, "height_inches": number|null}`,

  basement: `This shows a basement. Describe for energy audit purposes. Respond with valid JSON only: {"wall_insulated": boolean|null, "insulation_type": string|null, "heated": boolean|null, "cooled": boolean|null, "finished": boolean|null, "ceiling_insulated": boolean|null, "condition": string|null}`,

  window: `This shows a window. For pane_type use: "Single pane", "Double pane", or "Triple pane". For frame use: "Vinyl", "Metal", "Wood", or "Wood/metal clad". Respond with valid JSON only: {"pane_type": string|null, "frame_material": string|null, "storm_window": boolean|null, "condition": string|null, "low_e": boolean|null}`,

  door: `This shows an exterior door. For material use: "Fiberglass", "Steel", "Wood", "Sliding glass", or "French". Respond with valid JSON only: {"material": string|null, "has_storm_door": boolean|null, "weatherstripped": boolean|null, "condition": string|null}`,

  siding_exterior: `This shows the exterior of a home. Identify the siding type. For siding use: "Metal/vinyl", "Brick Veneer", "Stucco", "Wood/Fiber Cement", or "Stone". Also estimate the number of floors visible above grade (1, 1.5, 2, or 3). Respond with valid JSON only: {"siding": string|null, "floors_above_grade": number|null, "condition": string|null, "orientation": string|null}`,

  roof: `This shows a roof. Describe the condition for energy audit purposes. For condition use: "Good", "Fair", "Poor", or "Needs Replacement". Respond with valid JSON only: {"material": string|null, "condition": string|null, "age_estimate_years": number|null, "ventilation_visible": boolean|null}`,

  kitchen_appliance: `This is a kitchen appliance (range, oven, refrigerator, or dishwasher). Read the nameplate/label if visible. For fuel_type use: "Natural Gas", "Electricity", or "Propane". For type use: "Range", "Oven", "Refrigerator", or "Dishwasher". Respond with valid JSON only: {"type": string|null, "manufacturer": string|null, "model": string|null, "fuel_type": string|null, "energy_star": boolean|null, "age_estimate_years": number|null, "size_cubic_ft": number|null}`,

  laundry_appliance: `This is a laundry appliance (washer or dryer). Read the nameplate/label if visible. For dryer fuel_type use: "Natural Gas" or "Electricity". Respond with valid JSON only: {"type": string|null, "manufacturer": string|null, "model": string|null, "fuel_type": string|null, "energy_star": boolean|null, "washer_type": string|null}`,

  lighting: `This shows lighting in a home. Identify bulb types (LED, CFL, or incandescent). Estimate the percentage that are LED/CFL. For led_cfl_percent use: "0-25%", "26-50%", "51-75%", or "76-100%". Respond with valid JSON only: {"bulb_types_visible": string|null, "led_cfl_percent": string|null, "estimated_bulb_count": number|null}`,

  solar_panel: `This shows solar panels. Extract visible information. Respond with valid JSON only: {"panel_count": number|null, "manufacturer": string|null, "estimated_kw": number|null, "condition": string|null, "inverter_type": string|null}`,

  combustion_safety: `This shows combustion safety testing equipment/results from an energy audit. Read the numbers carefully. Respond with valid JSON only: {"ambient_co_ppm": number|null, "undiluted_flue_co_ppm": number|null, "draft_pressure_pa": number|null, "spillage_seconds": number|null, "spillage_result": string|null, "gas_leak_detected": boolean|null, "natural_draft": boolean|null}`,
};

async function runModel(model: `${string}/${string}` | `${string}/${string}:${string}`, input: Record<string, unknown>): Promise<string> {
  const output = await replicate.run(model, { input });
  if (Array.isArray(output)) return output.join("");
  if (typeof output === "string") return output;
  return String(output);
}

export async function classifyPhoto(imageUrl: string): Promise<string> {
  const result = await runModel("lucataco/moondream2:72ccb656353c348c1385df54b237eeb7bfa874bf11486cf0b9473e691b662d31" as `${string}/${string}:${string}`, {
    image: imageUrl,
    prompt: CLASSIFICATION_PROMPT,
  });

  const cleaned = result.trim().toLowerCase().replace(/[^a-z_]/g, "");
  if ((CLASSIFICATION_CATEGORIES as readonly string[]).includes(cleaned)) {
    return cleaned;
  }

  // Fuzzy match: find closest category
  for (const cat of CLASSIFICATION_CATEGORIES) {
    if (cleaned.includes(cat) || cat.includes(cleaned)) {
      return cat;
    }
  }

  return "other";
}

function parseJsonResponse(text: string): Record<string, unknown> {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error("No JSON found in response");
}

export async function extractData(
  imageUrl: string,
  category: string,
  context?: { itemLabel?: string; instructions?: string; crewResponse?: string }
): Promise<Record<string, unknown>> {
  const basePrompt = EXTRACTION_PROMPTS[category];
  if (!basePrompt) return {};

  // Build authoritative context — tell the AI exactly what this photo is
  let prompt = basePrompt;
  if (context?.itemLabel) {
    const contextParts: string[] = [];
    contextParts.push(`IMPORTANT: This photo is from the "${context.itemLabel}" section of an energy audit checklist.`);
    if (context.instructions) contextParts.push(`The auditor's instructions were: "${context.instructions}"`);
    if (context.crewResponse) contextParts.push(`The field crew noted: "${context.crewResponse}"`);
    contextParts.push(`Only extract data relevant to ${CATEGORY_LABELS[category] || category}. If the photo doesn't show ${CATEGORY_LABELS[category] || category}, return all null values.`);
    prompt = `${contextParts.join("\n")}\n\n${basePrompt}`;
  }

  const result = await runModel("yorickvp/llava-v1.6-mistral-7b:19be067b589d0c46689ffa7cc3ff321447a441986a7694c01225973c2eafc874" as `${string}/${string}:${string}`, {
    image: imageUrl,
    prompt,
    max_tokens: 1024,
  });

  try {
    return parseJsonResponse(result);
  } catch {
    // Retry once with explicit JSON instruction
    const retry = await runModel("yorickvp/llava-v1.6-mistral-7b:19be067b589d0c46689ffa7cc3ff321447a441986a7694c01225973c2eafc874" as `${string}/${string}:${string}`, {
      image: imageUrl,
      prompt: prompt + "\n\nIMPORTANT: Respond with valid JSON only, no other text.",
      max_tokens: 1024,
    });

    try {
      return parseJsonResponse(retry);
    } catch {
      return { raw_response: result, parse_error: true };
    }
  }
}
