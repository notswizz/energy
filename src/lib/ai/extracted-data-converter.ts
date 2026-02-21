/**
 * Bidirectional converter between ExtractedData (human-readable review UI)
 * and SnuggProMappedData (API-ready payload).
 */

import type {
  ExtractedData,
  ExtractedHvacSystem,
  ExtractedDhwSystem,
  ExtractedAtticSection,
  ExtractedWallSection,
  ExtractedWindowConfig,
  ExtractedDoor,
  ExtractedHealthSafety,
  FieldConfidence,
  FieldSource,
  AiSummary,
} from "@/src/types";

import type {
  SnuggProMappedData,
  SnuggProBasedata,
  SnuggProHvacPayload,
  SnuggProDhwPayload,
  SnuggProAtticPayload,
  SnuggProWallPayload,
  SnuggProWindowPayload,
  SnuggProDoorPayload,
  SnuggProHealthPayload,
} from "./snuggpro-mapper";

// ---- SnuggProMappedData → ExtractedData ----

export function snuggproMappedToExtracted(
  mapped: SnuggProMappedData,
  confidenceMap?: Record<string, FieldConfidence>,
  sourceMap?: Record<string, FieldSource>
): ExtractedData {
  const b = mapped.basedata as SnuggProBasedata;
  const h = mapped.health as SnuggProHealthPayload;
  const fc = confidenceMap || {};
  const fs = sourceMap || {};

  // Auto-assign confidence for fields that have values but no explicit confidence
  const fieldConfidence: Record<string, FieldConfidence> = { ...fc };
  const fieldSource: Record<string, FieldSource> = { ...fs };

  function track(key: string, val: unknown, defaultSource: FieldSource = "text_parse") {
    if (val !== undefined && val !== null) {
      if (!fieldConfidence[key]) fieldConfidence[key] = defaultSource === "ai_vision" ? "medium" : "high";
      if (!fieldSource[key]) fieldSource[key] = defaultSource;
    }
  }

  // Building
  track("yearBuilt", b.year_built);
  track("conditionedArea", b.conditioned_area);
  track("avgWallHeight", b.avg_wall_height);
  track("floorsAboveGrade", b.floors_above_grade);
  track("numOccupants", b.num_occupants);
  track("numBedrooms", b.num_bedrooms);
  track("typeOfHome", b.type_of_home);
  track("frontOrientation", b.front_of_building_orientation);

  // Foundation
  track("foundationBasementPct", b.foundation_basement_percent);
  track("foundationCrawlPct", b.foundation_crawl_percent);
  track("foundationSlabPct", b.foundation_slab_percent);
  track("foundationAboveGradeHeight", b.foundation_above_grade_height);
  track("basementWallInsulation", b.basement_wall_insulation);
  track("basementHeating", b.basement_heating);
  track("basementCooling", b.basement_cooling);

  // Thermostat
  track("heatingSetpointHigh", b.heating_setpoint_high, "ai_vision");
  track("heatingSetpointLow", b.heating_setpoint_low, "ai_vision");
  track("coolingSetpointLow", b.cooling_setpoint_low, "ai_vision");
  track("coolingSetpointHigh", b.cooling_setpoint_high, "ai_vision");
  track("thermostatManufacturer", b.thermostat_manufacturer, "ai_vision");

  // Appliances
  track("rangeFuelType", b.range_fuel_type);
  track("rangeManufacturer", b.range_manufacturer);
  track("ovenFuelType", b.oven_fuel_type);
  track("dryerFuelType", b.dryer_fuel_type);
  track("dryerManufacturer", b.dryer_manufacturer);
  track("washerType", b.washer_type);
  track("washerEnergyStar", b.washer_energy_star);
  track("washerManufacturer", b.washer_manufacturer);
  track("dishwasherInstalled", b.dishwasher_installed);
  track("dishwasherEnergyStar", b.dishwasher_energy_star);
  track("refrigeratorAge", b.refrigerator_age);
  track("refrigeratorSizeCf", b.refrigerator_size_cf);
  track("refrigeratorEnergyStar", b.refrigerator_energy_star);

  // Lighting
  track("pctCflsOrLeds", b.pct_cfls_or_leds);
  track("totalLightBulbs", b.total_light_bulbs);

  // Air Leakage
  track("blowerDoorTestPerformed", b.blower_door_test_performed);
  track("blowerDoorCfm50", b.blower_door_reading_cfm50);

  // Panel
  track("panelMaxAmps", b.panel_max_amps, "ai_vision");
  track("panelOpenSpots", b.panel_open_breaker_spots);

  // Misc
  track("hasPv", b.has_pv);
  track("hasPool", b.has_swimming_pool);
  track("hasHotTub", b.has_hot_tub);
  track("hasEv", b.has_ev);

  // Concerns
  track("concernsSummary", b.concerns_summary);
  track("concernsDetail", b.concerns_detail);

  // HVAC
  const hvacSystems: ExtractedHvacSystem[] = (mapped.hvacs || []).map((hv, i) => {
    const hvac = hv as SnuggProHvacPayload;
    const prefix = `hvacSystems[${i}]`;
    track(`${prefix}.manufacturer`, hvac.manufacturer, "ai_vision");
    track(`${prefix}.modelNumber`, hvac.model_number, "ai_vision");
    track(`${prefix}.seer`, hvac.efficiency_seer, "ai_vision");
    track(`${prefix}.afue`, hvac.efficiency_afue, "ai_vision");
    return {
      manufacturer: hvac.manufacturer,
      modelNumber: hvac.model_number,
      systemType: hvac.system_type,
      fuelType: hvac.fuel_type,
      seer: hvac.efficiency_seer,
      hspf: hvac.efficiency_hspf,
      afue: hvac.efficiency_afue,
      btuInput: hvac.btu_input,
      tonnage: hvac.tonnage,
      yearManufactured: hvac.year_manufactured,
      ductLeakageCfm25: hvac.duct_leakage_cfm25,
      ductInsulationRValue: hvac.duct_insulation_r_value,
      ductSealed: hvac.duct_sealed,
    };
  });

  // DHW
  const dhwSystems: ExtractedDhwSystem[] = (mapped.dhws || []).map((dh, i) => {
    const dhw = dh as SnuggProDhwPayload;
    const prefix = `dhwSystems[${i}]`;
    track(`${prefix}.manufacturer`, dhw.manufacturer, "ai_vision");
    track(`${prefix}.modelNumber`, dhw.model_number, "ai_vision");
    return {
      type: dhw.type,
      fuelType: dhw.fuel_type,
      manufacturer: dhw.manufacturer,
      modelNumber: dhw.model_number,
      capacityGallons: dhw.capacity_gallons,
      energyFactor: dhw.energy_factor,
      uef: dhw.uef,
      ageRange: dhw.age_range,
      location: dhw.location,
      temperatureSetting: dhw.temperature_setting,
      tankWrap: dhw.tank_wrap,
      pipeWrap: dhw.pipe_wrap,
      yearManufactured: dhw.year_manufactured,
    };
  });

  // Attic
  const atticSections: ExtractedAtticSection[] = (mapped.attics || []).map((at) => {
    const attic = at as SnuggProAtticPayload;
    return {
      insulationType: attic.insulation_type,
      depthInches: attic.insulation_depth_inches,
      depthRange: attic.insulation_depth_range,
      condition: attic.condition,
      coveragePct: attic.coverage_percent,
    };
  });

  // Walls
  const wallSections: ExtractedWallSection[] = (mapped.walls || []).map((wa) => {
    const wall = wa as SnuggProWallPayload;
    return {
      insulated: wall.insulated,
      insulationType: wall.insulation_type,
      siding: wall.siding,
      construction: wall.construction,
      condition: wall.condition,
    };
  });

  // Windows
  const windowConfigs: ExtractedWindowConfig[] = (mapped.windows || []).map((wi) => {
    const win = wi as SnuggProWindowPayload;
    return {
      paneType: win.pane_type,
      frameMaterial: win.frame_material,
      stormWindow: win.storm_window,
      lowE: win.low_e,
    };
  });

  // Doors
  const doors: ExtractedDoor[] = (mapped.doors || []).map((do_) => {
    const door = do_ as SnuggProDoorPayload;
    return {
      material: door.material,
      hasStormDoor: door.has_storm_door,
    };
  });

  // Health
  const healthSafety: ExtractedHealthSafety = {
    ambientCo: h.ambient_co,
    naturalConditionSpillage: h.natural_condition_spillage,
    worstCaseDepressurization: h.worst_case_depressurization,
    worstCaseSpillage: h.worst_case_spillage,
    undilutedFlueCo: h.undiluted_flue_co,
    draftPressure: h.draft_pressure,
    gasLeak: h.gas_leak,
    venting: h.venting,
    moldMoisture: h.mold_moisture,
    radon: h.radon,
    asbestos: h.asbestos,
    lead: h.lead,
    electrical: h.electrical,
    roofCondition: h.roof_condition,
    drainageCondition: h.drainage_condition,
  };

  return {
    yearBuilt: b.year_built,
    conditionedArea: b.conditioned_area,
    avgWallHeight: b.avg_wall_height,
    floorsAboveGrade: b.floors_above_grade,
    numOccupants: b.num_occupants,
    numBedrooms: b.num_bedrooms,
    typeOfHome: b.type_of_home,
    frontOrientation: b.front_of_building_orientation,
    foundationBasementPct: b.foundation_basement_percent,
    foundationCrawlPct: b.foundation_crawl_percent,
    foundationSlabPct: b.foundation_slab_percent,
    foundationAboveGradeHeight: b.foundation_above_grade_height,
    basementWallInsulation: b.basement_wall_insulation,
    basementHeating: b.basement_heating,
    basementCooling: b.basement_cooling,
    heatingSetpointHigh: b.heating_setpoint_high,
    heatingSetpointLow: b.heating_setpoint_low,
    coolingSetpointLow: b.cooling_setpoint_low,
    coolingSetpointHigh: b.cooling_setpoint_high,
    thermostatManufacturer: b.thermostat_manufacturer,
    rangeFuelType: b.range_fuel_type,
    rangeManufacturer: b.range_manufacturer,
    ovenFuelType: b.oven_fuel_type,
    dryerFuelType: b.dryer_fuel_type,
    dryerManufacturer: b.dryer_manufacturer,
    washerType: b.washer_type,
    washerEnergyStar: b.washer_energy_star,
    washerManufacturer: b.washer_manufacturer,
    dishwasherInstalled: b.dishwasher_installed,
    dishwasherEnergyStar: b.dishwasher_energy_star,
    refrigeratorAge: b.refrigerator_age,
    refrigeratorSizeCf: b.refrigerator_size_cf,
    refrigeratorEnergyStar: b.refrigerator_energy_star,
    pctCflsOrLeds: b.pct_cfls_or_leds,
    totalLightBulbs: b.total_light_bulbs,
    blowerDoorTestPerformed: b.blower_door_test_performed,
    blowerDoorCfm50: b.blower_door_reading_cfm50,
    panelMaxAmps: b.panel_max_amps,
    panelOpenSpots: b.panel_open_breaker_spots,
    hasPv: b.has_pv,
    hasPool: b.has_swimming_pool,
    hasHotTub: b.has_hot_tub,
    hasEv: b.has_ev,
    concernsSummary: b.concerns_summary,
    concernsDetail: b.concerns_detail,
    hvacSystems,
    dhwSystems,
    atticSections,
    wallSections,
    windowConfigs,
    doors,
    healthSafety,
    fieldConfidence,
    fieldSource,
  };
}

