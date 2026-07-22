"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import type { Community } from "@/components/ui/AffiliationChip";
import { useSession, roleLabel, type Role } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

type OtherProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  community: Community;
  role: Role;
};

type FriendshipRow = {
  friendshipId: string;
  status: "pending" | "accepted";
  direction: "outgoing" | "incoming";
  other: OtherProfile;
};

type SearchResult = OtherProfile & {
  relation: "none" | "friends" | "outgoing" | "incoming";
  friendshipId: string | null;
};

export default function FriendsPage() {
  const { session } = useSession();
  const supabase = useMemo(() => createClient(), []);

  const [friendships, setFriendships] = useState<FriendshipRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [findTerm, setFindTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [filterTerm, setFilterTerm] = useState("");

  const refreshFriendships = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("friendships")
      .select(
        "id, status, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, username, avatar_url, community_affiliation, role), addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url, community_affiliation, role)",
      )
      .or(`requester_id.eq.${session.id},addressee_id.eq.${session.id}`);

    if (error) {
      setError(error.message);
      setFriendships([]);
      return;
    }

    type RawProfile = { id: string; username: string; avatar_url: string | null; community_affiliation: Community | null; role: Role };
    type RawRow = {
      id: string;
      status: "pending" | "accepted";
      requester_id: string;
      addressee_id: string;
      requester: RawProfile | null;
      addressee: RawProfile | null;
    };
    const rows = (data ?? []) as unknown as RawRow[];

    const toOther = (p: RawProfile): OtherProfile => ({
      id: p.id,
      username: p.username,
      avatarUrl: p.avatar_url,
      community: p.community_affiliation ?? "neutral",
      role: p.role,
    });

    setFriendships(
      rows
        .filter((r) => r.requester && r.addressee)
        .map((r) => {
          const iAmRequester = r.requester_id === session.id;
          return {
            friendshipId: r.id,
            status: r.status,
            direction: iAmRequester ? "outgoing" : "incoming",
            other: toOther(iAmRequester ? r.addressee! : r.requester!),
          };
        }),
    );
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      await refreshFriendships();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // Debounced "find people" search across all members.
  useEffect(() => {
    if (!session) return;
    const term = findTerm.trim();
    const t = setTimeout(() => {
      if (!term) {
        setSearchResults(null);
        return;
      }
      (async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, community_affiliation, role")
          .ilike("username", `%${term}%`)
          .neq("id", session.id)
          .limit(10);
        if (error) {
          setError(error.message);
          return;
        }
        const known = new Map((friendships ?? []).map((f) => [f.other.id, f]));
        setSearchResults(
          (data ?? []).map((p) => {
            const match = known.get(p.id);
            const relation: SearchResult["relation"] = !match
              ? "none"
              : match.status === "accepted"
                ? "friends"
                : match.direction;
            return {
              id: p.id,
              username: p.username,
              avatarUrl: p.avatar_url,
              community: (p.community_affiliation ?? "neutral") as Community,
              role: p.role,
              relation,
              friendshipId: match?.friendshipId ?? null,
            };
          }),
        );
      })();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findTerm, session?.id, friendships]);

  if (!session) return null;

  const friends = (friendships ?? []).filter((f) => f.status === "accepted");
  const incoming = (friendships ?? []).filter((f) => f.status === "pending" && f.direction === "incoming");
  const outgoing = (friendships ?? []).filter((f) => f.status === "pending" && f.direction === "outgoing");

  const visibleFriends = filterTerm.trim()
    ? friends.filter((f) => f.other.username.toLowerCase().includes(filterTerm.trim().toLowerCase()))
    : friends;

  const sendRequest = async (profileId: string) => {
    setBusyId(profileId);
    setError(null);
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: session.id, addressee_id: profileId, status: "pending" });
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshFriendships();
  };

  const acceptRequest = async (friendshipId: string) => {
    setBusyId(friendshipId);
    setError(null);
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", friendshipId);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshFriendships();
  };

  // Shared by decline (pending, not mine to accept), cancel (pending, mine),
  // and remove (accepted) — all three are just "delete the row I'm part of".
  const deleteFriendship = async (friendshipId: string) => {
    setBusyId(friendshipId);
    setError(null);
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshFriendships();
  };

  return (
    <div className="mx-auto w-full max-w-[900px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-primary">Friends</h1>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          {friends.length} connection{friends.length === 1 ? "" : "s"}
        </p>
      </header>

      {error && (
        <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
          {error}
        </p>
      )}

      {/* Find people */}
      <section className="mb-stack-lg">
        <h2 className="mb-4 font-headline-md text-headline-md text-primary">Find People</h2>
        <div className="relative mb-stack-md">
          <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={findTerm}
            onChange={(e) => setFindTerm(e.target.value)}
            placeholder="Search by username…"
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2 pr-4 pl-10 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        {searchResults !== null && (
          <div className="flex flex-col gap-stack-sm">
            {searchResults.length === 0 ? (
              <p className="font-caption text-caption text-on-surface-variant">No members match &quot;{findTerm}&quot;.</p>
            ) : (
              searchResults.map((result) => {
                const busy = busyId === result.id || busyId === result.friendshipId;
                return (
                  <Card key={result.id} padding="default" className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={result.username} community={result.community} avatarUrl={result.avatarUrl} size="h-10 w-10" />
                      <div>
                        <p className="font-label-bold text-label-bold text-primary">{result.username}</p>
                        <AffiliationChip community={result.community} size="sm" />
                      </div>
                    </div>
                    {result.relation === "none" && (
                      <Button type="button" size="sm" disabled={busy} onClick={() => sendRequest(result.id)}>
                        Add Friend
                      </Button>
                    )}
                    {result.relation === "outgoing" && (
                      <Button type="button" size="sm" variant="secondary" disabled>
                        Requested
                      </Button>
                    )}
                    {result.relation === "incoming" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => result.friendshipId && acceptRequest(result.friendshipId)}
                      >
                        Accept Request
                      </Button>
                    )}
                    {result.relation === "friends" && (
                      <span className="font-caption text-caption text-on-surface-variant">Already friends</span>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* Incoming friend requests */}
      {incoming.length > 0 && (
        <section className="mb-stack-lg">
          <h2 className="mb-4 font-headline-md text-headline-md text-primary">Friend Requests</h2>
          <div className="flex flex-col gap-stack-sm">
            {incoming.map((request) => {
              const busy = busyId === request.friendshipId;
              return (
                <Card key={request.friendshipId} padding="default" className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={request.other.username} community={request.other.community} avatarUrl={request.other.avatarUrl} size="h-10 w-10" />
                    <div>
                      <p className="font-label-bold text-label-bold text-primary">{request.other.username}</p>
                      <AffiliationChip community={request.other.community} size="sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={busy} onClick={() => acceptRequest(request.friendshipId)}>
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => deleteFriendship(request.friendshipId)}
                    >
                      Decline
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Sent requests, awaiting a response */}
      {outgoing.length > 0 && (
        <section className="mb-stack-lg">
          <h2 className="mb-4 font-headline-md text-headline-md text-primary">Sent Requests</h2>
          <div className="flex flex-col gap-stack-sm">
            {outgoing.map((request) => {
              const busy = busyId === request.friendshipId;
              return (
                <Card key={request.friendshipId} padding="default" className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={request.other.username} community={request.other.community} avatarUrl={request.other.avatarUrl} size="h-10 w-10" />
                    <div>
                      <p className="font-label-bold text-label-bold text-primary">{request.other.username}</p>
                      <AffiliationChip community={request.other.community} size="sm" />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => deleteFriendship(request.friendshipId)}
                  >
                    Cancel
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Friends list */}
      <section>
        <h2 className="mb-4 font-headline-md text-headline-md text-primary">Your Friends</h2>
        <div className="relative mb-stack-md">
          <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            placeholder="Search friends…"
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2 pr-4 pl-10 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>

        {friendships === null ? (
          <Card className="text-center font-body-md text-body-md text-on-surface-variant">Loading…</Card>
        ) : visibleFriends.length === 0 ? (
          <Card className="text-center font-body-md text-body-md text-on-surface-variant">
            {friends.length === 0 ? "No friends yet — search above to find people." : `No friends match "${filterTerm}".`}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-stack-md sm:grid-cols-2">
            {visibleFriends.map((friend) => {
              const busy = busyId === friend.friendshipId;
              return (
                <Card key={friend.friendshipId} padding="default" className="flex items-center gap-3">
                  <Avatar name={friend.other.username} community={friend.other.community} avatarUrl={friend.other.avatarUrl} size="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-label-bold text-label-bold text-primary">{friend.other.username}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <AffiliationChip community={friend.other.community} size="sm" />
                      <span className="font-caption text-caption text-on-surface-variant">
                        {roleLabel(friend.other.role)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link
                      href={`/messages?with=${friend.other.id}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
                      aria-label={`Message ${friend.other.username}`}
                      title="Message"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteFriendship(friend.friendshipId)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container hover:text-error disabled:opacity-50"
                      aria-label={`Remove ${friend.other.username}`}
                      title="Remove friend"
                    >
                      <span className="material-symbols-outlined text-[18px]">person_remove</span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
