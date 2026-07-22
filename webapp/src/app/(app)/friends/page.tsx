"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import { avatarBg } from "@/lib/avatarColor";
import { roleLabel } from "@/lib/session";
import {
  MOCK_FRIENDS,
  MOCK_FRIEND_REQUESTS,
  type Friend,
  type FriendRequest,
} from "@/mocks/friends";

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [requests, setRequests] = useState<FriendRequest[]>(MOCK_FRIEND_REQUESTS);
  const [search, setSearch] = useState("");

  const acceptRequest = (request: FriendRequest) => {
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    setFriends((prev) => [
      {
        id: request.id,
        name: request.name,
        community: request.community,
        role: "member",
        status: "online",
        mutualCount: request.mutualCount,
      },
      ...prev,
    ]);
    console.log("[mock] friend request accepted", request.id);
  };

  const declineRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    console.log("[mock] friend request declined", id);
  };

  const removeFriend = (id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    console.log("[mock] friend removed", id);
  };

  const visibleFriends = search.trim()
    ? friends.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : friends;

  const onlineCount = friends.filter((f) => f.status === "online").length;

  return (
    <div className="mx-auto w-full max-w-[900px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-primary">Friends</h1>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          {friends.length} connections · {onlineCount} online now
        </p>
      </header>

      {/* Friend requests */}
      {requests.length > 0 && (
        <section className="mb-stack-lg">
          <h2 className="mb-4 font-headline-md text-headline-md text-primary">Friend Requests</h2>
          <div className="flex flex-col gap-stack-sm">
            {requests.map((request) => (
              <Card
                key={request.id}
                padding="default"
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-label-bold text-label-bold ${avatarBg[request.community]}`}
                  >
                    {request.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-label-bold text-label-bold text-primary">{request.name}</p>
                    <div className="flex items-center gap-2">
                      <AffiliationChip community={request.community} size="sm" />
                      <span className="font-caption text-caption text-on-surface-variant">
                        {request.mutualCount} mutual
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => acceptRequest(request)}>
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => declineRequest(request.id)}
                  >
                    Decline
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <div className="relative mb-stack-md">
        <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search friends…"
          className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2 pr-4 pl-10 font-body-md text-body-md outline-none focus:border-primary"
        />
      </div>

      {/* Friends list */}
      {visibleFriends.length === 0 ? (
        <Card className="text-center font-body-md text-body-md text-on-surface-variant">
          {friends.length === 0 ? "No friends yet." : `No friends match "${search}".`}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-stack-md sm:grid-cols-2">
          {visibleFriends.map((friend) => (
            <Card key={friend.id} padding="default" className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 font-label-bold text-label-bold ${avatarBg[friend.community]}`}
                >
                  {friend.name[0]?.toUpperCase()}
                </div>
                <span
                  className={`absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-container-lowest ${
                    friend.status === "online" ? "bg-primary" : "bg-outline-variant"
                  }`}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label-bold text-label-bold text-primary">
                  {friend.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <AffiliationChip community={friend.community} size="sm" />
                  <span className="font-caption text-caption text-on-surface-variant">
                    {roleLabel(friend.role)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Link
                  href={`/messages?with=${friend.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
                  aria-label={`Message ${friend.name}`}
                  title="Message"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </Link>
                <button
                  type="button"
                  onClick={() => removeFriend(friend.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
                  aria-label={`Remove ${friend.name}`}
                  title="Remove friend"
                >
                  <span className="material-symbols-outlined text-[18px]">person_remove</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
