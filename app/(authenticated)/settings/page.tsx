import { getCurrentUser } from "@/src/lib/auth/session";
import { getCompanyRef, getSyncStateRef } from "@/src/lib/firestore/helpers";
import { SettingsForm } from "@/src/components/settings/settings-form";
import { SyncStatusPanel, type SyncData } from "@/src/components/dashboard/sync-status";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [companyDoc, snuggproDoc, companycamDoc] = await Promise.all([
    getCompanyRef(user.companyId).get(),
    getSyncStateRef(user.companyId, "snuggpro").get(),
    getSyncStateRef(user.companyId, "companycam").get(),
  ]);

  const companyData = companyDoc.exists ? companyDoc.data()! : {};

  const serializeSync = (data: Record<string, unknown>): SyncData => ({
    status: (data.status as string) || "idle",
    lastSyncAt: data.lastSyncAt && typeof data.lastSyncAt === "object" && "toDate" in data.lastSyncAt
      ? (data.lastSyncAt as { toDate: () => Date }).toDate().toISOString()
      : null,
    lastError: (data.lastError as string) || null,
    itemsSynced: (data.itemsSynced as number) || 0,
  });

  const snuggproSync = snuggproDoc.exists ? serializeSync(snuggproDoc.data()!) : null;
  const companycamSync = companycamDoc.exists ? serializeSync(companycamDoc.data()!) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <SettingsForm
        initial={{
          name: companyData.name || "",
          snuggproBaseUrl: companyData.snuggproBaseUrl || "https://api.snuggpro.com",
          syncInterval: companyData.syncInterval || 60,
          hasSnuggpro: !!companyData.snuggproPublicKey && !!companyData.snuggproPrivateKey,
          hasCompanycam: !!companyData.companycamToken,
        }}
      />
      <SyncStatusPanel snuggpro={snuggproSync} companycam={companycamSync} />
    </div>
  );
}
