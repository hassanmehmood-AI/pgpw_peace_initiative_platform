"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession, roleLabel } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";
import { AffiliationChip, type Community } from "@/components/ui/AffiliationChip";
import { Avatar } from "@/components/ui/Avatar";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const AVATAR_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
// Matches the `avatars` storage bucket's file_size_limit — checked
// client-side too so a rejected upload doesn't cost a round trip.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Raw shape as actually returned at runtime. supabase-js can't infer embed
// cardinality without generated DB types (same gotcha as /feed and /forums),
// so the fetched rows get cast to this instead of trusted verbatim.
type ProfilePostQueryRow = {
  id: string;
  body: string;
  created_at: string;
  media_url: string | null;
  media_type: "image" | null;
  post_likes: { count: number }[];
  post_comments: { count: number }[];
};

type ProfilePost = {
  id: string;
  body: string;
  createdAt: string;
  mediaUrl: string | null;
  mediaType: "image" | null;
  likeCount: number;
  commentCount: number;
};

type SavedPostQueryRow = {
  post_id: string;
  feed_posts: {
    id: string;
    body: string;
    created_at: string;
    media_url: string | null;
    media_type: "image" | null;
    profiles: { username: string; community_affiliation: Community | null; avatar_url: string | null } | null;
    post_likes: { count: number }[];
    post_comments: { count: number }[];
  } | null;
};

type SavedPost = {
  postId: string;
  authorName: string;
  authorCommunity: Community;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
  mediaUrl: string | null;
  mediaType: "image" | null;
  likeCount: number;
  commentCount: number;
};

