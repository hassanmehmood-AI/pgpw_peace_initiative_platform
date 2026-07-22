"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";

type ModerationActionType = "dismiss" | "warn" | "suspend";

type AuditEntry = {
  id: string;
  moderator: string;
  action: ModerationActionType;
  subjectUsername: string | null;
  notes: string;
  createdAt: string;
};

const actionMeta: Record<ModerationActionType, { icon: string; label: string }> = {
  dismiss: { icon: "check_circle", label: "Dismissed" },
  warn: { icon: "warning", label: "Warned" },
  suspend: { icon: "block", label: "Suspended" },
};

const PAGE_SIZE = 30;

export default function AdminAuditLogPage() {
  const { session } = useSession();
  const supabase = createClient();

  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = !!session && session.role === "admin";

  const loadPage = async (pageIndex: number, append: boolean) => {
    const { data, error } = await supabase
      .from("moderation_actions")
      .select(
        "id, action, notes, created_at, moderator:profiles!moderation_actions_moderator_id_fkey(username), subject:profiles!moderation_actions_subject_id_fkey(username)",
      )
      .order("created_at", { ascending: false })
      .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

    if (error) {
      setError(error.message);
      return;
    }

    type RawEntry = {
      id: string;
      action: ModerationActionType;
      notes: string | null;
      created_at: string;
      moderator: { username: string } | null;
      subject: { username: string } | null;
    };
    const rows = (data ?? []) as unknown as RawEntry[];

    const mapped: AuditEntry[] = rows.map((e) => ({
      id: e.id,
      moderator: e.moderator?.username ?? "Unknown",
      action: e.action,
      subjectUsername: e.subject?.username ?? null,
      notes: e.notes ?? "",
      createdAt: e.created_at,
    }));

    setHasMore(mapped.length === PAGE_SIZE);
    setEntries((prev) => (append && prev ? [...prev, ...mapped] : mapped));
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      await loadPage(0, false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    await loadPage(next, true);
    setPage(next);
    setLoadingMore(false);
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

      <header className="mb-stack-lg">
        <h1 className="mb-stack-sm font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
          Full Audit Log
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Every moderation action taken on the platform, most recent first.
        </p>
      </header>

      {error && (
        <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest">
        {entries === null ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">No moderation actions yet.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 p-stack-md">
                <span className="material-symbols-outlined mt-0.5 text-primary">
                  {actionMeta[entry.action].icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-label-bold text-label-bold text-primary">
                      {actionMeta[entry.action].label}
                    </span>
                    <span className="font-caption text-caption text-on-surface-variant">
                      — {entry.subjectUsername ?? "no identifiable subject"}
                    </span>
                    <span className="ml-auto shrink-0 font-caption text-caption text-on-surface-variant">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{entry.notes}</p>
                  <p className="mt-1 font-caption text-caption text-outline">by {entry.moderator}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {entries !== null && hasMore && (
        <div className="mt-stack-md flex justify-center">
          <Button type="button" variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
