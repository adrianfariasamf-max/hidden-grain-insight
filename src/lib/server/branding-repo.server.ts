// Global institutional branding (RR-019/020).
// Single-row `branding_settings` table; logo lives in the private `branding`
// bucket and is served via short-lived signed URLs, same pattern as
// experiment stimuli. Investigator-managed, participant-visible only.

import { supabaseAdmin } from "./db.server";

interface BrandingRow {
  id: string;
  logo_path: string | null;
  logo_visible: boolean;
  updated_at: string;
}

export interface BrandingSettings {
  logoPath: string | null;
  logoVisible: boolean;
  logoUrl: string | null;
  updatedAt: string;
}

const SINGLETON_ID = "global";
const READ_TTL_SECONDS = 60 * 60 * 2;

async function readRow(): Promise<BrandingRow> {
  const { data, error } = await supabaseAdmin
    .from("branding_settings")
    .select("*")
    .eq("id", SINGLETON_ID)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as BrandingRow;
  // Self-heal in case the seed row was ever removed.
  const insert = await supabaseAdmin
    .from("branding_settings")
    .insert({ id: SINGLETON_ID })
    .select("*")
    .single();
  if (insert.error) throw insert.error;
  return insert.data as BrandingRow;
}

async function signLogo(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from("branding")
    .createSignedUrl(path, READ_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

function toSettings(row: BrandingRow, url: string | null): BrandingSettings {
  return {
    logoPath: row.logo_path,
    logoVisible: row.logo_visible,
    logoUrl: url,
    updatedAt: row.updated_at,
  };
}

export async function getBrandingSettings(): Promise<BrandingSettings> {
  const row = await readRow();
  const url = row.logo_visible ? await signLogo(row.logo_path) : null;
  return toSettings(row, url);
}

export async function getBrandingSettingsAdmin(): Promise<BrandingSettings> {
  // Editor view: always includes the logo URL so the investigator can
  // preview even when it's hidden from participants.
  const row = await readRow();
  const url = await signLogo(row.logo_path);
  return toSettings(row, url);
}

export async function signBrandingUpload(
  filename: string,
): Promise<{ uploadUrl: string; token: string; logoPath: string }> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "logo";
  const path = `logo/${Date.now()}_${safe}`;
  const { data, error } = await supabaseAdmin.storage
    .from("branding")
    .createSignedUploadUrl(path);
  if (error) throw error;
  return { uploadUrl: data.signedUrl, token: data.token, logoPath: path };
}

export async function commitBrandingLogo(logoPath: string): Promise<BrandingSettings> {
  const existing = await readRow();
  const { error } = await supabaseAdmin
    .from("branding_settings")
    .update({ logo_path: logoPath, logo_visible: true, updated_at: new Date().toISOString() })
    .eq("id", SINGLETON_ID);
  if (error) throw error;
  // Best-effort cleanup of previous file.
  if (existing.logo_path && existing.logo_path !== logoPath) {
    await supabaseAdmin.storage.from("branding").remove([existing.logo_path]).catch(() => null);
  }
  return getBrandingSettingsAdmin();
}

export async function setBrandingVisibility(visible: boolean): Promise<BrandingSettings> {
  const { error } = await supabaseAdmin
    .from("branding_settings")
    .update({ logo_visible: visible, updated_at: new Date().toISOString() })
    .eq("id", SINGLETON_ID);
  if (error) throw error;
  return getBrandingSettingsAdmin();
}

export async function clearBrandingLogo(): Promise<BrandingSettings> {
  const existing = await readRow();
  const { error } = await supabaseAdmin
    .from("branding_settings")
    .update({ logo_path: null, updated_at: new Date().toISOString() })
    .eq("id", SINGLETON_ID);
  if (error) throw error;
  if (existing.logo_path) {
    await supabaseAdmin.storage.from("branding").remove([existing.logo_path]).catch(() => null);
  }
  return getBrandingSettingsAdmin();
}