// ---- ExtractedData → SnuggProMappedData ----

export function extractedToSnuggproMapped(data: ExtractedData): SnuggProMappedData {
  const basedata: Partial<SnuggProBasedata> = strip({
    year_built: data.yearBuilt,
    conditioned_area: data.conditionedArea,
    avg_wall_height: data.avgWallHeight,
    floors_above_grade: data.floorsAboveGrade,
    num_occupants: data.numOccupants,
    num_bedrooms: data.numBedrooms,
    type_of_home: data.typeOfHome,
    front_of_building_orientation: data.frontOrientation,
    foundation_basement_percent: data.foundationBasementPct,
    foundation_crawl_percent: data.foundationCrawlPct,
    foundation_slab_percent: data.foundationSlabPct,
    foundation_above_grade_height: data.foundationAboveGradeHeight,
    basement_wall_insulation: data.basementWallInsulation,
    basement_heating: data.basementHeating,
    basement_cooling: data.basementCooling,
    heating_setpoint_high: data.heatingSetpointHigh,
    heating_setpoint_low: data.heatingSetpointLow,
    cooling_setpoint_low: data.coolingSetpointLow,
    cooling_setpoint_high: data.coolingSetpointHigh,
    thermostat_manufacturer: data.thermostatManufacturer,
    range_fuel_type: data.rangeFuelType,
    range_manufacturer: data.rangeManufacturer,
    oven_fuel_type: data.ovenFuelType,
    dryer_fuel_type: data.dryerFuelType,
    dryer_manufacturer: data.dryerManufacturer,
    washer_type: data.washerType,
    washer_energy_star: data.washerEnergyStar,
    washer_manufacturer: data.washerManufacturer,
    dishwasher_installed: data.dishwasherInstalled,
    dishwasher_energy_star: data.dishwasherEnergyStar,
    refrigerator_age: data.refrigeratorAge,
    refrigerator_size_cf: data.refrigeratorSizeCf,
    refrigerator_energy_star: data.refrigeratorEnergyStar,
    pct_cfls_or_leds: data.pctCflsOrLeds,
    total_light_bulbs: data.totalLightBulbs,
    blower_door_test_performed: data.blowerDoorTestPerformed,
    blower_door_reading_cfm50: data.blowerDoorCfm50,
    panel_max_amps: data.panelMaxAmps,
    panel_open_breaker_spots: data.panelOpenSpots,
    has_pv: data.hasPv,
    has_swimming_pool: data.hasPool,
    has_hot_tub: data.hasHotTub,
    has_ev: data.hasEv,
    concerns_summary: data.concernsSummary,
    concerns_detail: data.concernsDetail,
  });

  const hvacs: Partial<SnuggProHvacPayload>[] = (data.hvacSystems || []).map((sys) =>
    strip({
      manufacturer: sys.manufacturer,
      model_number: sys.modelNumber,
      system_type: sys.systemType,
      fuel_type: sys.fuelType,
      efficiency_seer: sys.seer,
      efficiency_hspf: sys.hspf,
      efficiency_afue: sys.afue,
      btu_input: sys.btuInput,
      tonnage: sys.tonnage,
      year_manufactured: sys.yearManufactured,
      duct_leakage_cfm25: sys.ductLeakageCfm25,
      duct_insulation_r_value: sys.ductInsulationRValue,
      duct_sealed: sys.ductSealed,
    })
  );

  const dhws: Partial<SnuggProDhwPayload>[] = (data.dhwSystems || []).map((sys) =>
    strip({
      type: sys.type,
      fuel_type: sys.fuelType,
      manufacturer: sys.manufacturer,
      model_number: sys.modelNumber,
      capacity_gallons: sys.capacityGallons,
      energy_factor: sys.energyFactor,
      uef: sys.uef,
      age_range: sys.ageRange,
      location: sys.location,
      temperature_setting: sys.temperatureSetting,
      tank_wrap: sys.tankWrap,
      pipe_wrap: sys.pipeWrap,
      year_manufactured: sys.yearManufactured,
    })
  );

  const attics: Partial<SnuggProAtticPayload>[] = (data.atticSections || []).map((sec) =>
    strip({
      insulation_type: sec.insulationType,
      insulation_depth_inches: sec.depthInches,
      insulation_depth_range: sec.depthRange,
      condition: sec.condition,
      coverage_percent: sec.coveragePct,
    })
  );

  const walls: Partial<SnuggProWallPayload>[] = (data.wallSections || []).map((sec) =>
    strip({
      insulated: sec.insulated,
      insulation_type: sec.insulationType,
      siding: sec.siding,
      construction: sec.construction,
      condition: sec.condition,
    })
  );

  const windows: Partial<SnuggProWindowPayload>[] = (data.windowConfigs || []).map((cfg) =>
    strip({
      pane_type: cfg.paneType,
      frame_material: cfg.frameMaterial,
      storm_window: cfg.stormWindow,
      low_e: cfg.lowE,
    })
  );

  const doors: Partial<SnuggProDoorPayload>[] = (data.doors || []).map((d) =>
    strip({
      material: d.material,
      has_storm_door: d.hasStormDoor,
    })
  );

  const hs = data.healthSafety || {};
  const health: Partial<SnuggProHealthPayload> = strip({
    ambient_co: hs.ambientCo,
    natural_condition_spillage: hs.naturalConditionSpillage,
    worst_case_depressurization: hs.worstCaseDepressurization,
    worst_case_spillage: hs.worstCaseSpillage,
    undiluted_flue_co: hs.undilutedFlueCo,
    draft_pressure: hs.draftPressure,
    gas_leak: hs.gasLeak,
    venting: hs.venting,
    mold_moisture: hs.moldMoisture,
    radon: hs.radon,
    asbestos: hs.asbestos,
    lead: hs.lead,
    electrical: hs.electrical,
    roof_condition: hs.roofCondition,
    drainage_condition: hs.drainageCondition,
  });

  return { basedata, hvacs, dhws, attics, walls, windows, doors, health };
}

