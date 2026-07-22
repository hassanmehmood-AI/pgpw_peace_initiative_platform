"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Community } from "@/components/ui/AffiliationChip";

export type Role = "member" | "mediator" | "admin";

export type MockSession = {
  id: string;
  name: string;
  role: Role;
  community: Community;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
};

const roleLabels: Record<Role, string> = {
  member: "Peace Builder",
  mediator: "Mediator",
  admin: "Administrator",
};

export function roleLabel(role: Role) {
  return roleLabels[role];
}

export function canModerate(role: Role) {
  return role === "mediator" || role === "admin";
}

/**
 * Real Supabase-backed replacement for the Phase A2 mock session. Keeps the
 * same MockSession shape and useSession() API every Part A page was already
 * built against — only the plumbing behind it changed, from localStorage to
 * supabase.auth + a `profiles` row fetch.
 */
async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<MockSession | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role, community_affiliation, avatar_url, bio, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.username,
    role: data.role,
    community: (data.community_affiliation ?? "neutral") as Community,
    avatarUrl: data.avatar_url ?? undefined,
    bio: data.bio ?? undefined,
    createdAt: data.created_at,
  };
}

type SessionContextValue = {
  session: MockSession | null;
  loading: boolean;
  // Non-null whenever Supabase auth has a signed-in user, even if `session`
  // is null because their `profiles` row doesn't exist (e.g. registration
  // was interrupted before Step 3 completed). Lets consumers tell "not
  // signed in" apart from "signed in but profile missing" instead of
  // treating both the same and silently bouncing to /login.
  authUserId: string | null;
  logout: () => Promise<void>;
  // `avatarUrl: null` clears the photo (persists as NULL); omitting the key
  // leaves it untouched. This is why it's split out from the rest of
  // MockSession's `avatarUrl?: string`, which has no way to express "clear".
  updateSession: (patch: Partial<Omit<MockSession, "id" | "avatarUrl">> & { avatarUrl?: string | null }) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<MockSession | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        setSession(null);
        setAuthUserId(null);
        setLoading(false);
        return;
      }
      setAuthUserId(user.id);
      const profile = await fetchProfile(supabase, user.id);
      if (!active) return;
      setSession(profile);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, authSession) => {
      if (!authSession?.user) {
        setSession(null);
        setAuthUserId(null);
        return;
      }
      setAuthUserId(authSession.user.id);
      const profile = await fetchProfile(supabase, authSession.user.id);
      if (active) setSession(profile);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthUserId(null);
  };

  const updateSession = async (
    patch: Partial<Omit<MockSession, "id" | "avatarUrl">> & { avatarUrl?: string | null },
  ) => {
    if (!session) return;

    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.username = patch.name;
    if (patch.community !== undefined) dbPatch.community_affiliation = patch.community;
    if (patch.role !== undefined) dbPatch.role = patch.role;
    if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
    if (patch.bio !== undefined) dbPatch.bio = patch.bio;

    const { error } = await supabase.from("profiles").update(dbPatch).eq("id", session.id);
    if (error) {
      console.error("Failed to update profile", error);
      return;
    }
    setSession({
      ...session,
      ...patch,
      avatarUrl: patch.avatarUrl === undefined ? session.avatarUrl : (patch.avatarUrl ?? undefined),
    });
  };

  const value: SessionContextValue = { session, loading, authUserId, logout, updateSession };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
