"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import type { Community } from "@/components/ui/AffiliationChip";
import { useSession } from "@/lib/session";
import { Avatar } from "@/components/ui/Avatar";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS, CATEGORY_VALUES, reportSchema } from "@/lib/validation/report";
import { timeAgo } from "@/lib/timeAgo";

// ---------------------------------------------------------------------------
// Types — shaped from live `feed_posts` (+ joined `profiles`, aggregate
// counts from `post_likes`/`post_comments`) queries
// ---------------------------------------------------------------------------
type FeedPostRow = {
  id: string;
  authorId: string;
  author: string;
  authorCommunity: Community;
  authorAvatarUrl?: string;
  createdAt: string;
  body: string;
  likeCount: number;
  commentCount: number;
  mediaUrl: string | null;
  mediaType: "image" | null;
};

type CommentRow = {
  id: string;
  author: string;
  authorCommunity: Community;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
};

type TrendingRow = {
  id: string;
  author: string;
  excerpt: string;
  likeCount: number;
  commentCount: number;
};

type LiveChatMessage = {
  id: string;
  authorId: string;
  author: string;
  body: string;
};

// Raw shapes as actually returned at runtime. supabase-js can't infer embed
// cardinality without generated DB types, so it types every embed as an
// array by default — `profiles` is really a single object here (many-to-one
// via `author_id`/`user_id`), which is why fetched rows get cast to these
// instead of trusted verbatim (same gotcha as Phase B3's forum queries).
type FeedPostQueryRow = {
  id: string;
  body: string;
  created_at: string;
  media_url: string | null;
  media_type: "image" | null;
  profiles: { id: string; username: string; community_affiliation: Community | null; avatar_url: string | null } | null;
  post_likes: { count: number }[];
  post_comments: { count: number }[];
};

