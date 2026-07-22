"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, canModerate } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import type { Community } from "@/components/ui/AffiliationChip";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS, CATEGORY_VALUES } from "@/lib/validation/report";
import { timeAgo } from "@/lib/timeAgo";

// ---------------------------------------------------------------------------
// Types — shaped from live `reports` / `moderation_actions` (+ resolved
// subject via `profiles`/`feed_posts`/`forum_posts`) queries
// ---------------------------------------------------------------------------
type TargetType = "feed_post" | "forum_post" | "user" | "general";
type ModerationActionType = "dismiss" | "warn" | "suspend";

type Subject = { profileId: string; username: string; community: Community } | null;

type AdminReportRow = {
  id: string;
  category: string;
  description: string;
  createdAt: string;
  reporterUsername: string | null; // null = anonymous
  targetType: TargetType;
  subject: Subject;
};

type AuditEntry = {
  id: string;
  moderator: string;
  action: ModerationActionType;
  subjectUsername: string | null;
  notes: string;
  createdAt: string;
};

type Stats = {
  totalMembers: number;
  newThisWeek: number;
  pendingReports: number;
  suspended: number;
};

const actionMeta: Record<ModerationActionType, { icon: string; label: string }> = {
  dismiss: { icon: "check_circle", label: "Dismissed" },
  warn: { icon: "warning", label: "Warned" },
  suspend: { icon: "block", label: "Suspended" },
};

