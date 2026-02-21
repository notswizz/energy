/**
 * Maps parsed checklist data + AI photo extractions to SnuggPro API field format.
 *
 * SnuggPro endpoints and their field groups:
 *   POST /jobs/{id}/basedata   — building, thermostat, appliances, lighting, doors, foundation, air leakage, health & safety, service panel
 *   POST /jobs/hvac/{uuid}     — HVAC systems
 *   POST /jobs/dhw/{uuid}      — Water heaters
 *   POST /jobs/attic/{uuid}    — Attic insulation
 *   POST /jobs/wall/{uuid}     — Wall insulation & siding
 *   POST /jobs/window/{uuid}   — Windows
 *   POST /jobs/door/{uuid}     — Doors
 *   POST /jobs/{id}/health     — Health & safety
 */

import type { ChecklistSection, ChecklistItem } from "@/src/lib/parsers/checklist-pdf";

// ---- Types for SnuggPro payloads ----

export interface SnuggProBasedata {
  // Building
  year_built?: number;
  conditioned_area?: number;
  avg_wall_height?: number;
  floors_above_grade?: number;
  num_occupants?: number;
  num_bedrooms?: number;
  type_of_home?: string;
  front_of_building_orientation?: string;
  shielding?: string;

  // Foundation
  foundation_basement_percent?: number;
  foundation_crawl_percent?: number;
  foundation_slab_percent?: number;
  foundation_above_grade_height?: number;
  basement_wall_insulation?: string;
  basement_heating?: boolean;
  basement_cooling?: boolean;

  // Thermostat
  heating_setpoint_high?: number;
  heating_setpoint_low?: number;
  cooling_setpoint_low?: number;
  cooling_setpoint_high?: number;
  thermostat_manufacturer?: string;

  // Appliances
  range_fuel_type?: string;
  range_manufacturer?: string;
  oven_fuel_type?: string;
  dryer_fuel_type?: string;
  dryer_manufacturer?: string;
  washer_type?: string;
  washer_energy_star?: boolean;
  washer_manufacturer?: string;
  dishwasher_installed?: boolean;
  dishwasher_energy_star?: boolean;
  refrigerator_age?: number;
  refrigerator_size_cf?: number;
  refrigerator_energy_star?: boolean;

  // Lighting
  pct_cfls_or_leds?: string;
  total_light_bulbs?: number;

  // Air Leakage
  blower_door_test_performed?: boolean;
  blower_door_reading_cfm50?: number;

  // Service Panel
  panel_max_amps?: number;
  panel_open_breaker_spots?: number;

  // Misc
  has_pv?: boolean;
  has_swimming_pool?: boolean;
  has_hot_tub?: boolean;
  has_ev?: boolean;

  // Concerns
  concerns_summary?: string;
  concerns_detail?: string;
}

export interface SnuggProHvacPayload {
  manufacturer?: string;
  model_number?: string;
  system_type?: string;
  fuel_type?: string;
  efficiency_seer?: number;
  efficiency_hspf?: number;
  efficiency_afue?: number;
  btu_input?: number;
  btu_output?: number;
  tonnage?: number;
  year_manufactured?: number;
  duct_leakage_cfm25?: number;
  duct_insulation_r_value?: number;
  duct_sealed?: boolean;
}

export interface SnuggProDhwPayload {
  type?: string;
  fuel_type?: string;
  manufacturer?: string;
  model_number?: string;
  capacity_gallons?: number;
  energy_factor?: number;
  uef?: number;
  age_range?: string;
  location?: string;
  temperature_setting?: string;
  tank_wrap?: boolean;
  pipe_wrap?: boolean;
  year_manufactured?: number;
}

export interface SnuggProAtticPayload {
  insulation_type?: string;
  insulation_depth_range?: string;
  insulation_depth_inches?: number;
  condition?: string;
  coverage_percent?: number;
}

export interface SnuggProWallPayload {
  insulated?: string;
  insulation_type?: string;
  siding?: string;
  construction?: string;
  condition?: string;
}

export interface SnuggProWindowPayload {
  pane_type?: string;
  frame_material?: string;
  storm_window?: boolean;
  low_e?: boolean;
  window_area_north_pct?: number;
  window_area_east_pct?: number;
  window_area_south_pct?: number;
  window_area_west_pct?: number;
}

