"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, type Role } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import type { Community } from "@/components/ui/AffiliationChip";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

type ManagedProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  community: Community;
  role: Role;
  isSuspended: boolean;
  createdAt: string;
};

const roleOptions: { value: Role; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { session } = useSession();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<ManagedProfile[] | null>(null);
  const [search, setSearch] = useState("");
  const pageRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = !!session && session.role === "admin";

  const loadPage = async (pageIndex: number, term: string, append: boolean) => {
    let query = supabase
      .from("profiles")
      .select("id, username, avatar_url, community_affiliation, role, is_suspended, created_at")
      .order("created_at", { ascending: false })
      .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);
    if (term.trim()) query = query.ilike("username", `%${term.trim()}%`);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      return;
    }

    const rows: ManagedProfile[] = (data ?? []).map((p) => ({
      id: p.id,
      username: p.username,
      avatarUrl: p.avatar_url,
      community: (p.community_affiliation ?? "neutral") as Community,
      role: p.role,
      isSuspended: p.is_suspended,
      createdAt: p.created_at,
    }));

    setHasMore(rows.length === PAGE_SIZE);
    setProfiles((prev) => (append && prev ? [...prev, ...rows] : rows));
  };

  // Initial load + reload on search (debounced), always resets to page 0.
  // The old list stays on screen until the new page arrives — no premature
  // clear — so typing doesn't flash an empty table between keystrokes.
  useEffect(() => {
    if (!isSuperAdmin) return;
    const t = setTimeout(() => {
      pageRef.current = 0;
      (async () => {
        await loadPage(0, search, false);
      })();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, search]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const next = pageRef.current + 1;
    await loadPage(next, search, true);
    pageRef.current = next;
    setLoadingMore(false);
  };

  const handleRoleChange = async (profile: ManagedProfile, role: Role) => {
    if (!session || profile.id === session.id) return;
    setBusyId(profile.id);
    setError(null);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profile.id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setProfiles((prev) => prev?.map((p) => (p.id === profile.id ? { ...p, role } : p)) ?? null);
  };

  const handleToggleSuspend = async (profile: ManagedProfile) => {
    if (!session || profile.id === session.id) return;
    setBusyId(profile.id);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update(
        profile.isSuspended
          ? { is_suspended: false, suspended_at: null }
          : { is_suspended: true, suspended_at: new Date().toISOString() },
      )
      .eq("id", profile.id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setProfiles(
      (prev) => prev?.map((p) => (p.id === profile.id ? { ...p, isSuspended: !p.isSuspended } : p)) ?? null,
    );
  };

  if (!session || !isSuperAdmin) {
    return (
      <div className="mx-auto w-full max-w-3xl px-margin-mobile py-stack-lg md:px-gutter">
        <div className="flex items-start gap-4 border-l-4 border-error bg-error-container p-4">
          <span className="material-symbols-outlined text-error">block</span>
          <div>
            <h1 className="font-label-bold text-label-bold text-on-error-container">Access Denied</h1>
            <p className="mt-1 font-caption text-caption text-on-error-container">
              This page is restricted to Administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      <Link
        href="/admin"
        className="mb-stack-md inline-flex items-center gap-1 font-caption text-caption text-on-surface-variant hover:text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Dashboard
      </Link>

      <header className="mb-stack-lg flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-stack-sm font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
            All Members
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Search, promote, or suspend any member.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username…"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pr-3 pl-9 font-body-sm text-body-sm outline-none transition-colors focus:border-2 focus:border-primary"
          />
        </div>
      </header>

      {error && (
        <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest">
        {profiles === null ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
        ) : profiles.length === 0 ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">No members found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="p-stack-sm font-caption text-caption text-on-surface-variant">User</th>
                  <th className="p-stack-sm font-caption text-caption text-on-surface-variant">Community</th>
                  <th className="p-stack-sm font-caption text-caption text-on-surface-variant">Role</th>
                  <th className="p-stack-sm font-caption text-caption text-on-surface-variant">Status</th>
                  <th className="p-stack-sm font-caption text-caption text-on-surface-variant">Joined</th>
                  <th className="p-stack-sm font-caption text-caption text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {profiles.map((profile) => {
                  const busy = busyId === profile.id;
                  const isSelf = profile.id === session.id;
                  return (
                    <tr key={profile.id} className="transition-colors hover:bg-surface-container">
                      <td className="p-stack-sm">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={profile.username}
                            community={profile.community}
                            avatarUrl={profile.avatarUrl}
                            size="h-8 w-8"
                            textClass="text-[10px] font-label-bold"
                          />
                          <div>
                            <p className="font-body-sm text-body-sm font-bold text-on-surface">
                              {profile.username}
                            </p>
                            <Link
                              href={`/profile/${profile.username}`}
                              className="font-caption text-[11px] text-primary hover:underline"
                            >
                              View profile
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="p-stack-sm">
                        <AffiliationChip community={profile.community} size="sm" />
                      </td>
                      <td className="p-stack-sm">
                        <select
                          value={profile.role}
                          disabled={busy || isSelf}
                          onChange={(e) => handleRoleChange(profile, e.target.value as Role)}
                          className="rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1 font-caption text-caption disabled:opacity-50"
                        >
                          {roleOptions.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-stack-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-caption text-[11px] font-bold ${
                            profile.isSuspended
                              ? "bg-error-container text-on-error-container"
                              : "bg-secondary-fixed text-primary"
                          }`}
                        >
                          {profile.isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="p-stack-sm font-caption text-caption text-on-surface-variant">
                        {new Date(profile.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-stack-sm">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy || isSelf}
                          onClick={() => handleToggleSuspend(profile)}
                          className={
                            profile.isSuspended
                              ? ""
                              : "border-error text-error hover:bg-error-container disabled:opacity-50"
                          }
                        >
                          {profile.isSuspended ? "Unsuspend" : "Suspend"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {profiles !== null && hasMore && (
        <div className="mt-stack-md flex justify-center">
          <Button type="button" variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
