// Server-only Supabase access for Hidden Grain API routes.
// Uses the admin client (service role) — writes are gated by the API route
// layer, never by direct browser calls. Never import this from the client.

export { supabaseAdmin } from "@/integrations/supabase/client.server";

export const SCHEMA_VERSION = "1.0.0";
export const SERVICE_NAME = "hidden-grain-api";
