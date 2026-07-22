import MessagesClient from "./MessagesClient";

// Fetches conversations/unread state client-side on mount with no server
// data of its own, so left as Next's default static generation this route
// gets a 5-min Client Router Cache TTL (same gotcha already found and fixed
// on /profile) -- navigating back here would reuse the already-mounted
// instance instead of remounting, silently hiding new conversations/unread
// badges until the cache expired or a hard refresh. Forcing this segment
// dynamic drops that TTL to 0, so every navigation here genuinely remounts.
export const dynamic = "force-dynamic";

export default function MessagesPage() {
  return <MessagesClient />;
}