type CommentQueryRow = {
  id: string;
  body: string;
  created_at: string;
  profiles: { username: string; community_affiliation: Community | null; avatar_url: string | null } | null;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function FeedPage() {
  const { session } = useSession();
  const supabase = useMemo(() => createClient(), []);

  // Feed state
  const [posts, setPosts] = useState<FeedPostRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Comment thread state (lazily loaded per post)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentRow[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  // Composer state
  const [composerText, setComposerText] = useState("");
  const [posting, setPosting] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; type: "image"; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);

  // Trending — real "most-liked/commented in the last 72h" query
  const [trending, setTrending] = useState<TrendingRow[] | null>(null);

  // Live Hub chat — real `chat_messages` table, live via Realtime broadcast
  const [liveMessages, setLiveMessages] = useState<LiveChatMessage[]>([]);
  const [liveInput, setLiveInput] = useState("");
  const [onlineCount, setOnlineCount] = useState(1);

  // ---- Data loading ----------------------------------------------------

  const refreshPosts = async () => {
    const { data, error } = await supabase
      .from("feed_posts")
      .select("id, body, created_at, media_url, media_type, profiles!feed_posts_author_id_fkey(id, username, community_affiliation, avatar_url), post_likes(count), post_comments(count)")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setPosts([]);
      return;
    }

    const rows = (data ?? []) as unknown as FeedPostQueryRow[];
    setPosts(
      rows.map((p) => ({
        id: p.id,
        authorId: p.profiles?.id ?? "",
        author: p.profiles?.username ?? "Unknown",
        authorCommunity: p.profiles?.community_affiliation ?? "neutral",
        authorAvatarUrl: p.profiles?.avatar_url ?? undefined,
        createdAt: p.created_at,
        body: p.body,
        likeCount: p.post_likes?.[0]?.count ?? 0,
        commentCount: p.post_comments?.[0]?.count ?? 0,
        mediaUrl: p.media_url,
        mediaType: p.media_type,
      })),
    );

    if (session) {
      const [{ data: myLikes }, { data: mySaves }, { data: myReports }] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", session.id),
        supabase.from("post_saves").select("post_id").eq("user_id", session.id),
        supabase
          .from("reports")
          .select("target_id")
          .eq("reporter_id", session.id)
          .eq("target_type", "feed_post"),
      ]);
      setLikedIds(new Set((myLikes ?? []).map((l: { post_id: string }) => l.post_id)));
      setSavedIds(new Set((mySaves ?? []).map((s: { post_id: string }) => s.post_id)));
      setReportedIds(new Set((myReports ?? []).map((r: { target_id: string }) => r.target_id)));
    }
  };

  const refreshTrending = async () => {
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("feed_posts")
      .select("id, body, profiles!feed_posts_author_id_fkey(username), post_likes(count), post_comments(count)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30);

    type Row = {
      id: string;
      body: string;
      profiles: { username: string } | null;
      post_likes: { count: number }[];
      post_comments: { count: number }[];
    };
    const rows = (data ?? []) as unknown as Row[];
    const ranked = rows
      .map((p) => ({
        id: p.id,
        author: p.profiles?.username ?? "Unknown",
        excerpt: p.body.length > 80 ? `${p.body.slice(0, 80)}…` : p.body,
        likeCount: p.post_likes?.[0]?.count ?? 0,
        commentCount: p.post_comments?.[0]?.count ?? 0,
      }))
      .sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
      .slice(0, 4);
    setTrending(ranked);
  };

  useEffect(() => {
    (async () => {
      await refreshPosts();
      await refreshTrending();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, session?.id]);

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, body, created_at, profiles(username, community_affiliation, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    const rows = (data ?? []) as unknown as CommentQueryRow[];
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: rows.map((c) => ({
        id: c.id,
        author: c.profiles?.username ?? "Unknown",
        authorCommunity: c.profiles?.community_affiliation ?? "neutral",
        authorAvatarUrl: c.profiles?.avatar_url ?? undefined,
        body: c.body,
        createdAt: c.created_at,
      })),
    }));
  };

  // Live Hub — real chat_messages table, live via Realtime broadcast, plus
  // a Presence channel for the "N Online" count.
  useEffect(() => {
    if (!session) return;
    // Captured as a plain const so nested async closures below keep the
    // non-null narrowing — TS doesn't carry the `if (!session) return`
    // guard's narrowing into functions defined further down the closure.
    const currentSession = session;
    let active = true;
    const authorCache = new Map<string, string>();

    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, author_id, body, profiles(username)")
        .eq("room", "live_hub")
        .order("created_at", { ascending: true })
        .limit(30);

      if (!active) return;
      type Row = { id: string; author_id: string; body: string; profiles: { username: string } | null };
      const rows = (data ?? []) as unknown as Row[];
      rows.forEach((r) => {
        if (r.profiles?.username) authorCache.set(r.author_id, r.profiles.username);
      });
      setLiveMessages(
        rows.map((r) => ({ id: r.id, authorId: r.author_id, author: r.profiles?.username ?? "Unknown", body: r.body })),
      );
    })();

    const chatChannel = supabase
      .channel("chat_messages:live_hub")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: "room=eq.live_hub" },
        async (payload) => {
          const row = payload.new as { id: string; author_id: string; body: string };
          if (!active) return;

          let author = authorCache.get(row.author_id);
          if (!author) {
            if (row.author_id === currentSession.id) {
              author = currentSession.name;
            } else {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", row.author_id)
                .maybeSingle();
              author = (profile?.username as string | undefined) ?? "Unknown";
            }
            authorCache.set(row.author_id, author);
          }

          if (!active) return;
          setLiveMessages((prev) => [...prev, { id: row.id, authorId: row.author_id, author, body: row.body }]);
        },
      )
      .subscribe();

    // Presence — track this tab in the Live Hub room; count of unique
    // tracked users across all connected clients is the "N Online" figure.
    const presenceChannel = supabase.channel("presence:live_hub", {
      config: { presence: { key: currentSession.id } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        if (!active) return;
        const state = presenceChannel.presenceState();
        setOnlineCount(Math.max(1, Object.keys(state).length));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: currentSession.id });
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [supabase, session]);

  // ---- Handlers ------------------------------------------------------------

  const handlePost = async () => {
    if (!composerText.trim() || !session) return;
    setPosting(true);
    const { error } = await supabase.from("feed_posts").insert({
      author_id: session.id,
      body: composerText.trim(),
      media_url: attachment?.url ?? null,
      media_type: attachment?.type ?? null,
    });
    setPosting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setComposerText("");
    setAttachment(null);
    await refreshPosts();
  };

  const MEDIA_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
  // 30MB matches the feed-media bucket's file_size_limit — checked
  // client-side too so a rejected upload doesn't cost a round trip.
  const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024;

  const handleAttachmentSelect = async (file: File) => {
    if (!session) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("That file doesn't look like an image.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadError("File is too large — max 30MB.");
      return;
    }

    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${session.id}/${Date.now()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage.from("feed-media").upload(path, file);
    setUploading(false);

    if (uploadErr) {
      setUploadError(uploadErr.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("feed-media").getPublicUrl(path);
    setAttachment({ url: publicUrlData.publicUrl, type: "image", name: file.name });
  };

  const clearAttachment = () => {
    setAttachment(null);
    setUploadError(null);
  };

  const handleCreateEvent = (details: { title: string; date: string; time: string; location: string }) => {
    const lines = [`📅 ${details.title}`];
    const when = [details.date, details.time].filter(Boolean).join(" at ");
    if (when) lines.push(`When: ${when}`);
    if (details.location) lines.push(`Where: ${details.location}`);
    const block = lines.join("\n");
    setComposerText((prev) => (prev.trim() ? `${prev.trim()}\n\n${block}` : block));
    setEventModalOpen(false);
  };

  const toggleLike = async (postId: string) => {
    if (!session) return;
    const alreadyLiked = likedIds.has(postId);

    setLikedIds((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) next.delete(postId); else next.add(postId);
      return next;
    });
    setPosts(
      (prev) =>
        prev?.map((p) =>
          p.id === postId ? { ...p, likeCount: p.likeCount + (alreadyLiked ? -1 : 1) } : p,
        ) ?? prev,
    );

    const { error } = alreadyLiked
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", session.id)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: session.id });

    if (error) await refreshPosts(); // resync on failure rather than hand-rolling a revert
  };

  const toggleSave = async (postId: string) => {
    if (!session) return;
    const alreadySaved = savedIds.has(postId);

    setSavedIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(postId); else next.add(postId);
      return next;
    });

    const { error } = alreadySaved
      ? await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", session.id)
      : await supabase.from("post_saves").insert({ post_id: postId, user_id: session.id });

    if (error) await refreshPosts();
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        if (!commentsByPost[postId]) loadComments(postId);
      }
      return next;
    });
  };

  const submitComment = async (postId: string) => {
    const body = (commentDrafts[postId] ?? "").trim();
    if (body.length < 1 || !session) return;

    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: session.id, body });

    if (error) {
      setError(error.message);
      return;
    }

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setPosts(
      (prev) => prev?.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)) ?? prev,
    );
    await loadComments(postId);
  };

  const submitReport = async (category: string, details: string) => {
    if (!reportTarget || !session) return { error: "Not signed in." };

    const parsed = reportSchema.safeParse({ category, details });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid report." };
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: session.id,
      target_type: "feed_post",
      target_id: reportTarget,
      category: parsed.data.category,
      description: parsed.data.details,
    });

    if (error) return { error: error.message };

    setReportedIds((prev) => new Set(prev).add(reportTarget));
    setReportTarget(null);
    return { error: null };
  };

  const sendLiveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveInput.trim() || !session) return;
    const body = liveInput.trim();
    setLiveInput("");
    // Don't append locally — the Realtime subscription above adds it once
    // the insert lands, so this stays a single source of truth (no risk of
    // a duplicate local + realtime copy of the same message).
    const { error } = await supabase
      .from("chat_messages")
      .insert({ room: "live_hub", author_id: session.id, body });
    if (error) setError(error.message);
  };

  const scrollToPost = (postId: string) => {
    document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ---- Render --------------------------------------------------------------
  return (
    <div className="flex min-h-screen">
      {/* ------------------------------------------------------------------ */}
      {/* Center column — composer + feed                                     */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 min-w-0 border-r border-outline-variant">
        <div className="mx-auto max-w-2xl px-margin-mobile py-stack-lg md:px-gutter">

          {/* Composer */}
          <div className="mb-stack-lg rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex gap-4">
              {/* Avatar */}
              {session ? (
                <Avatar name={session.name} community={session.community} avatarUrl={session.avatarUrl} />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-outline-variant bg-surface-container-high font-label-bold text-label-bold text-on-surface-variant">
                  ?
                </div>
              )}
              <div className="flex-1">
                <textarea
                  id="feed-composer"
                  placeholder="Share a peace-building thought, track, or event…"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  rows={3}
                  className="w-full resize-none bg-transparent font-body-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant"
                />

                {attachment && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded attachment preview, not a static asset */}
                    <img src={attachment.url} alt={attachment.name} className="h-10 w-10 rounded object-cover" />
                    <span className="flex-1 truncate font-caption text-caption text-on-surface-variant">
                      {attachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearAttachment}
                      className="rounded-full p-1 text-on-surface-variant hover:bg-surface-variant hover:text-error"
                      aria-label="Remove attachment"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                )}
                {uploading && (
                  <p className="mb-2 font-caption text-caption text-on-surface-variant">Uploading…</p>
                )}
                {uploadError && (
                  <p className="mb-2 font-caption text-caption text-error">{uploadError}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-4">
              <div className="flex gap-1 text-on-surface-variant">
                <label
                  title="Add Media"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-surface-variant hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">image</span>
                  <input
                    type="file"
                    accept={MEDIA_ACCEPT}
                    className="hidden"
                    disabled={uploading || !session}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleAttachmentSelect(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  title="Create Event"
                  onClick={() => setEventModalOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-variant hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">event</span>
                </button>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handlePost}
                disabled={!composerText.trim() || posting || uploading}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting ? "Posting…" : "Post"}
              </Button>
            </div>
            {session && (
              <p className="mt-2 font-caption text-caption text-on-surface-variant">
                Posting as <strong>{session.name}</strong>
                <AffiliationChip community={session.community} size="sm" className="ml-2" />
              </p>
            )}
          </div>

          {error && (
            <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
              {error}
            </p>
          )}

          {/* Feed posts */}
          <div className="flex flex-col gap-stack-md">
            {posts === null ? (
              <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 text-center font-body-md text-body-md text-on-surface-variant">
                Loading feed…
              </p>
            ) : posts.length === 0 ? (
              <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 text-center font-body-md text-body-md text-on-surface-variant">
                No posts yet. Be the first to share something!
              </p>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={likedIds.has(post.id)}
                  saved={savedIds.has(post.id)}
                  reported={reportedIds.has(post.id)}
                  commentsExpanded={expandedComments.has(post.id)}
                  comments={commentsByPost[post.id] ?? []}
                  commentDraft={commentDrafts[post.id] ?? ""}
                  onCommentDraftChange={(v) => setCommentDrafts((prev) => ({ ...prev, [post.id]: v }))}
                  onSubmitComment={() => submitComment(post.id)}
                  onToggleComments={() => toggleComments(post.id)}
                  onLike={() => toggleLike(post.id)}
                  onSave={() => toggleSave(post.id)}
                  onReportOpen={() =>
                    setReportTarget(reportTarget === post.id ? null : post.id)
                  }
                  onImageClick={() => {
                    if (post.mediaUrl && post.mediaType === "image") {
                      setPreviewImage(post.mediaUrl);
                    }
                  }}
                  currentUserId={session?.id}
                  menuOpen={openMenuId === post.id}
                  onToggleMenu={() => setOpenMenuId((prev) => (prev === post.id ? null : post.id))}
                  onCloseMenu={() => setOpenMenuId(null)}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Right sidebar — Trending + Live Hub + Crisis Resources              */}
      {/* ------------------------------------------------------------------ */}
      <aside className="sticky top-0 h-screen hidden w-80 shrink-0 flex-col gap-stack-lg overflow-y-auto border-l border-outline-variant bg-surface-container-low p-6 pb-32 lg:flex">

        {/* Trending Peace Talks */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-primary">
            <span className="material-symbols-outlined">trending_up</span>
            Trending Peace Talks
          </h2>
          {trending === null ? (
            <p className="font-caption text-caption text-on-surface-variant">Loading…</p>
          ) : trending.length === 0 ? (
            <p className="font-caption text-caption text-on-surface-variant">
              Nothing trending in the last 72 hours yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {trending.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollToPost(item.id)}
                    title="Jump to this post"
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-left transition-colors hover:border-primary"
                  >
                    <span className="mb-1 block font-caption text-caption text-on-surface-variant">
                      by {item.author}
                    </span>
                    <h3 className="font-label-bold text-label-bold text-primary">
                      {item.excerpt}
                    </h3>
                    <span className="mt-2 flex items-center gap-3 font-caption text-caption text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">favorite</span>
                        {item.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                        {item.commentCount}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Live Hub */}
        <section className="flex flex-col flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-headline-md text-headline-md text-primary">
              <span className="material-symbols-outlined">chat</span>
              Live Hub
            </h2>
            <span className="flex items-center gap-1 font-caption text-caption text-on-surface-variant">
              <span className="block h-2 w-2 rounded-full bg-primary" />
              {onlineCount} Online
            </span>
          </div>

          {/* Messages */}
          <div className="mb-2 flex h-56 flex-col gap-3 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
            {liveMessages.length === 0 && (
              <p className="font-caption text-caption text-on-surface-variant">
                No messages yet — say hello!
              </p>
            )}
            {liveMessages.map((msg) => (
              <div key={msg.id} className="flex gap-2">
                <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-secondary-container" />
                <div>
                  <span className="font-label-bold text-label-bold text-primary text-sm">
                    {msg.author}
                  </span>
                  <p className="text-sm font-body-md text-on-surface">{msg.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <form onSubmit={sendLiveMessage} className="relative">
            <input
              id="live-hub-input"
              type="text"
              placeholder="Send a message…"
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2 pl-4 pr-10 text-sm font-body-md outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </form>
        </section>

        {/* Crisis Resources */}
        <section className="rounded-lg border-2 border-primary bg-surface-container-highest p-4">
          <h2 className="mb-2 flex items-center gap-2 font-headline-md text-headline-md text-primary">
            <span className="material-symbols-outlined text-error">health_and_safety</span>
            Crisis Resources
          </h2>
          <p className="mb-3 font-caption text-caption text-on-surface-variant">
            Immediate help and neutral mediator contacts.
          </p>
          <Button href="/safety" variant="primary" className="w-full">
            Access Help Center
          </Button>
        </section>

        {/* Contact Us */}
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <h2 className="mb-2 flex items-center gap-2 font-headline-md text-headline-md text-primary">
            <span className="material-symbols-outlined">mail</span>
            Contact Us
          </h2>
          <p className="mb-3 font-caption text-caption text-on-surface-variant">
            Questions or feedback? Send a message to the admin team.
          </p>
          <Button href="/contact" variant="secondary" className="w-full">
            Send a Message
          </Button>
        </section>
      </aside>

      {/* Report modal backdrop */}
      {reportTarget && (
        <ReportModal
          onCancel={() => setReportTarget(null)}
          onConfirm={submitReport}
        />
      )}

      {eventModalOpen && (
        <EventModal onCancel={() => setEventModalOpen(false)} onConfirm={handleCreateEvent} />
      )}

      {previewImage && (
        <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------
function PostCard({
  post,
  liked,
  saved,
  reported,
  commentsExpanded,
  comments,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  onToggleComments,
  onLike,
  onSave,
  onReportOpen,
  onImageClick,
  currentUserId,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
}: {
  post: FeedPostRow;
  liked: boolean;
  saved: boolean;
  reported: boolean;
  commentsExpanded: boolean;
  comments: CommentRow[];
  commentDraft: string;
  onCommentDraftChange: (v: string) => void;
  onSubmitComment: () => void;
  onToggleComments: () => void;
  onLike: () => void;
  onSave: () => void;
  onReportOpen: () => void;
  onImageClick: () => void;
  currentUserId: string | undefined;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
}) {
  return (
    <article
      id={`post-${post.id}`}
      className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors duration-200 hover:bg-surface-bright"
    >
      <div className="p-4 sm:p-5">
        {/* Author row */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author}`}>
              <Avatar name={post.author} community={post.authorCommunity} avatarUrl={post.authorAvatarUrl} />
            </Link>
            <div>
              <Link
                href={`/profile/${post.author}`}
                className="font-label-bold text-label-bold text-primary hover:underline"
              >
                {post.author}
              </Link>
              <div className="flex items-center gap-2">
                <p className="font-caption text-caption text-on-surface-variant">
                  {timeAgo(post.createdAt)}
                </p>
                <span className="font-caption text-caption text-outline">·</span>
                <AffiliationChip community={post.authorCommunity} size="sm" />
              </div>
            </div>
          </div>

          {currentUserId && post.authorId && post.authorId !== currentUserId && (
            <div className="relative">
              <button
                type="button"
                onClick={onToggleMenu}
                title="More options"
                aria-label="More options"
                aria-expanded={menuOpen}
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
                  <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest py-1 ambient-shadow">
                    <p className="truncate px-4 py-2 font-caption text-caption text-on-surface-variant">
                      {post.author}
                    </p>
                    <Link
                      href={`/messages?with=${post.authorId}`}
                      onClick={onCloseMenu}
                      className="flex items-center gap-3 px-4 py-2.5 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-secondary-fixed"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                      </span>
                      Send Message
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mb-3 whitespace-pre-line font-body-md text-body-md text-on-surface">{post.body}</p>

        {post.mediaUrl && post.mediaType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- externally-hosted user upload, not a static/optimizable asset
          <img
            src={post.mediaUrl}
            alt="Post attachment"
            onClick={onImageClick}
            className="mb-3 max-h-[450px] w-full cursor-pointer rounded-lg border border-outline-variant bg-surface-container-lowest object-contain transition-opacity hover:opacity-90"
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-outline-variant pt-3">
          <div className="flex gap-1">
            {/* Like */}
            <button
              type="button"
              onClick={onLike}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 font-label-bold text-label-bold transition-colors hover:bg-surface-variant ${
                liked ? "text-primary" : "text-on-surface-variant hover:text-primary"
              }`}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={liked ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {liked ? "favorite" : "favorite_border"}
              </span>
              {post.likeCount > 0 && post.likeCount}
            </button>

            {/* Comment */}
            <button
              type="button"
              onClick={onToggleComments}
              aria-expanded={commentsExpanded}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 font-label-bold text-label-bold transition-colors hover:bg-surface-variant ${
                commentsExpanded ? "text-primary" : "text-on-surface-variant hover:text-primary"
              }`}
              aria-label="Toggle comments"
            >
              <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
              {post.commentCount > 0 && post.commentCount}
            </button>
          </div>

          <div className="flex gap-1">
            {/* Save */}
            <button
              type="button"
              onClick={onSave}
              title={saved ? "Unsave" : "Save"}
              className={`rounded-full p-2 transition-colors hover:bg-surface-variant ${
                saved ? "text-primary" : "text-on-surface-variant hover:text-primary"
              }`}
              aria-label={saved ? "Unsave post" : "Save post"}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {saved ? "bookmark" : "bookmark_border"}
              </span>
            </button>

            {/* Report */}
            {reported ? (
              <span className="flex items-center gap-1 rounded-full px-3 py-1.5 font-caption text-caption text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">check</span>
                Reported
              </span>
            ) : (
              <button
                type="button"
                onClick={onReportOpen}
                title="Report post"
                className="flex items-center justify-center rounded-full p-2 text-error transition-colors hover:bg-error-container"
                aria-label="Report post"
              >
                <span className="material-symbols-outlined text-[18px]">flag</span>
              </button>
            )}
          </div>
        </div>

        {/* Comment thread */}
        {commentsExpanded && (
          <div className="mt-4 flex flex-col gap-3 border-t border-outline-variant pt-4">
            {comments.length === 0 ? (
              <p className="font-caption text-caption text-on-surface-variant">
                No comments yet — be the first to reply.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Link href={`/profile/${c.author}`}>
                    <Avatar
                      name={c.author}
                      community={c.authorCommunity}
                      avatarUrl={c.authorAvatarUrl}
                      size="h-7 w-7"
                      textClass="font-caption text-caption"
                    />
                  </Link>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${c.author}`}
                        className="font-label-bold text-label-bold text-on-surface text-sm hover:underline"
                      >
                        {c.author}
                      </Link>
                      <span className="font-caption text-caption text-outline">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface">{c.body}</p>
                  </div>
                </div>
              ))
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmitComment();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Write a comment…"
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
                className="flex-1 rounded-full border border-outline-variant bg-white px-4 py-2 text-sm font-body-md outline-none focus:border-primary"
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!commentDraft.trim()}>
                Reply
              </Button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// ReportModal
// ---------------------------------------------------------------------------
function ReportModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (category: string, details: string) => Promise<{ error: string | null }>;
}) {
  const [category, setCategory] = useState<string>(CATEGORY_VALUES[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await onConfirm(category, details);
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-margin-mobile backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest ambient-shadow">
        <div className="border-b border-outline-variant px-6 py-4">
          <h2 className="font-headline-md text-headline-md text-primary">Report Post</h2>
          <p className="mt-1 font-caption text-caption text-on-surface-variant">
            This will be logged for mediator review.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md p-6">
          {error && (
            <p className="rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="report-category" className="font-label-bold text-label-bold text-on-surface">
              Category
            </label>
            <select
              id="report-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            >
              {CATEGORY_VALUES.map((v) => (
                <option key={v} value={v}>
                  {CATEGORY_LABELS[v]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="report-details" className="font-label-bold text-label-bold text-on-surface">
              Details
            </label>
            <textarea
              id="report-details"
              placeholder="What happened? (at least 10 characters)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border border-outline-variant bg-white px-4 py-2 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-stack-sm pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || details.trim().length < 10}
              className="bg-error hover:bg-error disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventModal
// ---------------------------------------------------------------------------
function EventModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (details: { title: string; date: string; time: string; location: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm({ title: title.trim(), date, time, location: location.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-margin-mobile backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest ambient-shadow">
        <div className="border-b border-outline-variant px-6 py-4">
          <h2 className="font-headline-md text-headline-md text-primary">Create Event</h2>
          <p className="mt-1 font-caption text-caption text-on-surface-variant">
            Adds a formatted event block to your post.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="event-title" className="font-label-bold text-label-bold text-on-surface">
              Title
            </label>
            <input
              id="event-title"
              type="text"
              placeholder="Community Garden Cleanup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-stack-sm">
            <div className="flex flex-col gap-2">
              <label htmlFor="event-date" className="font-label-bold text-label-bold text-on-surface">
                Date
              </label>
              <input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="event-time" className="font-label-bold text-label-bold text-on-surface">
                Time
              </label>
              <input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="event-location" className="font-label-bold text-label-bold text-on-surface">
              Location
            </label>
            <input
              id="event-location"
              type="text"
              placeholder="5th Street Community Garden"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-stack-sm pt-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!title.trim()}>
              Add to Post
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
