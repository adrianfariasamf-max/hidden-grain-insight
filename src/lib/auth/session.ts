// Client-side auth session helpers. Reads the Supabase session and exposes
// a lightweight React hook + a bearer-token helper for authed fetch.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "owner" | "admin" | "researcher";

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface SessionState {
  status: "loading" | "authenticated" | "anonymous";
  user: SessionUser | null;
  roles: Role[];
}

let cachedRoles: Role[] | null = null;
let cachedUserId: string | null = null;

async function fetchRoles(userId: string, token: string): Promise<Role[]> {
  if (cachedUserId === userId && cachedRoles) return cachedRoles;
  try {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { roles?: Role[] };
    cachedUserId = userId;
    cachedRoles = body.roles ?? [];
    return cachedRoles;
  } catch {
    return [];
  }
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    status: "loading",
    user: null,
    roles: [],
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!mounted) return;
      if (!session) {
        cachedRoles = null;
        cachedUserId = null;
        setState({ status: "anonymous", user: null, roles: [] });
        return;
      }
      const roles = await fetchRoles(session.user.id, session.access_token);
      if (!mounted) return;
      setState({
        status: "authenticated",
        user: { id: session.user.id, email: session.user.email ?? null },
        roles,
      });
    };

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        cachedRoles = null;
        cachedUserId = null;
        void load();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Attaches the current Supabase bearer token to a fetch call. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export async function signOut() {
  cachedRoles = null;
  cachedUserId = null;
  await supabase.auth.signOut();
}

export function hasRole(state: SessionState, ...roles: Role[]) {
  return state.roles.some((r) => roles.includes(r));
}