"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";

type PostItem = {
  id: string;
  kind: "feed" | "forum";
  body: string;
  authorUsername: string;
  createdAt: string;
  threadTitle?: string;
};

// There's no single "posts" table — feed and forum posts live separately and
// each side is paginated on its own `perSide` limit, then merged/sorted and
// trimmed client-side. "Load More" just grows `perSide` and re-fetches both.
// Fine at this app's scale; a true keyset-paginated union isn't worth the
// complexity yet.
const PAGE_SIZE = 20;

export default function AdminPostsPage() {
  const { session } = useSession();
  const supabase = createClient();

  const [posts, setPosts] = useState<PostItem[] | null>(null);
  const [perSide, setPerSide] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = !!session && session.role === "admin";

  const loadPosts = async (limit: number) => {
    const [{ data: feedRows }, { data: forumRows }] = await Promise.all([
      supabase
        .from("feed_posts")
        .select("id, body, created_at, author:profiles!feed_posts_author_id_fkey(username)")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("forum_posts")
        .select("id, body, created_at, author:profiles!forum_posts_author_id_fkey(username), thread:forum_threads(title)")
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    type FeedRow = { id: string; body: string; created_at: string; author: { username: string } | null };
    type ForumRow = {
      id: string;
      body: string;
      created_at: string;
      author: { username: string } | null;
      thread: { title: string } | null;
    };

    const feedItems: PostItem[] = ((feedRows ?? []) as unknown as FeedRow[]).map((r) => ({
      id: r.id,
      kind: "feed",
      body: r.body,
      createdAt: r.created_at,
      authorUsername: r.author?.username ?? "Unknown",
    }));
    const forumItems: PostItem[] = ((forumRows ?? []) as unknown as ForumRow[]).map((r) => ({
      id: r.id,
      kind: "forum",
      body: r.body,
      createdAt: r.created_at,
      authorUsername: r.author?.username ?? "Unknown",
      threadTitle: r.thread?.title,
    }));

    // More may still exist on either side even after merging+trimming to
    // `limit` — if either table returned a full page, assume there's more.
    setHasMore((feedRows?.length ?? 0) === limit || (forumRows?.length ?? 0) === limit);
    setPosts([...feedItems, ...forumItems].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit));
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      await loadPosts(perSide);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const next = perSide + PAGE_SIZE;
    await loadPosts(next);
    setPerSide(next);
    setLoadingMore(false);
  };

  const handleDelete = async (post: PostItem) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setBusyId(post.id);
    setError(null);
    const table = post.kind === "feed" ? "feed_posts" : "forum_posts";
    const { error } = await supabase.from(table).delete().eq("id", post.id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setPosts((prev) => prev?.filter((p) => !(p.id === post.id && p.kind === post.kind)) ?? null);
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
          All Posts
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Every post across the Feed and Forums, most recent first.
        </p>
      </header>

      {error && (
        <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest">
        {posts === null ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">No posts yet.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {posts.map((post) => {
              const busy = busyId === post.id;
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
                    <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{post.body}</p>
                    <p className="mt-1 font-caption text-caption text-on-surface-variant">by {post.authorUsername}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    className="shrink-0 border-error text-error hover:bg-error-container disabled:opacity-50"
                    onClick={() => handleDelete(post)}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {posts !== null && hasMore && (
        <div className="mt-stack-md flex justify-center">
          <Button type="button" variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
