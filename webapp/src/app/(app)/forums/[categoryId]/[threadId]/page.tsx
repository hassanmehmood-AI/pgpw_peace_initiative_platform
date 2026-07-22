"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import type { Community } from "@/components/ui/AffiliationChip";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";
import { timeAgo } from "@/lib/timeAgo";
import { Avatar } from "@/components/ui/Avatar";

// ---------------------------------------------------------------------------
// Types — shaped from live `forum_threads`/`forum_posts` + joined `profiles`
// ---------------------------------------------------------------------------
type Thread = {
  id: string;
  title: string;
  createdAt: string;
  author: string;
  authorCommunity: Community;
  authorAvatarUrl?: string;
};

type Post = {
  id: string;
  author: string;
  authorCommunity: Community;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
};

// Raw shapes as actually returned at runtime. supabase-js can't infer embed
// cardinality without generated DB types, so it types every embed as an
// array by default — `profiles` is really a single object here (many-to-one
// via `author_id`), which is why fetched rows get cast to these instead of
// trusted verbatim.
type PostQueryRow = {
  id: string;
  body: string;
  created_at: string;
  profiles: { username: string; community_affiliation: Community | null; avatar_url: string | null } | null;
};

type ThreadQueryRow = {
  id: string;
  title: string;
  created_at: string;
  profiles: { username: string; community_affiliation: Community | null; avatar_url: string | null } | null;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ThreadDetailPage() {
  const params = useParams();
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : "";
  const threadId   = typeof params.threadId   === "string" ? params.threadId   : "";
  const supabase = useMemo(() => createClient(), []);
  const { session } = useSession();

  const [categoryTitle, setCategoryTitle] = useState<string>("Forums");
  const [thread, setThread] = useState<Thread | null | undefined>(undefined); // undefined = loading
  const [posts, setPosts] = useState<Post[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("forum_posts")
      .select("id, body, created_at, profiles(username, community_affiliation, avatar_url)")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    const rows = (data ?? []) as unknown as PostQueryRow[];
    const mapped: Post[] = rows.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.created_at,
      author: p.profiles?.username ?? "Unknown",
      authorCommunity: p.profiles?.community_affiliation ?? "neutral",
      authorAvatarUrl: p.profiles?.avatar_url ?? undefined,
    }));
    setPosts(mapped);
  };

  useEffect(() => {
    if (!threadId) return;
    let active = true;

    (async () => {
      const { data: categoryRow } = await supabase
        .from("forum_categories")
        .select("title")
        .eq("id", categoryId)
        .maybeSingle();
      if (active && categoryRow) setCategoryTitle(categoryRow.title);

      const { data: threadRow } = await supabase
        .from("forum_threads")
        .select("id, title, created_at, profiles(username, community_affiliation, avatar_url)")
        .eq("id", threadId)
        .maybeSingle();

      if (!active) return;
      if (!threadRow) {
        setThread(null);
        return;
      }
      const row = threadRow as unknown as ThreadQueryRow;
      setThread({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        author: row.profiles?.username ?? "Unknown",
        authorCommunity: row.profiles?.community_affiliation ?? "neutral",
        authorAvatarUrl: row.profiles?.avatar_url ?? undefined,
      });

      await loadPosts();
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, categoryId, threadId]);

  // ---- Loading ---------------------------------------------------------
  if (thread === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl px-margin-mobile py-20 text-center md:px-gutter">
        <p className="font-body-md text-body-md text-on-surface-variant">Loading thread…</p>
      </div>
    );
  }

  // ---- Not found -----------------------------------------------------------
  if (!thread) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-margin-mobile py-20 text-center md:px-gutter">
        <span className="material-symbols-outlined text-[64px] text-outline">
          forum
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">
          Thread not found
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          This thread doesn&apos;t exist or may have been removed.
        </p>
        <Button href={`/forums/${categoryId}`} variant="secondary">
          ← Back to {categoryTitle}
        </Button>
      </div>
    );
  }

  // ---- Handlers ------------------------------------------------------------
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (replyBody.trim().length < 5 || !session) return;

    setPosting(true);
    setError(null);

    const { error } = await supabase
      .from("forum_posts")
      .insert({ thread_id: threadId, author_id: session.id, body: replyBody.trim() });

    setPosting(false);
    if (error) {
      setError(error.message);
      return;
    }

    setReplyBody("");
    await loadPosts();
  };

  const canReply = replyBody.trim().length >= 5;

  // ---- Render --------------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-3xl px-margin-mobile py-stack-lg md:px-gutter">

      {/* Breadcrumb */}
      <nav className="mb-stack-md flex items-center gap-2 flex-wrap font-caption text-caption text-on-surface-variant">
        <Link href="/forums" className="hover:text-primary transition-colors">
          Forums
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link href={`/forums/${categoryId}`} className="hover:text-primary transition-colors">
          {categoryTitle}
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-primary line-clamp-1">{thread.title}</span>
      </nav>

      {/* Thread header */}
      <header className="mb-stack-lg rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
        <h1 className="mb-3 font-headline-lg-mobile text-headline-lg-mobile text-primary md:font-headline-lg md:text-headline-lg">
          {thread.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-on-surface-variant">
          <span className="font-caption text-caption">by {thread.author}</span>
          <AffiliationChip community={thread.authorCommunity} size="sm" />
          <span className="font-caption text-caption text-outline">
            · {timeAgo(thread.createdAt)}
          </span>
          <span className="font-caption text-caption">·</span>
          <span className="flex items-center gap-1 font-caption text-caption">
            <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
            {posts.length} {posts.length === 1 ? "reply" : "replies"}
          </span>
        </div>
      </header>

      {/* Posts */}
      <div className="mb-stack-lg flex flex-col gap-stack-md">
        {posts.map((post, idx) => (
          <PostCard key={post.id} post={post} postNumber={idx + 1} />
        ))}
        {posts.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline">
              chat_bubble_outline
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              No replies yet — be the first!
            </p>
          </div>
        )}
      </div>

      {/* Reply composer */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="mb-4 font-headline-md text-headline-md text-primary">
          Post a Reply
        </h2>
        {session && (
          <div className="mb-3 flex items-center gap-2">
            <Avatar name={session.name} community={session.community} avatarUrl={session.avatarUrl} size="h-9 w-9" />
            <div>
              <p className="font-label-bold text-label-bold text-on-surface">
                {session.name}
              </p>
              <AffiliationChip community={session.community} size="sm" />
            </div>
          </div>
        )}
        {error && (
          <p className="mb-3 rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleReply} className="flex flex-col gap-3">
          <textarea
            id="reply-composer"
            placeholder="Share your thoughts…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary"
          />
          {replyBody.trim().length > 0 && replyBody.trim().length < 5 && (
            <p className="font-caption text-caption text-error">
              Reply must be at least 5 characters
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={!canReply || posting}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? "Posting…" : "Post Reply"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------
function PostCard({
  post,
  postNumber,
}: {
  post: Post;
  postNumber: number;
}) {
  return (
    <article className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
      {/* Author row */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={post.author} community={post.authorCommunity} avatarUrl={post.authorAvatarUrl} size="h-9 w-9" />
          <div>
            <p className="font-label-bold text-label-bold text-on-surface">
              {post.author}
            </p>
            <AffiliationChip community={post.authorCommunity} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-caption text-caption text-outline">
            #{postNumber} · {timeAgo(post.createdAt)}
          </span>
        </div>
      </div>

      {/* Body */}
      <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
        {post.body}
      </p>
    </article>
  );
}

export const dynamic = "force-dynamic";
