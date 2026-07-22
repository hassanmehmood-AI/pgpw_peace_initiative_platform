"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, roleLabel, type Role } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";
import { AffiliationChip, type Community } from "@/components/ui/AffiliationChip";
import { Avatar } from "@/components/ui/Avatar";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type ProfileRow = {
  id: string;
  name: string;
  role: Role;
  community: Community;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
};

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

// Read-only view of someone ELSE's profile -- clicking a name/avatar
// anywhere in the app lands here. No edit/photo/delete affordances exist on
// this page at all; those only ever appear on your own profile (/profile),
// which this page redirects to if you land on your own username.
export default function PublicProfilePage() {
  const params = useParams();
  const username = typeof params.username === "string" ? params.username : "";
  const router = useRouter();
  const { session } = useSession();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined); // undefined = loading
  const [posts, setPosts] = useState<ProfilePost[] | null>(null);
  const [threadCount, setThreadCount] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    if (session && session.name === username) {
      router.replace("/profile");
      return;
    }

    let active = true;

    (async () => {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, username, role, community_affiliation, avatar_url, bio, created_at")
        .eq("username", username)
        .maybeSingle();

      if (!active) return;

      if (!profileRow) {
        setProfile(null);
        return;
      }

      setProfile({
        id: profileRow.id,
        name: profileRow.username,
        role: profileRow.role,
        community: (profileRow.community_affiliation ?? "neutral") as Community,
        avatarUrl: profileRow.avatar_url ?? undefined,
        bio: profileRow.bio ?? undefined,
        createdAt: profileRow.created_at,
      });

      const [{ data: postRows }, { count }] = await Promise.all([
        supabase
          .from("feed_posts")
          .select("id, body, created_at, media_url, media_type, post_likes(count), post_comments(count)")
          .eq("author_id", profileRow.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("forum_threads")
          .select("id", { count: "exact", head: true })
          .eq("author_id", profileRow.id),
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
    })();

    return () => {
      active = false;
    };
  }, [supabase, username, session, router]);

  if (profile === undefined) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-margin-mobile py-20 text-center md:px-margin-desktop">
        <p className="font-body-md text-body-md text-on-surface-variant">Loading profile…</p>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col items-center gap-4 px-margin-mobile py-20 text-center md:px-margin-desktop">
        <span className="material-symbols-outlined text-[64px] text-outline">person_off</span>
        <h1 className="font-headline-lg text-headline-lg text-primary">User not found</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          There&apos;s no profile at @{username}.
        </p>
        <Button href="/feed" variant="secondary">
          ← Back to Feed
        </Button>
      </div>
    );
  }

  const likesReceived = (posts ?? []).reduce((sum, post) => sum + post.likeCount, 0);
  const joinedLabel = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-[900px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      {/* Header card */}
      <Card padding="none" className="mb-stack-lg overflow-hidden ambient-shadow">
        <div className="h-20 bg-primary halftone-bg md:h-24" />
        <div className="flex flex-col items-center gap-stack-md px-6 pb-6 text-center md:flex-row md:items-end md:text-left">
          <Avatar
            name={profile.name}
            community={profile.community}
            avatarUrl={profile.avatarUrl}
            size="h-24 w-24 -mt-12"
            textClass="font-headline-lg text-headline-lg"
            ring
          />
          <div className="flex-1 md:pb-1">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="font-headline-lg text-headline-lg text-primary">{profile.name}</h1>
              <Badge tone="inverse">{roleLabel(profile.role)}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <AffiliationChip community={profile.community} showIcon />
              <span className="font-caption text-caption text-on-surface-variant">
                Member since {joinedLabel}
              </span>
            </div>

            <p className="mt-4 font-body-md text-body-md text-on-surface">
              {profile.bio || "No bio yet."}
            </p>

            {session && (
              <Button href={`/messages?with=${profile.id}`} size="sm" variant="secondary" className="mt-4">
                <span className="material-symbols-outlined text-[16px]">chat</span>
                Message
              </Button>
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

      {/* Posts */}
      <section>
        <h2 className="mb-4 font-headline-md text-headline-md text-primary">Posts</h2>

        {posts === null ? (
          <EmptyState icon="hourglass_empty" text="Loading posts…" />
        ) : posts.length === 0 ? (
          <EmptyState icon="rss_feed" text={`${profile.name} hasn't posted yet.`} />
        ) : (
          <div className="flex flex-col gap-stack-sm">
            {posts.map((post) => (
              <ReadOnlyPostCard
                key={post.id}
                post={post}
                profile={profile}
                onImageClick={() => setPreviewImage(post.mediaUrl)}
              />
            ))}
          </div>
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

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center">
      <span className="material-symbols-outlined text-[32px] text-outline">{icon}</span>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  );
}

function ReadOnlyPostCard({
  post,
  profile,
  onImageClick,
}: {
  post: ProfilePost;
  profile: ProfileRow;
  onImageClick: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors duration-200 hover:bg-surface-bright">
      <div className="p-3 sm:p-4">
        {/* Author row */}
        <div className="mb-2 flex items-center gap-2">
          <Avatar name={profile.name} community={profile.community} avatarUrl={profile.avatarUrl} size="h-8 w-8" />
          <div>
            <h3 className="font-label-bold text-label-bold text-[13px] text-primary">{profile.name}</h3>
            <div className="flex items-center gap-1.5">
              <p className="font-caption text-[11px] text-on-surface-variant">
                {timeAgo(post.createdAt)}
              </p>
              <span className="font-caption text-[11px] text-outline">·</span>
              <AffiliationChip community={profile.community} size="sm" />
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

        {/* Counts — read-only, no delete affordance since this isn't your post */}
        <div className="mt-2 flex items-center gap-0.5 border-t border-outline-variant pt-2">
          <span className="flex items-center gap-1 rounded-md px-2 py-1 font-label-bold text-[12px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[15px]">favorite</span>
            {post.likeCount}
          </span>
          <span className="flex items-center gap-1 rounded-md px-2 py-1 font-label-bold text-[12px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[15px]">chat_bubble</span>
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  );
}

export const dynamic = "force-dynamic";