export interface SnuggProDoorPayload {
  material?: string;
  has_storm_door?: boolean;
}

export interface SnuggProHealthPayload {
  ambient_co?: number;
  natural_condition_spillage?: string;
  worst_case_depressurization?: string;
  worst_case_spillage?: string;
  undiluted_flue_co?: number;
  draft_pressure?: number;
  gas_leak?: string;
  venting?: string;
  mold_moisture?: string;
  radon?: string;
  asbestos?: string;
  lead?: string;
  electrical?: string;
  roof_condition?: string;
  drainage_condition?: string;
}

export interface SnuggProMappedData {
  basedata: Partial<SnuggProBasedata>;
  hvacs: Partial<SnuggProHvacPayload>[];
  dhws: Partial<SnuggProDhwPayload>[];
  attics: Partial<SnuggProAtticPayload>[];
  walls: Partial<SnuggProWallPayload>[];
  windows: Partial<SnuggProWindowPayload>[];
  doors: Partial<SnuggProDoorPayload>[];
  health: Partial<SnuggProHealthPayload>;
}

// ---- Helpers ----

function findItemByLabel(sections: ChecklistSection[], pattern: RegExp): ChecklistItem | undefined {
  for (const section of sections) {
    for (const item of section.items) {
      if (pattern.test(item.label)) return item;
    }
  }
  return undefined;
}

function findItemsInSection(sections: ChecklistSection[], sectionPattern: RegExp): ChecklistItem[] {
  for (const section of sections) {
    if (sectionPattern.test(section.name)) return section.items;
  }
  return [];
}