// ---- Merge two ExtractedData (for 2nd PDF) ----

const CONFIDENCE_RANK: Record<FieldConfidence, number> = {
  missing: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function mergeExtractedData(
  existing: ExtractedData,
  incoming: ExtractedData
): ExtractedData {
  const merged = { ...existing };
  const fc = { ...existing.fieldConfidence };
  const fs = { ...existing.fieldSource };

  // Scalar fields
  const scalarKeys = [
    "yearBuilt", "conditionedArea", "avgWallHeight", "floorsAboveGrade",
    "numOccupants", "numBedrooms", "typeOfHome", "frontOrientation",
    "foundationBasementPct", "foundationCrawlPct", "foundationSlabPct",
    "foundationAboveGradeHeight", "basementWallInsulation", "basementHeating", "basementCooling",
    "heatingSetpointHigh", "heatingSetpointLow", "coolingSetpointLow", "coolingSetpointHigh",
    "thermostatManufacturer",
    "rangeFuelType", "rangeManufacturer", "ovenFuelType",
    "dryerFuelType", "dryerManufacturer",
    "washerType", "washerEnergyStar", "washerManufacturer",
    "dishwasherInstalled", "dishwasherEnergyStar",
    "refrigeratorAge", "refrigeratorSizeCf", "refrigeratorEnergyStar",
    "pctCflsOrLeds", "totalLightBulbs",
    "blowerDoorTestPerformed", "blowerDoorCfm50",
    "panelMaxAmps", "panelOpenSpots",
    "hasPv", "hasPool", "hasHotTub", "hasEv",
    "concernsSummary", "concernsDetail",
  ] as const;

  for (const key of scalarKeys) {
    const incomingVal = incoming[key];
    if (incomingVal === undefined || incomingVal === null) continue;

    const existingConf = CONFIDENCE_RANK[fc[key] || "missing"];
    const incomingConf = CONFIDENCE_RANK[incoming.fieldConfidence[key] || "missing"];

    // Never overwrite manual edits unless incoming is also manual
    if (fs[key] === "manual_edit" && incoming.fieldSource[key] !== "manual_edit") continue;

    if (incomingConf >= existingConf) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[key] = incomingVal;
      fc[key] = incoming.fieldConfidence[key] || "medium";
      fs[key] = incoming.fieldSource[key] || "text_parse";
    }
  }

  // Arrays: concat and deduplicate by first identifying field
  if (incoming.hvacSystems?.length) {
    merged.hvacSystems = dedupeArray(
      [...(existing.hvacSystems || []), ...incoming.hvacSystems],
      (s) => s.modelNumber || s.manufacturer || ""
    );
  }
  if (incoming.dhwSystems?.length) {
    merged.dhwSystems = dedupeArray(
      [...(existing.dhwSystems || []), ...incoming.dhwSystems],
      (s) => s.modelNumber || s.manufacturer || ""
    );
  }
  // For single-item arrays, prefer incoming if it has more data
  if (incoming.atticSections?.length) {
    merged.atticSections = incoming.atticSections.length >= (existing.atticSections?.length || 0)
      ? incoming.atticSections : existing.atticSections;
  }
  if (incoming.wallSections?.length) {
    merged.wallSections = incoming.wallSections.length >= (existing.wallSections?.length || 0)
      ? incoming.wallSections : existing.wallSections;
  }
  if (incoming.windowConfigs?.length) {
    merged.windowConfigs = incoming.windowConfigs.length >= (existing.windowConfigs?.length || 0)
      ? incoming.windowConfigs : existing.windowConfigs;
  }
  if (incoming.doors?.length) {
    merged.doors = dedupeArray(
      [...(existing.doors || []), ...incoming.doors],
      (d) => d.material || ""
    );
  }

  // Health: merge individual fields (incoming wins if existing is empty)
  if (incoming.healthSafety) {
    const existingHs = existing.healthSafety || {};
    const incomingHs = incoming.healthSafety;
    merged.healthSafety = { ...existingHs };
    for (const [k, v] of Object.entries(incomingHs)) {
      if (v !== undefined && v !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged.healthSafety as any)[k] = v;
      }
    }
  }

  merged.fieldConfidence = fc;
  merged.fieldSource = fs;
  return merged;
}

