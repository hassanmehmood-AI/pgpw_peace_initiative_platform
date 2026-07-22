"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import type { Community } from "@/components/ui/AffiliationChip";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS, CATEGORY_VALUES } from "@/lib/validation/report";
import { timeAgo } from "@/lib/timeAgo";

type TargetType = "feed_post" | "forum_post" | "user" | "general";
type ReportStatus = "pending" | "reviewed" | "dismissed" | "suspended";
type Subject = { profileId: string; username: string; community: Community } | null;

type ReportRow = {
  id: string;
  category: string;
  description: string;
  createdAt: string;
  status: ReportStatus;
  reporterUsername: string | null;
  targetType: TargetType;
  subject: Subject;
};

const statusTabs: { value: ReportStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "suspended", label: "Suspended" },
];

const statusBadgeClass: Record<ReportStatus, string> = {
  pending: "bg-secondary-fixed text-primary",
  reviewed: "bg-surface-container-high text-on-surface-variant",
  dismissed: "bg-surface-container-high text-on-surface-variant",
  suspended: "bg-error-container text-on-error-container",
};

export default function AdminReportsPage() {
  const { session } = useSession();
  const supabase = createClient();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("pending");
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = !!session && session.role === "admin";

  const refreshReports = async (filter: ReportStatus | "all") => {
    let query = supabase
      .from("reports")
      .select("id, category, description, created_at, status, target_type, target_id, profiles!reports_reporter_id_fkey(username)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
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
      status: ReportStatus;
      target_type: TargetType;
      target_id: string | null;
      profiles: { username: string } | null;
    };
    const rows = (data ?? []) as unknown as RawRow[];

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
      ? await supabase.from("profiles").select("id, username, community_affiliation").in("id", [...subjectProfileIds])
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
        status: r.status,
        reporterUsername: r.profiles?.username ?? null,
        targetType: r.target_type,
        subject: resolveSubject(r),
      })),
    );
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      await refreshReports(statusFilter);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, statusFilter]);

  const logModerationAction = async (report: ReportRow, action: "dismiss" | "suspend", notes: string) => {
    const { error } = await supabase.from("moderation_actions").insert({
      report_id: report.id,
      moderator_id: session!.id,
      action,
      subject_id: report.subject?.profileId ?? null,
      notes,
    });
    return error;
  };

  const handleReview = async (id: string) => {
    setBusyId(id);
    setError(null);
    const { error } = await supabase.from("reports").update({ status: "reviewed" }).eq("id", id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshReports(statusFilter);
  };

  const handleDismiss = async (report: ReportRow) => {
    setBusyId(report.id);
    setError(null);
    const actionError = await logModerationAction(report, "dismiss", "Reviewed and dismissed — no violation found.");
    if (actionError) {
      setBusyId(null);
      setError(actionError.message);
      return;
    }
    const { error } = await supabase.from("reports").update({ status: "dismissed" }).eq("id", report.id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshReports(statusFilter);
  };

  const handleSuspend = async (report: ReportRow) => {
    if (!report.subject) return;
    setBusyId(report.id);
    setError(null);
    const actionError = await logModerationAction(
      report,
      "suspend",
      "Account suspended for violating platform guidelines.",
    );
    if (actionError) {
      setBusyId(null);
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
    setBusyId(null);
    if (reportError || profileError) {
      setError((reportError ?? profileError)!.message);
      return;
    }
    await refreshReports(statusFilter);
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
          All Reports
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Every report filed on the platform, filterable by status.
        </p>
      </header>

      <div className="mb-stack-md flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={
              statusFilter === tab.value
                ? "rounded-full bg-primary px-4 py-1.5 font-label-bold text-label-bold text-on-primary"
                : "rounded-full border border-outline-variant px-4 py-1.5 font-label-bold text-label-bold text-on-surface-variant hover:bg-surface-container-high"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest">
        {reports === null ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">No reports found.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {reports.map((report) => {
              const busy = busyId === report.id;
              const categoryLabel =
                CATEGORY_LABELS[report.category as (typeof CATEGORY_VALUES)[number]] ?? report.category;
              return (
                <li key={report.id} className="p-stack-md transition-colors hover:bg-surface-container">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="material-symbols-outlined text-error">flag</span>
                      <span className="font-label-bold text-label-bold text-primary">{categoryLabel}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-caption text-[11px] font-bold ${statusBadgeClass[report.status]}`}
                      >
                        {report.status[0].toUpperCase() + report.status.slice(1)}
                      </span>
                      {report.subject && <AffiliationChip community={report.subject.community} size="sm" />}
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

                  {report.status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => handleReview(report.id)}>
                        Review
                      </Button>
                      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => handleDismiss(report)}>
                        Dismiss
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy || !report.subject}
                        title={report.subject ? undefined : "No identifiable account to suspend"}
                        className="border-error text-error hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleSuspend(report)}
                      >
                        Suspend
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
