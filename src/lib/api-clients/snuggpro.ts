import { createHmac } from "crypto";
import type {
  SnuggProJob,
  SnuggProRecommendation,
  SnuggProHvac,
  SnuggProAttic,
  SnuggProWall,
  SnuggProWindow,
  SnuggProUtility,
  SnuggProHesScore,
  SnuggProRebate,
  SnuggProMetrics,
  SnuggProStageHistory,
  SnuggProSnapshot,
  SnuggProHealth,
} from "@/src/types/snuggpro";

export class SnuggProClient {
  private publicKey: string;
  private privateKey: string;
  private baseUrl: string;

  constructor({ publicKey, privateKey, baseUrl }: { publicKey: string; privateKey: string; baseUrl?: string }) {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.baseUrl = (baseUrl || "https://api.snuggpro.com").replace(/\/$/, "");
  }

  private generateSignature(timestamp: string): string {
    const hmac = createHmac("sha256", this.privateKey);
    hmac.update(timestamp);
    return hmac.digest("hex");
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(timestamp);

    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Credential=${this.publicKey}, Signature=${signature}`,
        "X-Date": timestamp,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (res.status === 429) {
      // Rate limited — wait and retry once
      const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.request<T>(path, options);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`SnuggPro API error ${res.status}: ${body}`);
    }

    return res.json();
  }

  async getJobs(): Promise<SnuggProJob[]> {
    return this.request<SnuggProJob[]>("/jobs");
  }

  async getJob(id: string): Promise<SnuggProJob> {
    return this.request<SnuggProJob>(`/jobs/${id}`);
  }

  // NOTE: Do NOT call /jobs/{id}/model — it triggers a modeling run, not a read.
  // Use getMetricsSummary() instead for energy data.

  async getRecommendations(jobId: string): Promise<SnuggProRecommendation[]> {
    return this.request<SnuggProRecommendation[]>(`/jobs/${jobId}/recommendations`);
  }

  async getHvacs(jobId: string): Promise<SnuggProHvac[]> {
    return this.request<SnuggProHvac[]>(`/jobs/${jobId}/hvacs`);
  }

  async getAttics(jobId: string): Promise<SnuggProAttic[]> {
    return this.request<SnuggProAttic[]>(`/jobs/${jobId}/attics`);
  }

  async getWalls(jobId: string): Promise<SnuggProWall[]> {
    return this.request<SnuggProWall[]>(`/jobs/${jobId}/walls`);
  }

  async getWindows(jobId: string): Promise<SnuggProWindow[]> {
    return this.request<SnuggProWindow[]>(`/jobs/${jobId}/windows`);
  }

  async getUtilities(jobId: string): Promise<SnuggProUtility[]> {
    return this.request<SnuggProUtility[]>(`/jobs/${jobId}/utilities`);
  }

  async getHesScore(jobId: string): Promise<SnuggProHesScore> {
    return this.request<SnuggProHesScore>(`/jobs/${jobId}/hes-score`);
  }

  async getRebatesIncentives(jobId: string): Promise<SnuggProRebate[]> {
    return this.request<SnuggProRebate[]>(`/jobs/${jobId}/rebates-incentives`);
  }

  async getMetricsSummary(jobId: string): Promise<SnuggProMetrics> {
    return this.request<SnuggProMetrics>(`/jobs/${jobId}/metrics-summary`);
  }

  async getJobStageHistory(jobId: string): Promise<SnuggProStageHistory[]> {
    return this.request<SnuggProStageHistory[]>(`/jobs/${jobId}/job-stage-history`);
  }

  async getSnapshots(jobId: string): Promise<SnuggProSnapshot[]> {
    return this.request<SnuggProSnapshot[]>(`/jobs/${jobId}/snapshots`);
  }

  async getHealth(): Promise<SnuggProHealth> {
    return this.request<SnuggProHealth>("/health");
  }

  async createJob(data: { firstName: string; lastName: string; address1: string; city: string; state: string; zip: string; email?: string; homePhone?: string }): Promise<{ id: string }> {
    return this.request<{ id: string }>("/jobs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStage(jobId: string, stage: string): Promise<void> {
    await this.request(`/jobs/${jobId}/stage`, {
      method: "POST",
      body: JSON.stringify({ stage }),
    });
  }

  // Write methods (best-effort — SnuggPro API may not support all of these)

  async updateBasedata(jobId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/jobs/${jobId}/basedata`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createHvac(jobId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/jobs/${jobId}/hvacs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDhw(jobId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/jobs/${jobId}/dhw`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createAttic(jobId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/jobs/${jobId}/attics`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createWall(jobId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/jobs/${jobId}/walls`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createWindow(jobId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/jobs/${jobId}/windows`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createDoor(jobId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/jobs/${jobId}/doors`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateHealth(jobId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/jobs/${jobId}/health`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getJobs();
      return true;
    } catch {
      return false;
    }
  }
}
