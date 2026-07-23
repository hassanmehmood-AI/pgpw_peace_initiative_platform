"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, canModerate, type Role } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { AffiliationChip, communityMeta } from "@/components/ui/AffiliationChip";
import type { Community } from "@/components/ui/AffiliationChip";
import { Avatar } from "@/components/ui/Avatar";
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

type ManagedProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  community: Community;
  role: Role;
  isSuspended: boolean;
  createdAt: string;
};

type PostQueueItem = {
  id: string;
  kind: "feed" | "forum";
  body: string;
  authorId: string;
  authorUsername: string;
  createdAt: string;
  threadTitle?: string;
};

type ContactStatus = "new" | "resolved";

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
};

const actionMeta: Record<ModerationActionType, { icon: string; label: string }> = {
  dismiss: { icon: "check_circle", label: "Dismissed" },
  warn: { icon: "warning", label: "Warned" },
  suspend: { icon: "block", label: "Suspended" },
};

const roleOptions: { value: Role; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

// Same 5 rows as the `communities` table, in registration-wizard order.
const communityOrder: Community[] = ["crip", "blood", "latin_king", "deceptacon", "neutral"];

// Bar-fill colors for the Community Breakdown panel — pulled from the same
// CSS custom properties the affiliation cards/chips use, so this stays in
// sync with the rest of the app's community color language.
const communityBarColor: Record<Community, string> = {
  crip: "var(--color-crip-blue)",
  blood: "var(--color-blood-red)",
  latin_king: "var(--color-latin-king-yellow)",
  deceptacon: "var(--color-deceptacon-purple)",
  neutral: "var(--color-neutral-gray)",
};

export default function AdminPage() {
  const { session } = useSession();
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<AdminReportRow[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  // ---- Super-admin-only state (users, content, analytics) ----------------
  const [totalPosts, setTotalPosts] = useState<number | null>(null);
  const [signupTrend, setSignupTrend] = useState<{ label: string; count: number }[] | null>(null);
  const [communityBreakdown, setCommunityBreakdown] = useState<{ community: Community; count: number }[] | null>(null);
  const [profiles, setProfiles] = useState<ManagedProfile[] | null>(null);
  const [profileSearch, setProfileSearch] = useState("");
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const [postsQueue, setPostsQueue] = useState<PostQueueItem[] | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<ContactMessageRow[] | null>(null);

  const isModerator = !!session && canModerate(session.role);
  const isSuperAdmin = !!session && session.role === "admin";

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
      .order("created_at", { ascending: false })
      .limit(5);

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
      .limit(5);

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

  const refreshPostCount = async () => {
    const [feed, forum] = await Promise.all([
      supabase.from("feed_posts").select("*", { count: "exact", head: true }),
      supabase.from("forum_posts").select("*", { count: "exact", head: true }),
    ]);
    setTotalPosts((feed.count ?? 0) + (forum.count ?? 0));
  };

  const refreshSignupTrend = async () => {
    const days = 14;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const { data } = await supabase.from("profiles").select("created_at").gte("created_at", start.toISOString());

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of data ?? []) {
      const key = row.created_at.slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    setSignupTrend(
      [...buckets.entries()].map(([key, count]) => ({
        label: new Date(key).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
        count,
      })),
    );
  };

  const refreshCommunityBreakdown = async () => {
    const counts = await Promise.all(
      communityOrder.map((community) =>
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("community_affiliation", community),
      ),
    );
    setCommunityBreakdown(communityOrder.map((community, i) => ({ community, count: counts[i].count ?? 0 })));
  };

  const refreshProfiles = async (search: string) => {
    let query = supabase
      .from("profiles")
      .select("id, username, avatar_url, community_affiliation, role, is_suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (search.trim()) query = query.ilike("username", `%${search.trim()}%`);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      setProfiles([]);
      return;
    }
    setProfiles(
      (data ?? []).map((p) => ({
        id: p.id,
        username: p.username,
        avatarUrl: p.avatar_url,
        community: (p.community_affiliation ?? "neutral") as Community,
        role: p.role,
        isSuspended: p.is_suspended,
        createdAt: p.created_at,
      })),
    );
  };

  const refreshPostsQueue = async () => {
    const [{ data: feedRows }, { data: forumRows }] = await Promise.all([
      supabase
        .from("feed_posts")
        .select("id, body, created_at, author:profiles!feed_posts_author_id_fkey(id, username)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("forum_posts")
        .select("id, body, created_at, author:profiles!forum_posts_author_id_fkey(id, username), thread:forum_threads(title)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    type FeedRow = { id: string; body: string; created_at: string; author: { id: string; username: string } | null };
    type ForumRow = {
      id: string;
      body: string;
      created_at: string;
      author: { id: string; username: string } | null;
      thread: { title: string } | null;
    };

    const feedItems: PostQueueItem[] = ((feedRows ?? []) as unknown as FeedRow[]).map((r) => ({
      id: r.id,
      kind: "feed",
      body: r.body,
      createdAt: r.created_at,
      authorId: r.author?.id ?? "",
      authorUsername: r.author?.username ?? "Unknown",
    }));
    const forumItems: PostQueueItem[] = ((forumRows ?? []) as unknown as ForumRow[]).map((r) => ({
      id: r.id,
      kind: "forum",
      body: r.body,
      createdAt: r.created_at,
      authorId: r.author?.id ?? "",
      authorUsername: r.author?.username ?? "Unknown",
      threadTitle: r.thread?.title,
    }));

    setPostsQueue([...feedItems, ...forumItems].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5));
  };

  const refreshContactMessages = async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id, name, email, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      setError(error.message);
      setContactMessages([]);
      return;
    }
    const rows: ContactMessageRow[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
    }));

    // Viewing the dashboard is what clears the "New" badge — no separate
    // "Mark Resolved" click. Whatever's still "new" in this batch just got
    // seen, so flip it server-side and reflect that immediately.
    const newIds = rows.filter((r) => r.status === "new").map((r) => r.id);
    if (newIds.length > 0) {
      await supabase.from("contact_messages").update({ status: "resolved" }).in("id", newIds);
    }
    setContactMessages(
      rows.map((r) => (newIds.includes(r.id) ? { ...r, status: "resolved" } : r)),
    );
  };

  useEffect(() => {
    if (!isModerator) return;
    (async () => {
      await Promise.all([refreshStats(), refreshReports(), refreshAuditLog()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModerator]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      await Promise.all([
        refreshPostCount(),
        refreshSignupTrend(),
        refreshCommunityBreakdown(),
        refreshPostsQueue(),
        refreshContactMessages(),
      ]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // Debounced so every keystroke in the search box doesn't fire a query;
  // also covers the initial (empty-search) load once isSuperAdmin flips true.
  useEffect(() => {
    if (!isSuperAdmin) return;
    const t = setTimeout(() => {
      refreshProfiles(profileSearch);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, profileSearch]);

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
              The Admin Dashboard is restricted to Administrators.
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

  const handleRoleChange = async (profile: ManagedProfile, role: Role) => {
    if (profile.id === session.id) return; // can't change your own role
    setBusyProfileId(profile.id);
    setError(null);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profile.id);
    setBusyProfileId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshProfiles(profileSearch);
  };

  const handleToggleSuspend = async (profile: ManagedProfile) => {
    if (profile.id === session.id) return; // can't suspend yourself
    setBusyProfileId(profile.id);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update(
        profile.isSuspended
          ? { is_suspended: false, suspended_at: null }
          : { is_suspended: true, suspended_at: new Date().toISOString() },
      )
      .eq("id", profile.id);
    setBusyProfileId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await Promise.all([refreshProfiles(profileSearch), refreshStats()]);
  };

  const handleDeletePost = async (post: PostQueueItem) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setBusyPostId(post.id);
    setError(null);
    const table = post.kind === "feed" ? "feed_posts" : "forum_posts";
    const { error } = await supabase.from(table).delete().eq("id", post.id);
    setBusyPostId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await Promise.all([refreshPostsQueue(), refreshPostCount()]);
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
        ...(isSuperAdmin && totalPosts !== null
          ? [{ icon: "article", label: "Total Posts", value: totalPosts.toLocaleString(), trend: "Feed + Forums" }]
          : []),
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
          {isSuperAdmin ? "Super Admin Dashboard" : "Admin & Moderation"}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {isSuperAdmin
            ? "Full platform oversight — members, content, and safety."
            : "Platform oversight and safety management."}
        </p>
      </header>

      {error && (
        <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
          {error}
        </p>
      )}

      {/* Stats grid */}
      <section className="mb-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
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

      {isSuperAdmin && (
        <>
          {/* Signup trend + Community breakdown */}
          <section className="mb-stack-lg grid grid-cols-1 gap-gutter lg:grid-cols-3">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-stack-md lg:col-span-2">
              <h2 className="mb-1 font-headline-md text-headline-md text-primary">Signups — Last 14 Days</h2>
              <p className="mb-stack-md font-caption text-caption text-on-surface-variant">
                New member registrations by day.
              </p>
              {signupTrend === null ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Loading…</p>
              ) : (
                <div className="flex h-48 items-end gap-2">
                  {signupTrend.map((day, i) => {
                    const max = Math.max(1, ...signupTrend.map((d) => d.count));
                    const heightPct = Math.max(6, Math.round((day.count / max) * 100));
                    const isToday = i === signupTrend.length - 1;
                    return (
                      <div key={day.label + i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                        <span className="font-caption text-[10px] text-on-surface-variant">
                          {day.count > 0 ? day.count : ""}
                        </span>
                        <div
                          className={`w-full rounded-t-md transition-colors ${
                            isToday ? "bg-primary" : "bg-primary/15 hover:bg-primary/30"
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="font-caption text-[10px] text-on-surface-variant">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-stack-md">
              <h2 className="mb-stack-md font-headline-md text-headline-md text-primary">Community Breakdown</h2>
              {communityBreakdown === null ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Loading…</p>
              ) : (
                <ul className="flex flex-col gap-stack-sm">
                  {communityBreakdown.map(({ community, count }) => {
                    const total = communityBreakdown.reduce((sum, c) => sum + c.count, 0) || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <li key={community}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-label-bold text-label-bold text-on-surface">
                            {communityMeta[community].label}
                          </span>
                          <span className="font-caption text-caption text-on-surface-variant">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: communityBarColor[community] }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* User Management */}
          <section className="mb-stack-lg rounded-lg border border-outline-variant bg-surface-container-lowest">
            <div className="flex flex-col gap-3 border-b border-outline-variant p-stack-md sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">User Management</h2>
                <p className="mt-1 font-caption text-caption text-on-surface-variant">
                  Search, promote, or suspend members.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                    search
                  </span>
                  <input
                    type="text"
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    placeholder="Search username…"
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pr-3 pl-9 font-body-sm text-body-sm outline-none transition-colors focus:border-2 focus:border-primary"
                  />
                </div>
                <Link
                  href="/admin/users"
                  className="shrink-0 font-label-bold text-label-bold text-primary hover:underline"
                >
                  View All
                </Link>
              </div>
            </div>

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
                      const busy = busyProfileId === profile.id;
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

          {/* Post moderation */}
          <section className="mb-stack-lg rounded-lg border border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant p-stack-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">Recent Posts</h2>
                <p className="mt-1 font-caption text-caption text-on-surface-variant">
                  Latest activity across the Feed and Forums.
                </p>
              </div>
              <Link
                href="/admin/posts"
                className="shrink-0 font-label-bold text-label-bold text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            {postsQueue === null ? (
              <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
            ) : postsQueue.length === 0 ? (
              <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">No posts yet.</p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {postsQueue.map((post) => {
                  const busy = busyPostId === post.id;
                  return (
                    <li key={`${post.kind}-${post.id}`} className="flex items-start justify-between gap-4 p-stack-md">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-surface-container-high px-2 py-0.5 font-caption text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
                            {post.kind === "feed" ? "Feed" : "Forum"}
                          </span>
                          {post.threadTitle && (
                            <span className="truncate font-caption text-caption text-on-surface-variant">
                              in {post.threadTitle}
                            </span>
                          )}
                          <span className="ml-auto shrink-0 font-caption text-caption text-on-surface-variant">
                            {timeAgo(post.createdAt)}
                          </span>
                        </div>
                        <p className="line-clamp-2 font-body-md text-body-md text-on-surface">{post.body}</p>
                        <p className="mt-1 font-caption text-caption text-on-surface-variant">
                          by {post.authorUsername}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        className="shrink-0 border-error text-error hover:bg-error-container disabled:opacity-50"
                        onClick={() => handleDeletePost(post)}
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Contact requests */}
          <section className="mb-stack-lg rounded-lg border border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant p-stack-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">Contact Requests</h2>
                <p className="mt-1 font-caption text-caption text-on-surface-variant">
                  Messages sent through the public Contact Us form.
                </p>
              </div>
              <Link
                href="/admin/contact"
                className="shrink-0 font-label-bold text-label-bold text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            {contactMessages === null ? (
              <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
            ) : contactMessages.length === 0 ? (
              <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">No messages yet.</p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {contactMessages.map((message) => (
                  <li key={message.id} className="p-stack-md">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-label-bold text-label-bold text-on-surface">{message.name}</span>
                      <span className="font-caption text-caption text-on-surface-variant">{message.email}</span>
                      {message.status === "new" && (
                        <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 font-caption text-[11px] font-bold text-primary">
                          New
                        </span>
                      )}
                      <span className="ml-auto shrink-0 font-caption text-caption text-on-surface-variant">
                        {timeAgo(message.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 font-body-md text-body-md text-on-surface">{message.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* Reported content queue */}
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest lg:col-span-7">
          <div className="halftone-bg flex items-center justify-between gap-3 border-b border-outline-variant p-stack-md">
            <h2 className="font-headline-md text-headline-md text-primary">Reported Content</h2>
            <Link
              href="/admin/reports"
              className="shrink-0 font-label-bold text-label-bold text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          {reports === null ? (
            <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">
              Queue is clear — no pending reports.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant">
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
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant p-stack-md">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary">Audit Log</h2>
              <p className="mt-1 font-caption text-caption text-on-surface-variant">
                Past moderation actions, most recent first.
              </p>
            </div>
            <Link
              href="/admin/audit-log"
              className="shrink-0 font-label-bold text-label-bold text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          {auditLog === null ? (
            <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
          ) : auditLog.length === 0 ? (
            <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">
              No moderation actions yet.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant">
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