export default function ProfileClient() {
  const { session, updateSession } = useSession();
  const supabase = useMemo(() => createClient(), []);
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [posts, setPosts] = useState<ProfilePost[] | null>(null);
  const [threadCount, setThreadCount] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<SavedPost[] | null>(null);
  const [savedPostsError, setSavedPostsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  useEffect(() => {
    if (!session) return;
    let active = true;

    (async () => {
      const [{ data: postRows }, { count }, { data: savedRows, error: savedError }] = await Promise.all([
        supabase
          .from("feed_posts")
          .select("id, body, created_at, media_url, media_type, post_likes(count), post_comments(count)")
          .eq("author_id", session.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("forum_threads")
          .select("id", { count: "exact", head: true })
          .eq("author_id", session.id),
        supabase
          .from("post_saves")
          .select(
            "post_id, feed_posts!post_saves_post_id_fkey(id, body, created_at, media_url, media_type, profiles!feed_posts_author_id_fkey(username, community_affiliation, avatar_url), post_likes(count), post_comments(count))",
          )
          .eq("user_id", session.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const rows = (postRows ?? []) as unknown as ProfilePostQueryRow[];
      setPosts(
        rows.map((p) => ({
          id: p.id,
          body: p.body,
          createdAt: p.created_at,
          mediaUrl: p.media_url,
          mediaType: p.media_type,
          likeCount: p.post_likes?.[0]?.count ?? 0,
          commentCount: p.post_comments?.[0]?.count ?? 0,
        })),
      );
      setThreadCount(count ?? 0);

      if (savedError) {
        setSavedPostsError(savedError.message);
        setSavedPosts([]);
        return;
      }

      const savedRowsTyped = (savedRows ?? []) as unknown as SavedPostQueryRow[];
      setSavedPosts(
        savedRowsTyped
          .filter((s): s is SavedPostQueryRow & { feed_posts: NonNullable<SavedPostQueryRow["feed_posts"]> } => s.feed_posts !== null)
          .map((s) => ({
            postId: s.feed_posts.id,
            authorName: s.feed_posts.profiles?.username ?? "Unknown",
            authorCommunity: s.feed_posts.profiles?.community_affiliation ?? "neutral",
            authorAvatarUrl: s.feed_posts.profiles?.avatar_url ?? undefined,
            body: s.feed_posts.body,
            createdAt: s.feed_posts.created_at,
            mediaUrl: s.feed_posts.media_url,
            mediaType: s.feed_posts.media_type,
            likeCount: s.feed_posts.post_likes?.[0]?.count ?? 0,
            commentCount: s.feed_posts.post_comments?.[0]?.count ?? 0,
          })),
      );
    })();

    return () => {
      active = false;
    };
  }, [supabase, session]);

  const deletePost = async (postId: string) => {
    if (!session) return;
    setDeleteError(null);
    const { error } = await supabase
      .from("feed_posts")
      .delete()
      .eq("id", postId)
      .eq("author_id", session.id);

    if (error) {
      setDeleteError(error.message);
      return;
    }
    setPosts((prev) => prev?.filter((p) => p.id !== postId) ?? prev);
    setDeletingId(null);
  };

  const unsavePost = async (postId: string) => {
    if (!session) return;
    setSavedPostsError(null);
    const { error } = await supabase
      .from("post_saves")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", session.id);

    if (error) {
      setSavedPostsError(error.message);
      return;
    }
    setSavedPosts((prev) => prev?.filter((p) => p.postId !== postId) ?? prev);
  };

  const handleAvatarSelect = async (file: File) => {
    if (!session) return;
    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("That file doesn't look like an image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("File is too large — max 5MB.");
      return;
    }

    setUploadingAvatar(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${session.id}/${Date.now()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file);

    if (uploadErr) {
      setUploadingAvatar(false);
      setAvatarError(uploadErr.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await updateSession({ avatarUrl: publicUrlData.publicUrl });
    setUploadingAvatar(false);
  };

  const handleRemovePhoto = async () => {
    setAvatarError(null);
    setRemovingAvatar(true);
    await updateSession({ avatarUrl: null });
    setRemovingAvatar(false);
  };

  // (app)/layout.tsx already gates every route behind a session; this is
  // just a type-narrowing guard for the render below.
  if (!session) return null;

  const likesReceived = (posts ?? []).reduce((sum, post) => sum + post.likeCount, 0);
  const joinedLabel = new Date(session.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const startEditing = () => {
    setBioDraft(session.bio ?? "");
    setEditing(true);
  };

  const saveBio = () => {
    updateSession({ bio: bioDraft.trim() });
    setEditing(false);
  };

  return (
    <div className="mx-auto w-full max-w-[900px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      {/* Quick links — mobile's bottom nav has no room for these, so they live here */}
      <div className="mb-stack-md flex justify-end gap-2 md:hidden">
        <Link
          href="/friends"
          className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-caption text-caption text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">group</span>
          Friends
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-caption text-caption text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">settings</span>
          Settings
        </Link>
      </div>

      {/* Header card */}
      <Card padding="none" className="mb-stack-lg overflow-hidden ambient-shadow">
        <div className="h-20 bg-primary halftone-bg md:h-24" />
        <div className="flex flex-col items-center gap-stack-md px-6 pb-6 text-center md:flex-row md:items-end md:text-left">
          <Avatar
            name={session.name}
            community={session.community}
            avatarUrl={session.avatarUrl}
            size="h-24 w-24 -mt-12"
            textClass="font-headline-lg text-headline-lg"
            ring
          />
          <div className="flex-1 md:pb-1">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="font-headline-lg text-headline-lg text-primary">{session.name}</h1>
              <Badge tone="inverse">{roleLabel(session.role)}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <AffiliationChip community={session.community} showIcon />
              <span className="font-caption text-caption text-on-surface-variant">
                Member since {joinedLabel}
              </span>
            </div>

            {editing ? (
              <div className="mt-4 flex flex-col gap-stack-md">
                {/* Photo */}
                <div className="flex flex-col gap-2">
                  <span className="font-label-bold text-label-bold text-on-surface">Profile Photo</span>
                  <div className="flex items-center gap-3">
                    <Avatar name={session.name} community={session.community} avatarUrl={session.avatarUrl} size="h-12 w-12" />
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-primary bg-surface-container-lowest px-3 py-1.5 font-label-bold text-label-bold text-primary transition-colors hover:bg-secondary-fixed">
                      <span className={`material-symbols-outlined text-[16px] ${uploadingAvatar ? "animate-spin" : ""}`}>
                        {uploadingAvatar ? "progress_activity" : "photo_camera"}
                      </span>
                      {uploadingAvatar ? "Uploading…" : "Change Photo"}
                      <input
                        type="file"
                        accept={AVATAR_ACCEPT}
                        className="hidden"
                        disabled={uploadingAvatar}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) handleAvatarSelect(file);
                        }}
                      />
                    </label>
                    {session.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={removingAvatar || uploadingAvatar}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-label-bold text-label-bold text-on-surface-variant transition-colors hover:border-error hover:text-error disabled:opacity-50"
                      >
                        {removingAvatar ? "Removing…" : "Remove Photo"}
                      </button>
                    )}
                  </div>
                  {avatarError && <p className="font-caption text-caption text-error">{avatarError}</p>}
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-2">
                  <span className="font-label-bold text-label-bold text-on-surface">Bio</span>
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    rows={3}
                    maxLength={280}
                    placeholder="Tell the community a bit about yourself…"
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
                  />
                </div>

                <div className="flex justify-center gap-2 md:justify-start">
                  <Button type="button" size="sm" onClick={saveBio}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-4 font-body-md text-body-md text-on-surface">
                  {session.bio || "No bio yet."}
                </p>
                <Button type="button" size="sm" variant="secondary" className="mt-4" onClick={startEditing}>
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="mb-stack-lg grid grid-cols-3 gap-gutter">
        <StatCard icon="rss_feed" label="Feed Posts" value={posts === null ? "—" : posts.length} />
        <StatCard icon="forum" label="Forum Threads" value={threadCount === null ? "—" : threadCount} />
        <StatCard
          icon="favorite"
          label="Likes Received"
          value={posts === null ? "—" : likesReceived}
          inverse
        />
      </div>

      {/* Posts / Saved Posts */}
      <section>
        <div className="mb-4 flex gap-2 border-b border-outline-variant">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`px-1 pb-3 font-label-bold text-label-bold transition-colors ${
              activeTab === "posts"
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            My Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`px-1 pb-3 font-label-bold text-label-bold transition-colors ${
              activeTab === "saved"
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            Saved Posts
          </button>
        </div>

        {activeTab === "posts" ? (
          <>
            {deleteError && (
              <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
                {deleteError}
              </p>
            )}

            {posts === null ? (
              <EmptyState icon="hourglass_empty" text="Loading your posts…" />
            ) : posts.length === 0 ? (
              <EmptyState
                icon="rss_feed"
                text={
                  <>
                    You haven&apos;t posted yet.{" "}
                    <Link href="/feed" className="font-label-bold text-primary underline underline-offset-2">
                      Head to the Feed
                    </Link>{" "}
                    to share something.
                  </>
                }
              />
            ) : (
              <div className="flex flex-col gap-stack-sm">
                {posts.map((post) => (
                  <MyPostCard
                    key={post.id}
                    post={post}
                    session={session}
                    confirmingDelete={deletingId === post.id}
                    onDeleteRequest={() => setDeletingId(post.id)}
                    onDeleteCancel={() => setDeletingId(null)}
                    onDeleteConfirm={() => deletePost(post.id)}
                    onImageClick={() => setPreviewImage(post.mediaUrl)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {savedPostsError && (
              <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
                {savedPostsError}
              </p>
            )}

            {savedPosts === null ? (
              <EmptyState icon="hourglass_empty" text="Loading saved posts…" />
            ) : savedPosts.length === 0 ? (
              <EmptyState
                icon="bookmark_border"
                text={
                  <>
                    You haven&apos;t saved anything yet. Tap the bookmark icon on any post in the{" "}
                    <Link href="/feed" className="font-label-bold text-primary underline underline-offset-2">
                      Feed
                    </Link>{" "}
                    to save it here.
                  </>
                }
              />
            ) : (
              <div className="flex flex-col gap-stack-sm">
                {savedPosts.map((post) => (
                  <SavedPostCard
                    key={post.postId}
                    post={post}
                    onUnsave={() => unsavePost(post.postId)}
                    onImageClick={() => setPreviewImage(post.mediaUrl)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {previewImage && (
        <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  inverse = false,
}: {
  icon: string;
  label: string;
  value: number | string;
  inverse?: boolean;
}) {
  return (
    <div
      className={
        inverse
          ? "rounded-xl border border-primary bg-primary p-4 md:p-6"
          : "group rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-all duration-200 hover:border-primary md:p-6"
      }
    >
      <div className="mb-2 flex items-center gap-2 md:mb-3 md:gap-3">
        <span
          className={
            inverse
              ? "material-symbols-outlined text-on-primary"
              : "material-symbols-outlined text-surface-tint transition-colors group-hover:text-primary"
          }
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <p
        className={
          inverse
            ? "font-headline-lg text-headline-lg text-on-primary"
            : "font-headline-lg text-headline-lg text-primary"
        }
      >
        {value}
      </p>
      <p
        className={
          inverse
            ? "font-label-bold text-[10px] uppercase tracking-wider text-on-primary/80"
            : "font-label-bold text-[10px] uppercase tracking-wider text-on-surface-variant"
        }
      >
        {label}
      </p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center">
      <span className="material-symbols-outlined text-[32px] text-outline">{icon}</span>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  );
}

function MyPostCard({
  post,
  session,
  confirmingDelete,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
  onImageClick,
}: {
  post: ProfilePost;
  session: { name: string; community: Community; avatarUrl?: string };
  confirmingDelete: boolean;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onImageClick: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors duration-200 hover:bg-surface-bright">
      <div className="p-3 sm:p-4">
        {/* Author row */}
        <div className="mb-2 flex items-center gap-2">
          <Avatar name={session.name} community={session.community} avatarUrl={session.avatarUrl} size="h-8 w-8" />
          <div>
            <h3 className="font-label-bold text-label-bold text-[13px] text-primary">{session.name}</h3>
            <div className="flex items-center gap-1.5">
              <p className="font-caption text-[11px] text-on-surface-variant">
                {timeAgo(post.createdAt)}
              </p>
              <span className="font-caption text-[11px] text-outline">·</span>
              <AffiliationChip community={session.community} size="sm" />
            </div>
          </div>
        </div>

        <p className="whitespace-pre-line font-body-md text-sm leading-snug text-on-surface">{post.body}</p>

        {post.mediaUrl && post.mediaType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- externally-hosted user upload, not a static/optimizable asset
          <img
            src={post.mediaUrl}
            alt="Post attachment"
            onClick={onImageClick}
            className="mt-2 max-h-[260px] w-full cursor-pointer rounded-md border border-outline-variant bg-surface-container-lowest object-contain transition-opacity hover:opacity-90"
          />
        )}

        {/* Actions */}
        <div className="mt-2 flex items-center justify-between border-t border-outline-variant pt-2">
          <div className="flex gap-0.5">
            <span className="flex items-center gap-1 rounded-md px-2 py-1 font-label-bold text-[12px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[15px]">favorite</span>
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1 rounded-md px-2 py-1 font-label-bold text-[12px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[15px]">chat_bubble</span>
              {post.commentCount}
            </span>
          </div>

          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="font-caption text-[11px] text-on-surface-variant">Delete this post?</span>
              <Button type="button" size="sm" variant="secondary" onClick={onDeleteCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onDeleteConfirm}
                className="bg-error hover:bg-error"
              >
                Confirm
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDeleteRequest}
              title="Delete post"
              className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
              aria-label="Delete post"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SavedPostCard({
  post,
  onUnsave,
  onImageClick,
}: {
  post: SavedPost;
  onUnsave: () => void;
  onImageClick: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors duration-200 hover:bg-surface-bright">
      <div className="p-3 sm:p-4">
        {/* Author row */}
        <div className="mb-2 flex items-center gap-2">
          <Link href={`/profile/${post.authorName}`}>
            <Avatar name={post.authorName} community={post.authorCommunity} avatarUrl={post.authorAvatarUrl} size="h-8 w-8" />
          </Link>
          <div>
            <Link
              href={`/profile/${post.authorName}`}
              className="font-label-bold text-label-bold text-[13px] text-primary hover:underline"
            >
              {post.authorName}
            </Link>
            <div className="flex items-center gap-1.5">
              <p className="font-caption text-[11px] text-on-surface-variant">
                {timeAgo(post.createdAt)}
              </p>
              <span className="font-caption text-[11px] text-outline">·</span>
              <AffiliationChip community={post.authorCommunity} size="sm" />
            </div>
          </div>
        </div>

        <p className="whitespace-pre-line font-body-md text-sm leading-snug text-on-surface">{post.body}</p>

        {post.mediaUrl && post.mediaType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- externally-hosted user upload, not a static/optimizable asset
          <img
            src={post.mediaUrl}
            alt="Post attachment"
            onClick={onImageClick}
            className="mt-2 max-h-[260px] w-full cursor-pointer rounded-md border border-outline-variant bg-surface-container-lowest object-contain transition-opacity hover:opacity-90"
          />
        )}

        {/* Actions — unsave instead of delete, since this isn't your post */}
        <div className="mt-2 flex items-center justify-between border-t border-outline-variant pt-2">
          <div className="flex gap-0.5">
            <span className="flex items-center gap-1 rounded-md px-2 py-1 font-label-bold text-[12px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[15px]">favorite</span>
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1 rounded-md px-2 py-1 font-label-bold text-[12px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[15px]">chat_bubble</span>
              {post.commentCount}
            </span>
          </div>

          <button
            type="button"
            onClick={onUnsave}
            title="Remove from saved"
            className="rounded-full p-1.5 text-primary transition-colors hover:bg-error-container hover:text-error"
            aria-label="Remove from saved"
          >
            <span className="material-symbols-outlined text-[15px]">bookmark</span>
          </button>
        </div>
      </div>
    </article>
  );
}
