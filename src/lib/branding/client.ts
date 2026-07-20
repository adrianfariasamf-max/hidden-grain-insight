import { queryOptions } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api/client";

export interface BrandingSettings {
  logoPath: string | null;
  logoVisible: boolean;
  logoUrl: string | null;
  updatedAt: string;
}

export interface PublicBranding {
  logoVisible: boolean;
  logoUrl: string | null;
}

// Participant-safe branding: cached briefly so navigating between the
// participant screens reuses the signed URL.
export const publicBrandingQuery = () =>
  queryOptions({
    queryKey: ["branding", "public"],
    queryFn: async ({ signal }): Promise<PublicBranding> => {
      const res = await fetch(`${API_BASE}/public/branding`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as PublicBranding;
    },
    staleTime: 5 * 60 * 1000,
  });

export const brandingAdminQuery = () =>
  queryOptions({
    queryKey: ["branding", "admin"],
    queryFn: async ({ signal }): Promise<BrandingSettings> => {
      const res = await fetch(`${API_BASE}/branding`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as BrandingSettings;
    },
  });

export const brandingApi = {
  async signUpload(filename: string): Promise<{ uploadUrl: string; logoPath: string }> {
    const res = await fetch(`${API_BASE}/branding/upload-url`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as { uploadUrl: string; logoPath: string };
  },
  async commitUpload(logoPath: string): Promise<BrandingSettings> {
    const res = await fetch(`${API_BASE}/branding/upload-url`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commitPath: logoPath }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BrandingSettings;
  },
  async setVisibility(logoVisible: boolean): Promise<BrandingSettings> {
    const res = await fetch(`${API_BASE}/branding`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logoVisible }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BrandingSettings;
  },
  async remove(): Promise<BrandingSettings> {
    const res = await fetch(`${API_BASE}/branding`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BrandingSettings;
  },
};