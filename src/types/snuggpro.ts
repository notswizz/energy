export interface SnuggProJob {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  homePhone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  stageId: string;
  jobType: string;
  accountId: number;
  companyId: number;
  programId: number;
  altId: string | null;
  fromTemplateId: number | null;
  renterOwner: string;
  serviceTime: string;
  note: string | null;
  hasCalculated: number;
  completionDate: string | null;
  householdIncomeTier: string;
  propertyOwnerFirstName: string | null;
  propertyOwnerLastName: string | null;
  propertyOwnerAddress1: string | null;
  propertyOwnerCity: string | null;
  propertyOwnerState: string | null;
  propertyOwnerZip: string | null;
  propertyOwnerEmail: string | null;
  propertyOwnerPhone: string | null;
  [key: string]: unknown;
}

// We don't call the /model endpoint (it triggers a modeling run).
// Energy data comes from /metrics-summary instead.

export interface SnuggProRecommendation {
  uuid: string;
  recDefinitionId: number;
  title: string;
  category: string;
  cost: number | null;
  savings: number | null;
  sir: number | null;
  status: string;
  savedMbtu: number | null;
  savedKwh: number | null;
  savedTherms: number | null;
  whyItMatters: string | null;
  homeownerNotes: string | null;
  contractorNotes: string | null;
  [key: string]: unknown;
}

export interface SnuggProHvac {
  uuid: string;
  [key: string]: unknown;
}

export interface SnuggProAttic {
  uuid: string;
  atticInsulationType: string | null;
  atticInsulationDepth: number | null;
  atticAssemblyRValue: number | null;
  atticModeledAtticArea: number | null;
  atticInsulation: number | null;
  atticInsulationImproved: number | null;
  atticRadiantBarrier: string | null;
  atticHasKneeWall: string | null;
  atticKneeWallInsulation: number | null;
  atticKneeWallArea: number | null;
  [key: string]: unknown;
}

export interface SnuggProWall {
  uuid: string;
  wallExteriorWallSiding: string | null;
  wallExteriorWallConstruction: string | null;
  wallsInsulated: string | null;
  wallCavityInsulation: number | null;
  wallCavityInsulationImproved: number | null;
  wallContinuousInsulation: number | null;
  wallAssemblyRValue: number | null;
  wallModeledWallArea: number | null;
  [key: string]: unknown;
}

export interface SnuggProWindow {
  uuid: string;
  windowType: string | null;
  windowFrame: string | null;
  windowEfficiency: number | null;
  windowEfficiencyImproved: number | null;
  windowSolarHeatGainCoefficient: number | null;
  windowAreaNorth: number | null;
  windowAreaEast: number | null;
  windowAreaSouth: number | null;
  windowAreaWest: number | null;
  [key: string]: unknown;
}

export interface SnuggProUtility {
  billEntryType: string | null;
  electricUtilityProviderName: string | null;
  primaryHeatingFuelType: string | null;
  annualElectricKWhUsed?: number | null;
  [key: string]: unknown;
}

export interface SnuggProHesScore {
  // HES endpoint can return null (no score computed)
  [key: string]: unknown;
}

export interface SnuggProRebate {
  [key: string]: unknown;
}

export interface SnuggProMetrics {
  // Energy costs
  yearlyEnergyCost: number | null;
  yearlyEnergyCostImproved: number | null;
  totalSavings: number | null;
  // kWh
  annualElectricKWhUsed: number | null;
  annualElectricKWhImproved: number | null;
  savedKwh: number | null;
  // Fuel therms
  annualFuelThermsUsed: number | null;
  annualFuelThermsImproved: number | null;
  annualFuelThermsSaved: number | null;
  // MMBtu
  mbtuBase: number | null;
  mbtuImproved: number | null;
  savedMbtu: number | null;
  savedMbtuPercent: number | null;
  // CO2
  totalCo2TonsBase: number | null;
  totalCo2Tons: number | null;
  savedCo2Tons: number | null;
  savedCo2Percent: number | null;
  // Dollar breakdowns
  annualElectricDollarsSpent: number | null;
  annualElectricDollarsImproved: number | null;
  annualFuelDollarsSpent: number | null;
  annualFuelDollarsImproved: number | null;
  // Investment
  installedCosts: number | null;
  paybackYears: number | null;
  sir: number | null;
  [key: string]: unknown;
}

export interface SnuggProStageHistory {
  id: number;
  jobId: number;
  stageId: string;
  startAt: string;
  endAt: string | null;
  changedBy: number | null;
  stageChangeReason: string | null;
  [key: string]: unknown;
}

export interface SnuggProSnapshot {
  id: number;
  name: string;
  created_at: string;
  [key: string]: unknown;
}

export interface SnuggProHealth {
  status: string;
  [key: string]: unknown;
}
