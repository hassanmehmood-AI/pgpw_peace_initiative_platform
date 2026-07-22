import ProfileClient from "./ProfileClient";

// `/profile` fetches the signed-in user's posts/threads client-side on
// mount. Left as Next's default static generation, this route gets a 5-min
// Client Router Cache TTL, so navigating back after posting elsewhere
// reuses the already-mounted (and already-fetched) component instead of
// remounting it — the new post silently doesn't appear until the cache
// expires or a hard refresh. Forcing this segment dynamic drops that TTL to
// 0, so every navigation here genuinely remounts and refetches.
export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return <ProfileClient />;
}