// ---- AiSummary → SnuggProMappedData (backward compat bridge) ----

export function aiSummaryToSnuggproMapped(summary: AiSummary): SnuggProMappedData {
  const basedata: Partial<SnuggProBasedata> = {};

  if (summary.blowerDoor) {
    basedata.blower_door_test_performed = true;
    basedata.blower_door_reading_cfm50 = summary.blowerDoor.cfm50;
  }

  if (summary.electrical) {
    basedata.panel_max_amps = summary.electrical.max_amperage;
    basedata.panel_open_breaker_spots = summary.electrical.open_slots;
  }

  if (summary.thermostat) {
    basedata.heating_setpoint_high = summary.thermostat.heating_setpoint;
    basedata.cooling_setpoint_low = summary.thermostat.cooling_setpoint;
  }

  if (summary.lighting) {
    const total = (summary.lighting.incandescent || 0) + (summary.lighting.cfl || 0) + (summary.lighting.led || 0);
    if (total > 0) {
      const ledCflPct = Math.round(((summary.lighting.cfl || 0) + (summary.lighting.led || 0)) / total * 100);
      if (ledCflPct <= 25) basedata.pct_cfls_or_leds = "0-25%";
      else if (ledCflPct <= 50) basedata.pct_cfls_or_leds = "26-50%";
      else if (ledCflPct <= 75) basedata.pct_cfls_or_leds = "51-75%";
      else basedata.pct_cfls_or_leds = "76-100%";
      basedata.total_light_bulbs = total;
    }
  }

  const hvacs: Partial<SnuggProHvacPayload>[] = summary.hvac.map((u) =>
    strip({
      manufacturer: u.manufacturer,
      model_number: u.model,
      efficiency_seer: u.seer,
      btu_input: u.btu,
      fuel_type: u.fuel_type,
    })
  );

  const dhws: Partial<SnuggProDhwPayload>[] = [];
  if (summary.waterHeater) {
    dhws.push(strip({
      manufacturer: summary.waterHeater.manufacturer,
      model_number: summary.waterHeater.model,
      capacity_gallons: summary.waterHeater.capacity,
      fuel_type: summary.waterHeater.fuel_type,
    }));
  }

  const attics: Partial<SnuggProAtticPayload>[] = [];
  if (summary.insulation) {
    attics.push(strip({
      insulation_type: summary.insulation.type,
      insulation_depth_inches: summary.insulation.avg_depth_inches,
      condition: summary.insulation.condition,
    }));
  }

  const walls: Partial<SnuggProWallPayload>[] = [];
  if (summary.walls) {
    walls.push(strip({
      insulated: summary.walls.insulation_status,
      siding: summary.walls.siding_types?.[0],
    }));
  }

  const windows: Partial<SnuggProWindowPayload>[] = [];
  if (summary.windows) {
    windows.push(strip({
      pane_type: summary.windows.pane_type,
      frame_material: summary.windows.frame_material,
    }));
  }

  const doors: Partial<SnuggProDoorPayload>[] = summary.doors.map((d) =>
    strip({
      material: d.material,
      has_storm_door: d.has_storm,
    })
  );

  return { basedata: strip(basedata), hvacs, dhws, attics, walls, windows, doors, health: {} };
}

// ---- Helpers ----

function strip<T extends object>(obj: T): Partial<T> {
  const result = {} as Partial<T>;
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined && obj[key] !== null) result[key] = obj[key];
  }
  return result;
}

function dedupeArray<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    result.push(item);
  }
  return result;
}
