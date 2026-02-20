import type { CompanyCamProject, CompanyCamPhoto } from "@/src/types/companycam";

export class CompanyCamClient {
  private token: string;
  private baseUrl: string;

  constructor({ token, baseUrl }: { token: string; baseUrl?: string }) {
    this.token = token;
    this.baseUrl = (baseUrl || "https://api.companycam.com/v2").replace(/\/$/, "");
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.request<T>(path, options);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`CompanyCam API error ${res.status}: ${body}`);
    }

    return res.json();
  }

  async getProjects(params?: { page?: number; per_page?: number }): Promise<CompanyCamProject[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    const qs = query.toString();
    return this.request<CompanyCamProject[]>(`/projects${qs ? `?${qs}` : ""}`);
  }

  async getAllProjects(): Promise<CompanyCamProject[]> {
    const allProjects: CompanyCamProject[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const projects = await this.getProjects({ page, per_page: perPage });
      allProjects.push(...projects);
      if (projects.length < perPage) break;
      page++;
    }

    return allProjects;
  }

  async getProject(id: string): Promise<CompanyCamProject> {
    return this.request<CompanyCamProject>(`/projects/${id}`);
  }

  async getProjectPhotos(
    projectId: string,
    params?: { page?: number; per_page?: number }
  ): Promise<CompanyCamPhoto[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    const qs = query.toString();
    return this.request<CompanyCamPhoto[]>(
      `/projects/${projectId}/photos${qs ? `?${qs}` : ""}`
    );
  }

  async getAllProjectPhotos(projectId: string): Promise<CompanyCamPhoto[]> {
    const allPhotos: CompanyCamPhoto[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const photos = await this.getProjectPhotos(projectId, { page, per_page: perPage });
      allPhotos.push(...photos);
      if (photos.length < perPage) break;
      page++;
    }

    return allPhotos;
  }

  async createProject(data: {
    name: string;
    address: { street_address_1: string; city: string; state: string; postal_code: string };
  }): Promise<CompanyCamProject> {
    return this.request<CompanyCamProject>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getProjects({ per_page: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
