/**
 * One-time migration: rename old stage values to new CRM stage names.
 *   audit        → audit_complete
 *   in_progress  → work_in_progress
 *   completed    → complete
 *
 * Also migrates stageHistory entries.
 *
 * Run: npx tsx scripts/migrate-stages.ts
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const STAGE_RENAME: Record<string, string> = {
  audit: "audit_complete",
  in_progress: "work_in_progress",
  completed: "complete",
};

async function main() {
  // Initialize Firebase Admin
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  initializeApp({ credential: cert(serviceAccount as ServiceAccount) });
  const db = getFirestore();

  const companiesSnap = await db.collection("companies").get();
  let totalUpdated = 0;

  for (const companyDoc of companiesSnap.docs) {
    const companyId = companyDoc.id;
    console.log(`\nProcessing company: ${companyId}`);

    const jobsSnap = await db.collection(`companies/${companyId}/jobs`).get();
    const batch = db.batch();
    let batchCount = 0;

    for (const jobDoc of jobsSnap.docs) {
      const data = jobDoc.data();
      const updates: Record<string, unknown> = {};

      // Migrate top-level stage
      if (data.stage && STAGE_RENAME[data.stage]) {
        updates.stage = STAGE_RENAME[data.stage];
      }

      // Migrate stageHistory entries
      if (Array.isArray(data.stageHistory)) {
        let historyChanged = false;
        const newHistory = data.stageHistory.map((entry: Record<string, unknown>) => {
          const oldStage = entry.stage as string;
          if (STAGE_RENAME[oldStage]) {
            historyChanged = true;
            return { ...entry, stage: STAGE_RENAME[oldStage] };
          }
          return entry;
        });
        if (historyChanged) {
          updates.stageHistory = newHistory;
        }
      }

      if (Object.keys(updates).length > 0) {
        batch.update(jobDoc.ref, updates);
        batchCount++;
        console.log(`  ${jobDoc.id}: ${data.stage} → ${updates.stage || data.stage}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      totalUpdated += batchCount;
      console.log(`  Updated ${batchCount} jobs`);
    } else {
      console.log(`  No jobs to update`);
    }
  }

  console.log(`\nDone. Total jobs updated: ${totalUpdated}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