export default function AdminPage() {
  const { session } = useSession();
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<AdminReportRow[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  const isModerator = !!session && canModerate(session.role);

  // ---- Data loading ----------------------------------------------------

  const refreshStats = async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [total, recent, pending, suspended] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_suspended", true),
    ]);
    setStats({
      totalMembers: total.count ?? 0,
      newThisWeek: recent.count ?? 0,
      pendingReports: pending.count ?? 0,
      suspended: suspended.count ?? 0,
    });
  };

  const refreshReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("id, category, description, created_at, target_type, target_id, profiles!reports_reporter_id_fkey(username)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setReports([]);
      return;
    }

    type RawRow = {
      id: string;
      category: string;
      description: string;
      created_at: string;
      target_type: TargetType;
      target_id: string | null;
      profiles: { username: string } | null;
    };
    const rows = (data ?? []) as unknown as RawRow[];

    // Resolve each report's "subject" (the profile a Suspend action would
    // flag). target_id is polymorphic — for target_type "user" it already
    // is a profile id; for "feed_post"/"forum_post" it's a post id we have
    // to look up the author of; "general" reports have no identifiable
    // subject at all. Batched by type rather than one query per report.
    const feedPostIds = rows.filter((r) => r.target_type === "feed_post" && r.target_id).map((r) => r.target_id!);
    const forumPostIds = rows.filter((r) => r.target_type === "forum_post" && r.target_id).map((r) => r.target_id!);

    const [feedPostAuthors, forumPostAuthors] = await Promise.all([
      feedPostIds.length
        ? supabase.from("feed_posts").select("id, author_id").in("id", feedPostIds)
        : Promise.resolve({ data: [] as { id: string; author_id: string }[] }),
      forumPostIds.length
        ? supabase.from("forum_posts").select("id, author_id").in("id", forumPostIds)
        : Promise.resolve({ data: [] as { id: string; author_id: string }[] }),
    ]);
    const feedAuthorByPost = new Map((feedPostAuthors.data ?? []).map((p) => [p.id, p.author_id]));
    const forumAuthorByPost = new Map((forumPostAuthors.data ?? []).map((p) => [p.id, p.author_id]));

    const subjectProfileIds = new Set<string>();
    for (const r of rows) {
      if (r.target_type === "user" && r.target_id) subjectProfileIds.add(r.target_id);
      if (r.target_type === "feed_post" && r.target_id) {
        const a = feedAuthorByPost.get(r.target_id);
        if (a) subjectProfileIds.add(a);
      }
      if (r.target_type === "forum_post" && r.target_id) {
        const a = forumAuthorByPost.get(r.target_id);
        if (a) subjectProfileIds.add(a);
      }
    }

    const { data: subjectProfiles } = subjectProfileIds.size
      ? await supabase
          .from("profiles")
          .select("id, username, community_affiliation")
          .in("id", [...subjectProfileIds])
      : { data: [] as { id: string; username: string; community_affiliation: Community | null }[] };
    const profileById = new Map((subjectProfiles ?? []).map((p) => [p.id, p]));

    const resolveSubject = (r: RawRow): Subject => {
      let profileId: string | null = null;
      if (r.target_type === "user") profileId = r.target_id;
      if (r.target_type === "feed_post" && r.target_id) profileId = feedAuthorByPost.get(r.target_id) ?? null;
      if (r.target_type === "forum_post" && r.target_id) profileId = forumAuthorByPost.get(r.target_id) ?? null;
      if (!profileId) return null;
      const profile = profileById.get(profileId);
      if (!profile) return null;
      return { profileId, username: profile.username, community: profile.community_affiliation ?? "neutral" };
    };

    setReports(
      rows.map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        createdAt: r.created_at,
        reporterUsername: r.profiles?.username ?? null,
        targetType: r.target_type,
        subject: resolveSubject(r),
      })),
    );
  };

  const refreshAuditLog = async () => {
    const { data, error } = await supabase
      .from("moderation_actions")
      .select(
        "id, action, notes, created_at, moderator:profiles!moderation_actions_moderator_id_fkey(username), subject:profiles!moderation_actions_subject_id_fkey(username)",
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setError(error.message);
      setAuditLog([]);
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

    setAuditLog(
      rows.map((e) => ({
        id: e.id,
        moderator: e.moderator?.username ?? "Unknown",
        action: e.action,
        subjectUsername: e.subject?.username ?? null,
        notes: e.notes ?? "",
        createdAt: e.created_at,
      })),
    );
  };

  useEffect(() => {
    if (!isModerator) return;
    (async () => {
      await Promise.all([refreshStats(), refreshReports(), refreshAuditLog()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModerator]);

  if (!session || !canModerate(session.role)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-margin-mobile py-stack-lg md:px-gutter">
        <div className="flex items-start gap-4 border-l-4 border-error bg-error-container p-4">
          <span className="material-symbols-outlined text-error">block</span>
          <div>
            <h1 className="font-label-bold text-label-bold text-on-error-container">
              Access Denied
            </h1>
            <p className="mt-1 font-caption text-caption text-on-error-container">
              The Admin Dashboard is restricted to Mediators and Administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Handlers ------------------------------------------------------------

  const logModerationAction = async (
    report: AdminReportRow,
    action: ModerationActionType,
    notes: string,
  ) => {
    const { error } = await supabase.from("moderation_actions").insert({
      report_id: report.id,
      moderator_id: session.id,
      action,
      subject_id: report.subject?.profileId ?? null,
      notes,
    });
    return error;
  };

  const handleReview = async (id: string) => {
    setBusyReportId(id);
    setError(null);
    const { error } = await supabase.from("reports").update({ status: "reviewed" }).eq("id", id);
    setBusyReportId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshReports();
  };

  const handleDismiss = async (report: AdminReportRow) => {
    setBusyReportId(report.id);
    setError(null);

    const actionError = await logModerationAction(
      report,
      "dismiss",
      "Reviewed and dismissed — no violation found.",
    );
    if (actionError) {
      setBusyReportId(null);
      setError(actionError.message);
      return;
    }

    const { error } = await supabase.from("reports").update({ status: "dismissed" }).eq("id", report.id);
    setBusyReportId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await Promise.all([refreshReports(), refreshAuditLog()]);
  };

  const handleSuspend = async (report: AdminReportRow) => {
    if (!report.subject) return; // button is disabled in this case
    setBusyReportId(report.id);
    setError(null);

    const actionError = await logModerationAction(
      report,
      "suspend",
      "Account suspended for violating platform guidelines.",
    );
    if (actionError) {
      setBusyReportId(null);
      setError(actionError.message);
      return;
    }

    const [{ error: reportError }, { error: profileError }] = await Promise.all([
      supabase.from("reports").update({ status: "suspended" }).eq("id", report.id),
      supabase
        .from("profiles")
        .update({ is_suspended: true, suspended_at: new Date().toISOString() })
        .eq("id", report.subject.profileId),
    ]);
    setBusyReportId(null);
    if (reportError || profileError) {
      setError((reportError ?? profileError)!.message);
      return;
    }
    await Promise.all([refreshReports(), refreshAuditLog(), refreshStats()]);
  };

  const statCards: {
    icon: string;
    label: string;
    value: string;
    trend: string;
    trendIcon?: string;
    accent?: boolean;
  }[] = stats
    ? [
        {
          icon: "group",
          label: "Total Members",
          value: stats.totalMembers.toLocaleString(),
          trend: `+${stats.newThisWeek} this week`,
          trendIcon: "arrow_upward",
        },
        {
          icon: "person_add",
          label: "New This Week",
          value: stats.newThisWeek.toLocaleString(),
          trend: "New sign-ups",
        },
        {
          icon: "report",
          label: "Reported Items",
          value: String(stats.pendingReports),
          trend: stats.pendingReports > 0 ? "Action required" : "All clear",
          trendIcon: stats.pendingReports > 0 ? "warning" : "check_circle",
          accent: stats.pendingReports > 0,
        },
        {
          icon: "block",
          label: "Suspended",
          value: String(stats.suspended),
          trend: "Accounts restricted",
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      <header className="mb-stack-lg">
        <h1 className="mb-stack-sm font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
          Admin &amp; Moderation
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Platform oversight and safety management.
        </p>
      </header>

      {error && (
        <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
          {error}
        </p>
      )}

      {/* Stats grid */}
      <section className="mb-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        {stats === null ? (
          <p className="col-span-full font-body-md text-body-md text-on-surface-variant">Loading stats…</p>
        ) : (
          statCards.map((stat) => (
            <div
              key={stat.label}
              className={`relative overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest p-stack-md ${
                stat.accent ? "border-l-4 border-l-error" : ""
              }`}
            >
              <span className="material-symbols-outlined pointer-events-none absolute top-0 right-0 p-3 text-display-lg opacity-10">
                {stat.icon}
              </span>
              <h3 className="mb-2 font-label-bold text-label-bold text-on-surface-variant">
                {stat.label}
              </h3>
              <p className="font-display-lg text-display-lg text-primary">{stat.value}</p>
              <p
                className={`mt-2 flex items-center gap-1 font-caption text-caption ${
                  stat.accent ? "text-error" : "text-secondary"
                }`}
              >
                {stat.trendIcon && (
                  <span className="material-symbols-outlined text-[16px]">{stat.trendIcon}</span>
                )}
                {stat.trend}
              </p>
            </div>
          ))
        )}
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* Reported content queue */}
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest lg:col-span-7">
          <div className="halftone-bg border-b border-outline-variant p-stack-md">
            <h2 className="font-headline-md text-headline-md text-primary">Reported Content</h2>
          </div>
          {reports === null ? (
            <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">
              Queue is clear — no pending reports.
            </p>
          ) : (
            <ul className="max-h-[600px] divide-y divide-outline-variant overflow-y-auto">
              {reports.map((report) => {
                const busy = busyReportId === report.id;
                const categoryLabel =
                  CATEGORY_LABELS[report.category as (typeof CATEGORY_VALUES)[number]] ?? report.category;
                return (
                  <li key={report.id} className="p-stack-md transition-colors hover:bg-surface-container">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="material-symbols-outlined text-error">flag</span>
                        <span className="font-label-bold text-label-bold text-primary">
                          {categoryLabel}
                        </span>
                        {report.subject && (
                          <AffiliationChip community={report.subject.community} size="sm" />
                        )}
                      </div>
                      <span className="shrink-0 font-caption text-caption text-on-surface-variant">
                        {timeAgo(report.createdAt)}
                      </span>
                    </div>

                    <div className="mb-3 rounded border-l-4 border-outline-variant bg-surface-container-low p-3">
                      <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">
                        {report.description}
                      </p>
                    </div>

                    <p className="mb-3 font-caption text-caption text-on-surface-variant">
                      Subject:{" "}
                      <strong className="text-on-surface">
                        {report.subject?.username ?? "No identifiable subject"}
                      </strong>
                      {" · "}
                      Reported by {report.reporterUsername ?? "Anonymous"}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleReview(report.id)}
                      >
                        Review
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleDismiss(report)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy || !report.subject}
                        title={report.subject ? undefined : "No identifiable account to suspend"}
                        className="border-error text-error hover:bg-error-container disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleSuspend(report)}
                      >
                        Suspend
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Audit log */}
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest lg:col-span-5">
          <div className="border-b border-outline-variant p-stack-md">
            <h2 className="font-headline-md text-headline-md text-primary">Audit Log</h2>
            <p className="mt-1 font-caption text-caption text-on-surface-variant">
              Past moderation actions, most recent first.
            </p>
          </div>
          {auditLog === null ? (
            <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
          ) : auditLog.length === 0 ? (
            <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">
              No moderation actions yet.
            </p>
          ) : (
            <ul className="max-h-[600px] divide-y divide-outline-variant overflow-y-auto">
              {auditLog.map((entry) => (
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
                    <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                      {entry.notes}
                    </p>
                    <p className="mt-1 font-caption text-caption text-outline">by {entry.moderator}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
