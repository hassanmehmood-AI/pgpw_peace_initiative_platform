"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import type { Community } from "@/components/ui/AffiliationChip";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";
import { timeAgo } from "@/lib/timeAgo";

// ---------------------------------------------------------------------------
// Types — shaped from live `forum_threads` + joined `profiles` queries
// ---------------------------------------------------------------------------
type Category = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

type ThreadRow = {
  id: string;
  title: string;
  createdAt: string;
  author: string;
  authorCommunity: Community;
  replyCount: number;
};

// Shape of a raw `forum_threads` row as actually returned at runtime.
// supabase-js can't infer embed cardinality without generated DB types, so
// it types every embed as an array by default — `profiles` is really a
// single object here (many-to-one via `forum_threads.author_id`), which is
// why the fetched rows get cast to this type instead of trusted verbatim.
type ThreadQueryRow = {
  id: string;
  title: string;
  created_at: string;
  profiles: { username: string; community_affiliation: Community | null } | null;
  forum_posts: { count: number }[];
};

export default function CategoryPage() {
  const params = useParams();
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : "";
  const supabase = useMemo(() => createClient(), []);
  const { session } = useSession();

  const [category, setCategory] = useState<Category | null | undefined>(undefined); // undefined = loading
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category itself only needs to load once per categoryId.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("forum_categories")
        .select("id, title, description, icon")
        .eq("id", categoryId)
        .maybeSingle();
      if (active) setCategory(data ?? null);
    })();
    return () => {
      active = false;
    };
  }, [supabase, categoryId]);

  // Thread list re-fetches whenever the search term (ilike, DB-side) changes.
  useEffect(() => {
    if (!categoryId) return;
    let active = true;

    (async () => {
      setError(null);
      let query = supabase
        .from("forum_threads")
        .select("id, title, created_at, profiles(username, community_affiliation), forum_posts(count)")
        .eq("category_id", categoryId);

      const q = search.trim();
      if (q) query = query.ilike("title", `%${q}%`);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setError(error.message);
        setThreads([]);
        return;
      }

      const rows = (data ?? []) as unknown as ThreadQueryRow[];
      const mapped: ThreadRow[] = rows.map((t) => ({
        id: t.id,
        title: t.title,
        createdAt: t.created_at,
        author: t.profiles?.username ?? "Unknown",
        authorCommunity: t.profiles?.community_affiliation ?? "neutral",
        replyCount: t.forum_posts?.[0]?.count ?? 0,
      }));
      setThreads(mapped);
    })();

    return () => {
      active = false;
    };
  }, [supabase, categoryId, search]);

  // ---- Not found -----------------------------------------------------------
  if (category === null) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-margin-mobile py-20 text-center md:px-gutter">
        <span className="material-symbols-outlined text-[64px] text-outline">
          forum
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">
          Category not found
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          This forum category doesn&apos;t exist or may have been removed.
        </p>
        <Button href="/forums" variant="secondary">
          ← Back to Forums
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-margin-mobile py-stack-lg md:px-margin-desktop">

      {/* Breadcrumb */}
      <nav className="mb-stack-md flex items-center gap-2 font-caption text-caption text-on-surface-variant">
        <Link href="/forums" className="hover:text-primary transition-colors">
          Forums
        </Link>
        <span className="material-symbols-outlined text-[14px]">
          chevron_right
        </span>
        <span className="text-primary">{category?.title ?? ""}</span>
      </nav>

      {/* Category header */}
      <header className="mb-stack-lg flex flex-col gap-stack-md border-b border-outline-variant pb-stack-md md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-surface-container-low p-3 text-primary">
            <span className="material-symbols-outlined text-3xl">
              {category?.icon}
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">
              {category?.title}
            </h1>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              {category?.description}
            </p>
            <p className="mt-1 font-caption text-caption text-outline">
              {threads.length} topics
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setModalOpen(true)}
          className="shrink-0 gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Topic
        </Button>
      </header>

      {/* Search */}
      <div className="mb-stack-md relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          id="thread-search"
          type="text"
          placeholder="Search threads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 font-body-md text-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Thread list */}
      {category === undefined ? (
        <p className="py-16 text-center font-body-md text-body-md text-on-surface-variant">
          Loading threads…
        </p>
      ) : error ? (
        <p className="py-16 text-center font-body-md text-body-md text-error">{error}</p>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline">
            {search ? "search_off" : "chat_bubble_outline"}
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {search
              ? `No threads match "${search}"`
              : "No threads yet. Be the first to post!"}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="font-label-bold text-label-bold text-primary underline underline-offset-2"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-outline-variant rounded-lg border border-outline-variant bg-surface-container-lowest">
          {threads.map((thread) => (
            <ThreadRowView key={thread.id} thread={thread} categoryId={categoryId} />
          ))}
        </div>
      )}

      {/* New Topic modal */}
      {modalOpen && session && category && (
        <NewThreadModal
          categoryId={categoryId}
          categoryTitle={category.title}
          authorId={session.id}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ThreadRowView
// ---------------------------------------------------------------------------
function ThreadRowView({
  thread,
  categoryId,
}: {
  thread: ThreadRow;
  categoryId: string;
}) {
  return (
    <Link
      href={`/forums/${categoryId}/${thread.id}`}
      className="group flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-surface-container-low md:flex-row md:items-center md:gap-4"
    >
      {/* Left: title + meta */}
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="font-label-bold text-label-bold text-on-surface transition-colors group-hover:text-primary">
          {thread.title}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-caption text-caption text-on-surface-variant">
            by {thread.author}
          </span>
          <AffiliationChip community={thread.authorCommunity} size="sm" />
          <span className="font-caption text-caption text-outline">
            · {timeAgo(thread.createdAt)}
          </span>
        </div>
      </div>

      {/* Right: stats */}
      <div className="flex shrink-0 items-center gap-4 font-caption text-caption text-on-surface-variant">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">
            chat_bubble_outline
          </span>
          {thread.replyCount}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// NewThreadModal — category is pre-selected, inserts thread + its first post
// ---------------------------------------------------------------------------
function NewThreadModal({
  categoryId,
  categoryTitle,
  authorId,
  onClose,
}: {
  categoryId: string;
  categoryTitle: string;
  authorId: string;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = title.trim().length >= 5 && body.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const { data: thread, error: threadError } = await supabase
      .from("forum_threads")
      .insert({ category_id: categoryId, author_id: authorId, title: title.trim() })
      .select("id")
      .single();

    if (threadError || !thread) {
      setError(threadError?.message ?? "Couldn't create the thread.");
      setSubmitting(false);
      return;
    }

    const { error: postError } = await supabase
      .from("forum_posts")
      .insert({ thread_id: thread.id, author_id: authorId, body: body.trim() });

    if (postError) {
      setError(postError.message);
      setSubmitting(false);
      return;
    }

    router.push(`/forums/${categoryId}/${thread.id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-margin-mobile backdrop-blur-sm md:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest ambient-shadow">
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">New Topic</h2>
            <p className="font-caption text-caption text-on-surface-variant">in {categoryTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md p-6">
          {error && (
            <p className="rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="thread-title" className="font-label-bold text-label-bold text-on-surface">
              Title
            </label>
            <input
              id="thread-title"
              type="text"
              placeholder="What's this thread about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            />
            {title.trim().length > 0 && title.trim().length < 5 && (
              <p className="font-caption text-caption text-error">Title must be at least 5 characters</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="thread-body" className="font-label-bold text-label-bold text-on-surface">
              Content
            </label>
            <textarea
              id="thread-body"
              placeholder="Share your thoughts…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="resize-none rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            />
            {body.trim().length > 0 && body.trim().length < 10 && (
              <p className="font-caption text-caption text-error">Content must be at least 10 characters</p>
            )}
          </div>

          <div className="flex justify-end gap-stack-sm pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit || submitting}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting…" : "Post Topic"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Needed so Next.js generates the route for any categoryId
export const dynamic = "force-dynamic";
