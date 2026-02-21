import type { AiSummary } from "@/src/types";

interface ProcessedPhoto {
  classification?: string;
  extractedData?: Record<string, unknown>;
  processedAt?: string;
}

export function aggregateAiSummary(photos: ProcessedPhoto[]): AiSummary {
  const byCategory = new Map<string, ProcessedPhoto[]>();

  for (const photo of photos) {
    if (!photo.classification || !photo.extractedData) continue;
    const existing = byCategory.get(photo.classification) || [];
    existing.push(photo);
    byCategory.set(photo.classification, existing);
  }

  // Helper: get latest photo data for a category
  const latest = (cat: string): Record<string, unknown> | null => {
    const items = byCategory.get(cat);
    if (!items || items.length === 0) return null;
    items.sort((a, b) => (b.processedAt || "").localeCompare(a.processedAt || ""));
    return items[0].extractedData || null;
  };

  // Helper: get all photo data for a category
  const all = (cat: string): Record<string, unknown>[] => {
    const items = byCategory.get(cat);
    if (!items) return [];
    return items.map((p) => p.extractedData || {});
  };

  // Aggregate blower door from multiple sources
  const blowerSetup = latest("blower_door_setup");
  const blowerResult = latest("blower_door_result");
  const manometer = latest("manometer_reading");
  const blowerData = blowerResult || blowerSetup || manometer;

  // Aggregate HVAC from outdoor, indoor, and nameplate
  const hvacSources = [
    ...all("hvac_unit_outdoor"),
    ...all("hvac_unit_indoor"),
    ...all("hvac_nameplate"),
  ];
  const hvac = hvacSources.length > 0
    ? hvacSources.map((d) => ({
        manufacturer: d.manufacturer as string | undefined,
        model: d.model as string | undefined,
        seer: d.seer as number | undefined,
        btu: d.btu as number | undefined,
        fuel_type: d.fuel_type as string | undefined,
      }))
    : [];

  // Water heater
  const whData = latest("water_heater_nameplate") || latest("water_heater");

  // Insulation (prefer attic data)
  const insulData = latest("attic_insulation") || latest("wall_insulation");

  // Electrical
  const elecData = latest("electrical_panel");

  // Thermostat
  const thermoData = latest("thermostat");

  // Windows
  const windowPhotos = all("window");
  const windowData = windowPhotos.length > 0
    ? {
        pane_type: (windowPhotos[0].pane_type as string) || undefined,
        frame_material: (windowPhotos[0].frame_material as string) || undefined,
        count: windowPhotos.length,
      }
    : null;

  // Doors
  const doorPhotos = all("door");
  const doors = doorPhotos.map((d) => ({
    material: d.material as string | undefined,
    has_storm: d.has_storm as boolean | undefined,
  }));

  // Walls/siding
  const sidingPhotos = all("siding_exterior");
  const wallInsul = latest("wall_insulation");
  const wallsData = sidingPhotos.length > 0 || wallInsul
    ? {
        siding_types: sidingPhotos
          .map((d) => d.material as string)
          .filter(Boolean) as string[],
        insulation_status: (wallInsul?.condition as string) || undefined,
      }
    : null;

  // Appliances
  const appliancePhotos = [...all("kitchen_appliance"), ...all("laundry_appliance")];
  const appliances = appliancePhotos.map((d) => ({
    type: d.type as string | undefined,
    manufacturer: d.manufacturer as string | undefined,
    model: d.model as string | undefined,
    fuel_type: d.fuel_type as string | undefined,
  }));

  // Lighting
  const lightingPhotos = all("lighting");
  const lighting = lightingPhotos.length > 0
    ? {
        incandescent: lightingPhotos.filter((d) => (d.bulb_type as string)?.toLowerCase()?.includes("incandescent")).length || undefined,
        cfl: lightingPhotos.filter((d) => (d.bulb_type as string)?.toLowerCase()?.includes("cfl")).length || undefined,
        led: lightingPhotos.filter((d) => (d.bulb_type as string)?.toLowerCase()?.includes("led")).length || undefined,
      }
    : null;

  return {
    blowerDoor: blowerData
      ? { pressure_pa: blowerData.pressure_pa as number | undefined, cfm50: blowerData.cfm50 as number | undefined }
      : null,
    hvac,
    waterHeater: whData
      ? {
          manufacturer: whData.manufacturer as string | undefined,
          model: whData.model as string | undefined,
          capacity: (whData.capacity_gallons || whData.capacity) as number | undefined,
          fuel_type: whData.fuel_type as string | undefined,
        }
      : null,
    insulation: insulData
      ? {
          type: insulData.type as string | undefined,
          avg_depth_inches: insulData.avg_depth_inches as number | undefined,
          condition: insulData.condition as string | undefined,
        }
      : null,
    electrical: elecData
      ? { max_amperage: elecData.max_amperage as number | undefined, open_slots: elecData.open_slots as number | undefined }
      : null,
    thermostat: thermoData
      ? { heating_setpoint: thermoData.heating_setpoint as number | undefined, cooling_setpoint: thermoData.cooling_setpoint as number | undefined }
      : null,
    windows: windowData,
    doors,
    walls: wallsData,
    appliances,
    lighting,
    lastProcessedAt: new Date().toISOString(),
  };
}
