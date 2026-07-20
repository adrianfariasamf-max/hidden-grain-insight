// Server-only authorization helpers for Hidden Grain admin API routes.
// All private endpoints MUST call one of these before doing any work with
// `supabaseAdmin`. The service_role client is used only after identity and
// authorization are verified against the JWT bearer token.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Role = "owner" | "admin" | "researcher";

export interface AuthContext {
  userId: string;
  email: string | null;
  roles: Role[];
}

function isNewSupabaseApiKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function makeUserClient(token: string) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/**
 * Verify the request carries a valid Supabase bearer token.
 * Returns an AuthContext on success or a `Response` (401) on failure.
 */
export async function authenticate(request: Request): Promise<AuthContext | Response> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const client = makeUserClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = data.user.id;
  const email = data.user.email ?? null;

  // Roles come from public.user_roles via admin client (RLS bypass is safe
  // here: we already validated identity and we only read this user's rows).
  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (roleRows ?? []).map((r) => r.role as Role);
  return { userId, email, roles };
}

function hasRole(ctx: AuthContext, ...roles: Role[]) {
  return ctx.roles.some((r) => roles.includes(r));
}

/** Any researcher / admin / owner is allowed. */
export async function requireResearcher(request: Request): Promise<AuthContext | Response> {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;
  if (!hasRole(ctx, "researcher", "admin", "owner")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return ctx;
}

/** Only OWNER or ADMIN — for institutional / branding config. */
export async function requireAdmin(request: Request): Promise<AuthContext | Response> {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;
  if (!hasRole(ctx, "admin", "owner")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return ctx;
}

/**
 * Require the caller to be the owner of `experimentId` (or an OWNER of the
 * installation). Returns 404 for missing experiments to avoid leaking which
 * IDs exist, 403 for cross-owner access.
 */
export async function requireExperimentOwner(
  request: Request,
  experimentId: string,
): Promise<AuthContext | Response> {
  const ctx = await requireResearcher(request);
  if (ctx instanceof Response) return ctx;
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .select("id, owner_id")
    .eq("id", experimentId)
    .maybeSingle();
  if (error) return Response.json({ error: "internal" }, { status: 500 });
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  const isOwner = data.owner_id === ctx.userId;
  const isInstallOwner = hasRole(ctx, "owner");
  if (!isOwner && !isInstallOwner) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return ctx;
}

/**
 * Require that the token owner also owns the experiment referenced by
 * a participant session token. Used for admin reads of participant data.
 */
export async function requireSessionOwner(
  request: Request,
  publicToken: string,
): Promise<AuthContext | Response> {
  const ctx = await requireResearcher(request);
  if (ctx instanceof Response) return ctx;
  const { data } = await supabaseAdmin
    .from("participant_sessions")
    .select("experiment_id, perception_experiments!inner(owner_id)")
    .eq("public_token", publicToken)
    .maybeSingle();
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  const ownerId = (data as unknown as { perception_experiments: { owner_id: string | null } })
    .perception_experiments.owner_id;
  const isOwner = ownerId === ctx.userId;
  const isInstallOwner = hasRole(ctx, "owner");
  if (!isOwner && !isInstallOwner) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return ctx;
}