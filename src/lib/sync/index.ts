import { syncSnuggPro, type SyncResult } from "./snuggpro-sync";
import { syncCompanyCam, type CompanyCamSyncResult } from "./companycam-sync";

export { syncSnuggPro, type SyncResult } from "./snuggpro-sync";
export { syncCompanyCam, type CompanyCamSyncResult } from "./companycam-sync";

export interface FullSyncResult {
  snuggpro: SyncResult;
  companycam: CompanyCamSyncResult;
}

export async function runFullSync(companyId: string): Promise<FullSyncResult> {
  // Run SnuggPro first so jobs exist for CompanyCam matching
  const snuggpro = await syncSnuggPro(companyId);
  const companycam = await syncCompanyCam(companyId);
  return { snuggpro, companycam };
}