function parseNumber(val: string | null | undefined): number | undefined {
  if (!val) return undefined;
  const num = parseFloat(val.replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? undefined : num;
}

function parseBool(val: string | null | undefined): boolean | undefined {
  if (!val) return undefined;
  const v = val.toLowerCase().trim();
  if (v === "yes" || v === "true" || v === "1") return true;
  if (v === "no" || v === "false" || v === "0") return false;
  return undefined;
}

function matchFuel(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const v = val.toLowerCase();
  if (v.includes("natural gas") || v === "gas" || v === "ng") return "Natural Gas";
  if (v.includes("electric")) return "Electricity";
  if (v.includes("propane") || v === "lp" || v === "lpg") return "Propane";
  if (v.includes("oil") || v.includes("fuel oil")) return "Fuel Oil";
  return val;
}

function matchDepthRange(inches: number | undefined): string | undefined {
  if (inches === undefined) return undefined;
  if (inches === 0) return "0";
  if (inches <= 3) return "1-3";
  if (inches <= 6) return "4-6";
  if (inches <= 9) return "7-9";
  if (inches <= 12) return "10-12";
  if (inches <= 15) return "13-15";
  return "16+";
}

function matchAgeRange(years: number | undefined): string | undefined {
  if (years === undefined) return undefined;
  if (years <= 5) return "0-5";
  if (years <= 10) return "6-10";
  if (years <= 15) return "11-15";
  return "16+";
}

function matchLedPercent(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const v = val.toLowerCase();
  if (v.includes("76") || v.includes("100") || v.includes("76-100")) return "76-100%";
  if (v.includes("51") || v.includes("75") || v.includes("51-75")) return "51-75%";
  if (v.includes("26") || v.includes("50") || v.includes("26-50")) return "26-50%";
  if (v.includes("0-25") || v.includes("0") || v.includes("25")) return "0-25%";
  return val;
}

// ---- AI extraction data accessor ----

type AiData = Record<string, unknown>;

function getAiDataForCategory(
  aiResults: Array<{ category: string; data: AiData }>,
  category: string
): AiData[] {
  return aiResults.filter((r) => r.category === category).map((r) => r.data);
}

function firstAi(
  aiResults: Array<{ category: string; data: AiData }>,
  category: string
): AiData | undefined {
  return getAiDataForCategory(aiResults, category)[0];
}

// ---- Main mapper ----

export function mapToSnuggPro(
  sections: ChecklistSection[],
  aiResults: Array<{ category: string; data: AiData; itemLabel?: string }>
): SnuggProMappedData {
  const basedata: SnuggProBasedata = {};
  const hvacs: SnuggProHvacPayload[] = [];
  const dhws: SnuggProDhwPayload[] = [];
  const attics: SnuggProAtticPayload[] = [];
  const walls: SnuggProWallPayload[] = [];
  const windows: SnuggProWindowPayload[] = [];
  const doors: SnuggProDoorPayload[] = [];
  const health: SnuggProHealthPayload = {};

  // ---- BASEDATA from checklist text ----

  // Building section
  const buildingItems = findItemsInSection(sections, /building/i);
  for (const item of buildingItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/year\s*built/i.test(label)) basedata.year_built = parseNumber(resp);
    if (/conditioned\s*area|square\s*f(oo|ee)t|sqft/i.test(label)) basedata.conditioned_area = parseNumber(resp);
    if (/wall\s*height|ceiling\s*height/i.test(label)) basedata.avg_wall_height = parseNumber(resp);
    if (/floors?\s*above/i.test(label)) {
      const num = parseNumber(resp);
      if (num) {
        basedata.floors_above_grade = num;
      } else if (resp) {
        // Handle text values like "Split level" → 1.5
        const lower = resp.toLowerCase();
        if (lower.includes("split")) basedata.floors_above_grade = 1.5;
        else if (lower.includes("two") || lower.includes("2 stor")) basedata.floors_above_grade = 2;
        else if (lower.includes("ranch") || lower.includes("single") || lower.includes("1 stor")) basedata.floors_above_grade = 1;
        else basedata.type_of_home = basedata.type_of_home || resp;
      }
    }
    if (/occupant/i.test(label)) basedata.num_occupants = parseNumber(resp);
    if (/bedroom/i.test(label)) basedata.num_bedrooms = parseNumber(resp);
    if (/type\s*of\s*home/i.test(label)) basedata.type_of_home = resp || undefined;
    if (/orientation|facing|direction.*front\s*door|front\s*door.*face/i.test(label)) basedata.front_of_building_orientation = resp || undefined;
  }

  // Electrical section (circuit breaker panel sub-questions)
  const electricalItems = findItemsInSection(sections, /electrical/i);
  for (const item of electricalItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/open\s*breaker|open\s*spots/i.test(label)) basedata.panel_open_breaker_spots = basedata.panel_open_breaker_spots || parseNumber(resp);
    if (/max.*amp|maximum\s*amp/i.test(label)) basedata.panel_max_amps = basedata.panel_max_amps || parseNumber(resp);
  }

  // Thermostat
  const thermostatAi = firstAi(aiResults, "thermostat");
  if (thermostatAi) {
    basedata.heating_setpoint_high = thermostatAi.heating_setpoint_high as number | undefined;
    basedata.heating_setpoint_low = thermostatAi.heating_setpoint_low as number | undefined;
    basedata.cooling_setpoint_low = thermostatAi.cooling_setpoint_low as number | undefined;
    basedata.cooling_setpoint_high = thermostatAi.cooling_setpoint_high as number | undefined;
    basedata.thermostat_manufacturer = thermostatAi.manufacturer as string | undefined;
  }
  // Also check checklist text for thermostat
  const thermostatItem = findItemByLabel(sections, /thermostat/i);
  if (thermostatItem?.response) {
    const nums = thermostatItem.response.match(/\d+/g);
    if (nums && nums.length >= 2) {
      basedata.heating_setpoint_high = basedata.heating_setpoint_high || parseInt(nums[0]);
      basedata.cooling_setpoint_low = basedata.cooling_setpoint_low || parseInt(nums[1]);
    } else if (nums && nums.length === 1) {
      // Single temp like "72 both seasons" — use for both heating and cooling
      const temp = parseInt(nums[0]);
      if (temp >= 50 && temp <= 90) {
        basedata.heating_setpoint_high = basedata.heating_setpoint_high || temp;
        basedata.cooling_setpoint_low = basedata.cooling_setpoint_low || temp;
      }
    }
  }

  // Appliances from checklist
  const applianceItems = findItemsInSection(sections, /appliance/i);
  for (const item of applianceItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/range\s*fuel|range\s*type/i.test(label)) basedata.range_fuel_type = matchFuel(resp);
    if (/oven\s*fuel/i.test(label)) basedata.oven_fuel_type = matchFuel(resp);
    if (/dryer\s*fuel/i.test(label)) basedata.dryer_fuel_type = matchFuel(resp);
    if (/washer\s*type/i.test(label)) basedata.washer_type = resp || undefined;
    if (/dishwasher.*install/i.test(label)) basedata.dishwasher_installed = parseBool(resp);
    if (/refrigerator.*age|fridge.*age/i.test(label)) basedata.refrigerator_age = parseNumber(resp);
  }

  // Appliances from AI photos
  const kitchenAi = getAiDataForCategory(aiResults, "kitchen_appliance");
  for (const data of kitchenAi) {
    const type = (data.type as string || "").toLowerCase();
    if (type.includes("range") || type.includes("stove")) {
      basedata.range_fuel_type = basedata.range_fuel_type || matchFuel(data.fuel_type as string);
      basedata.range_manufacturer = basedata.range_manufacturer || (data.manufacturer as string);
    }
    if (type.includes("refrigerator") || type.includes("fridge")) {
      basedata.refrigerator_energy_star = data.energy_star as boolean | undefined;
      basedata.refrigerator_size_cf = data.size_cubic_ft as number | undefined;
    }
    if (type.includes("dishwasher")) {
      basedata.dishwasher_installed = true;
      basedata.dishwasher_energy_star = data.energy_star as boolean | undefined;
    }
  }

  const laundryAi = getAiDataForCategory(aiResults, "laundry_appliance");
  for (const data of laundryAi) {
    const type = (data.type as string || "").toLowerCase();
    if (type.includes("dryer")) {
      basedata.dryer_fuel_type = basedata.dryer_fuel_type || matchFuel(data.fuel_type as string);
      basedata.dryer_manufacturer = data.manufacturer as string | undefined;
    }
    if (type.includes("washer")) {
      basedata.washer_manufacturer = data.manufacturer as string | undefined;
      basedata.washer_energy_star = data.energy_star as boolean | undefined;
    }
  }

  // Lighting
  const lightingAi = firstAi(aiResults, "lighting");
  if (lightingAi) {
    basedata.pct_cfls_or_leds = matchLedPercent(lightingAi.led_cfl_percent as string);
    basedata.total_light_bulbs = lightingAi.estimated_bulb_count as number | undefined;
  }
  const lightingItem = findItemByLabel(sections, /lighting|led|cfl/i);
  if (lightingItem?.response) {
    basedata.pct_cfls_or_leds = basedata.pct_cfls_or_leds || matchLedPercent(lightingItem.response);
  }

  // Air Leakage
  const blowerAi = firstAi(aiResults, "blower_door_result") || firstAi(aiResults, "blower_door_setup");
  if (blowerAi) {
    basedata.blower_door_test_performed = true;
    basedata.blower_door_reading_cfm50 = blowerAi.cfm50 as number | undefined;
  }
  const blowerItem = findItemByLabel(sections, /blower\s*door|cfm50/i);
  if (blowerItem?.response) {
    const cfm = parseNumber(blowerItem.response);
    if (cfm) {
      basedata.blower_door_test_performed = true;
      basedata.blower_door_reading_cfm50 = basedata.blower_door_reading_cfm50 || cfm;
    }
  }

  // Electrical Panel
  const panelAi = firstAi(aiResults, "electrical_panel");
  if (panelAi) {
    basedata.panel_max_amps = panelAi.max_amps as number | undefined;
    basedata.panel_open_breaker_spots = panelAi.open_breaker_spots as number | undefined;
  }
  const panelItem = findItemByLabel(sections, /panel.*amp|service.*panel|main.*breaker/i);
  if (panelItem?.response) {
    basedata.panel_max_amps = basedata.panel_max_amps || parseNumber(panelItem.response);
  }

  // Foundation
  const foundationItems = findItemsInSection(sections, /foundation|basement|crawl/i);
  for (const item of foundationItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/basement\s*%/i.test(label)) basedata.foundation_basement_percent = parseNumber(resp);
    if (/crawl\s*%/i.test(label)) basedata.foundation_crawl_percent = parseNumber(resp);
    if (/slab\s*%/i.test(label)) basedata.foundation_slab_percent = parseNumber(resp);
    if (/above\s*grade\s*height/i.test(label)) basedata.foundation_above_grade_height = parseNumber(resp);
    if (/basement.*insulation/i.test(label)) basedata.basement_wall_insulation = resp || undefined;
    if (/basement.*heat/i.test(label)) basedata.basement_heating = parseBool(resp);
    if (/basement.*cool/i.test(label)) basedata.basement_cooling = parseBool(resp);
  }

  // ---- HVAC from AI ----
  const hvacAiData = [
    ...getAiDataForCategory(aiResults, "hvac_nameplate"),
    ...getAiDataForCategory(aiResults, "hvac_unit_indoor"),
    ...getAiDataForCategory(aiResults, "hvac_unit_outdoor"),
  ];
  // Deduplicate by model number
  const seenModels = new Set<string>();
  for (const data of hvacAiData) {
    const model = (data.model_number as string) || "";
    const key = model || JSON.stringify(data);
    if (seenModels.has(key)) continue;
    seenModels.add(key);

    hvacs.push({
      manufacturer: data.manufacturer as string | undefined,
      model_number: data.model_number as string | undefined,
      system_type: data.system_type as string | undefined,
      fuel_type: matchFuel(data.fuel_type as string),
      efficiency_seer: data.seer as number | undefined,
      efficiency_hspf: data.hspf as number | undefined,
      efficiency_afue: data.afue as number | undefined,
      btu_input: data.btu_input as number | undefined,
      btu_output: data.btu_output as number | undefined,
      tonnage: data.tonnage as number | undefined,
      year_manufactured: data.year_manufactured as number | undefined,
    });
  }

  // Ductwork data merges into first HVAC
  const ductAi = firstAi(aiResults, "ductwork");
  if (ductAi && hvacs.length > 0) {
    hvacs[0].duct_leakage_cfm25 = ductAi.duct_leakage_cfm25 as number | undefined;
    hvacs[0].duct_insulation_r_value = ductAi.insulation_r_value as number | undefined;
    hvacs[0].duct_sealed = ductAi.sealed as boolean | undefined;
  }

  // Duct system text from checklist
  const ductItems = findItemsInSection(sections, /duct\s*system|structure/i);
  for (const item of ductItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/duct.*insulation|insulation.*duct/i.test(label) && resp && hvacs.length > 0) {
      // Parse R-value from insulation description like "Fiberglass 1""
      const rMatch = resp.match(/(\d+)/);
      if (rMatch) {
        hvacs[0].duct_insulation_r_value = hvacs[0].duct_insulation_r_value || parseInt(rMatch[1]);
      }
    }
  }

  // ---- DHW from AI ----
  const whAiData = [
    ...getAiDataForCategory(aiResults, "water_heater"),
    ...getAiDataForCategory(aiResults, "water_heater_nameplate"),
  ];
  const seenWhModels = new Set<string>();
  for (const data of whAiData) {
    const model = (data.model_number as string) || "";
    const key = model || JSON.stringify(data);
    if (seenWhModels.has(key)) continue;
    seenWhModels.add(key);

    const yearMfg = data.year_manufactured as number | undefined;
    const currentYear = new Date().getFullYear();
    const age = yearMfg ? currentYear - yearMfg : undefined;

    dhws.push({
      type: data.type as string | undefined,
      fuel_type: matchFuel(data.fuel_type as string),
      manufacturer: data.manufacturer as string | undefined,
      model_number: data.model_number as string | undefined,
      capacity_gallons: data.capacity_gallons as number | undefined,
      energy_factor: data.energy_factor as number | undefined,
      uef: data.uef as number | undefined,
      age_range: matchAgeRange(age),
      location: data.location as string | undefined,
      tank_wrap: data.tank_wrap as boolean | undefined,
      pipe_wrap: data.pipe_wrap as boolean | undefined,
      year_manufactured: yearMfg,
    });
  }

  // Also check checklist for water heater text data
  const whItems = findItemsInSection(sections, /water\s*heater/i);
  for (const item of whItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/temp.*setting/i.test(label) && dhws.length > 0) {
      dhws[0].temperature_setting = resp || undefined;
    }
    if (/location/i.test(label) && dhws.length > 0) {
      dhws[0].location = dhws[0].location || resp || undefined;
    }
  }

  // ---- Attic from AI ----
  const atticAiData = getAiDataForCategory(aiResults, "attic_insulation");
  for (const data of atticAiData) {
    const depthInches = data.depth_inches as number | undefined;
    attics.push({
      insulation_type: data.insulation_type as string | undefined,
      insulation_depth_range: (data.depth_range as string) || matchDepthRange(depthInches),
      insulation_depth_inches: depthInches,
      condition: data.condition as string | undefined,
      coverage_percent: data.coverage_percent as number | undefined,
    });
  }
  // Supplement from checklist
  const atticItems = findItemsInSection(sections, /attic/i);
  for (const item of atticItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/depth|inches/i.test(label) && attics.length > 0) {
      const depth = parseNumber(resp);
      if (depth) {
        attics[0].insulation_depth_inches = attics[0].insulation_depth_inches || depth;
        attics[0].insulation_depth_range = attics[0].insulation_depth_range || matchDepthRange(depth);
      }
    }
    if (/type/i.test(label) && attics.length > 0) {
      attics[0].insulation_type = attics[0].insulation_type || resp || undefined;
    }
  }
  // If no AI data, create from checklist text
  if (attics.length === 0 && atticItems.length > 0) {
    const attic: SnuggProAtticPayload = {};
    for (const item of atticItems) {
      if (/depth|inches/i.test(item.label)) {
        attic.insulation_depth_inches = parseNumber(item.response);
        attic.insulation_depth_range = matchDepthRange(attic.insulation_depth_inches);
      }
      if (/type/i.test(item.label)) attic.insulation_type = item.response || undefined;
    }
    if (Object.keys(attic).length > 0) attics.push(attic);
  }

  // ---- Walls from AI ----
  const wallAiData = getAiDataForCategory(aiResults, "wall_insulation");
  for (const data of wallAiData) {
    walls.push({
      insulated: data.insulated as string | undefined,
      insulation_type: data.insulation_type as string | undefined,
      siding: data.siding as string | undefined,
      construction: data.construction as string | undefined,
      condition: data.condition as string | undefined,
    });
  }
  // Siding from exterior photos
  const sidingAi = getAiDataForCategory(aiResults, "siding_exterior");
  for (const data of sidingAi) {
    if (data.siding && walls.length > 0 && !walls[0].siding) {
      walls[0].siding = data.siding as string;
    } else if (data.siding && walls.length === 0) {
      walls.push({ siding: data.siding as string });
    }
    if (data.floors_above_grade) {
      basedata.floors_above_grade = basedata.floors_above_grade || (data.floors_above_grade as number);
    }
  }
  // Supplement from checklist
  const wallItems = findItemsInSection(sections, /wall/i);
  for (const item of wallItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/insulated/i.test(label) && walls.length > 0) {
      walls[0].insulated = walls[0].insulated || resp || undefined;
    }
    if (/siding/i.test(label) && walls.length > 0) {
      walls[0].siding = walls[0].siding || resp || undefined;
    }
    if (/construction|frame/i.test(label) && walls.length > 0) {
      walls[0].construction = walls[0].construction || resp || undefined;
    }
  }

  // ---- Windows from AI ----
  const windowAiData = getAiDataForCategory(aiResults, "window");
  if (windowAiData.length > 0) {
    // Aggregate all window observations
    const win: SnuggProWindowPayload = {};
    for (const data of windowAiData) {
      win.pane_type = win.pane_type || (data.pane_type as string);
      win.frame_material = win.frame_material || (data.frame_material as string);
      win.storm_window = win.storm_window || (data.storm_window as boolean);
      win.low_e = win.low_e || (data.low_e as boolean);
    }
    windows.push(win);
  }
  // Supplement from checklist
  const windowItems = findItemsInSection(sections, /window/i);
  for (const item of windowItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/pane|glazing/i.test(label)) {
      if (windows.length > 0) windows[0].pane_type = windows[0].pane_type || resp || undefined;
      else windows.push({ pane_type: resp || undefined });
    }
    if (/frame/i.test(label) && windows.length > 0) {
      windows[0].frame_material = windows[0].frame_material || resp || undefined;
    }
  }

  // ---- Doors from AI ----
  const doorAiData = getAiDataForCategory(aiResults, "door");
  for (const data of doorAiData) {
    doors.push({
      material: data.material as string | undefined,
      has_storm_door: data.has_storm_door as boolean | undefined,
    });
  }
  // From checklist
  const doorItems = findItemsInSection(sections, /door/i);
  for (const item of doorItems) {
    if (/type|material/i.test(item.label) && item.response) {
      // Only add if not already captured by AI
      const exists = doors.some(
        (d) => d.material?.toLowerCase() === item.response?.toLowerCase()
      );
      if (!exists) {
        doors.push({ material: item.response });
      }
    }
  }

  // ---- Health & Safety ----
  const combustionAi = firstAi(aiResults, "combustion_safety");
  if (combustionAi) {
    health.ambient_co = combustionAi.ambient_co_ppm as number | undefined;
    health.undiluted_flue_co = combustionAi.undiluted_flue_co_ppm as number | undefined;
    health.draft_pressure = combustionAi.draft_pressure_pa as number | undefined;
    health.gas_leak = combustionAi.gas_leak_detected ? "Detected" : undefined;
  }
  const healthItems = findItemsInSection(sections, /health|safety/i);
  for (const item of healthItems) {
    const label = item.label.toLowerCase();
    const resp = item.response;
    if (/ambient.*co/i.test(label)) health.ambient_co = health.ambient_co || parseNumber(resp);
    if (/spillage.*natural/i.test(label)) health.natural_condition_spillage = resp || undefined;
    if (/worst.*case.*dep/i.test(label)) health.worst_case_depressurization = resp || undefined;
    if (/worst.*case.*spill/i.test(label)) health.worst_case_spillage = resp || undefined;
    if (/undiluted.*co|flue.*co/i.test(label)) health.undiluted_flue_co = health.undiluted_flue_co || parseNumber(resp);
    if (/draft/i.test(label)) health.draft_pressure = health.draft_pressure || parseNumber(resp);
    if (/gas\s*leak/i.test(label)) health.gas_leak = health.gas_leak || resp || undefined;
    if (/vent/i.test(label)) health.venting = resp || undefined;
    if (/mold|moisture/i.test(label)) health.mold_moisture = resp || undefined;
    if (/radon/i.test(label)) health.radon = resp || undefined;
    if (/asbestos/i.test(label)) health.asbestos = resp || undefined;
    if (/lead/i.test(label)) health.lead = resp || undefined;
    if (/electrical/i.test(label)) health.electrical = resp || undefined;
    if (/roof.*cond/i.test(label)) health.roof_condition = resp || undefined;
    if (/drain/i.test(label)) health.drainage_condition = resp || undefined;
  }

  // Roof condition from AI
  const roofAi = firstAi(aiResults, "roof");
  if (roofAi) {
    health.roof_condition = health.roof_condition || (roofAi.condition as string);
  }

  // Notes section — capture as concerns summary
  const notesItems = findItemsInSection(sections, /^notes$/i);
  const noteTexts: string[] = [];
  for (const item of notesItems) {
    if (item.response) noteTexts.push(item.response);
    else if (item.label && !/^notes$/i.test(item.label)) noteTexts.push(item.label);
  }
  if (noteTexts.length > 0) {
    basedata.concerns_summary = noteTexts.join("; ");
  }

  // ---- Misc (solar, pool, EV) ----
  const solarAi = firstAi(aiResults, "solar_panel");
  if (solarAi) basedata.has_pv = true;
  const solarItem = findItemByLabel(sections, /solar|pv/i);
  if (solarItem?.response && parseBool(solarItem.response)) basedata.has_pv = true;

  const poolItem = findItemByLabel(sections, /pool/i);
  if (poolItem?.response) basedata.has_swimming_pool = parseBool(poolItem.response);
  const hotTubItem = findItemByLabel(sections, /hot\s*tub|spa/i);
  if (hotTubItem?.response) basedata.has_hot_tub = parseBool(hotTubItem.response);
  const evItem = findItemByLabel(sections, /ev\b|electric\s*vehicle/i);
  if (evItem?.response) basedata.has_ev = parseBool(evItem.response);

  return {
    basedata: stripUndefined(basedata),
    hvacs: hvacs.map((h) => stripUndefined(h)),
    dhws: dhws.map((d) => stripUndefined(d)),
    attics: attics.map((a) => stripUndefined(a)),
    walls: walls.map((w) => stripUndefined(w)),
    windows: windows.map((w) => stripUndefined(w)),
    doors: doors.map((d) => stripUndefined(d)),
    health: stripUndefined(health),
  };
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  const result = {} as Partial<T>;
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}
