"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { Community } from "@/components/ui/AffiliationChip";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Canonical ordering matching the DB's `user_a_id < user_b_id` check
// constraint -- Postgres uuid comparison on the canonical hyphenated text
// form sorts identically to plain JS string comparison, so this is safe.
function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// Raw shapes as actually returned at runtime. supabase-js can't infer embed
// cardinality without generated DB types (same gotcha as /feed and /forums).
type ConversationQueryRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  user_a_last_read_at: string | null;
  user_b_last_read_at: string | null;
  last_message_at: string | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  created_at: string;
  user_a: { id: string; username: string; community_affiliation: Community | null; avatar_url: string | null } | null;
  user_b: { id: string; username: string; community_affiliation: Community | null; avatar_url: string | null } | null;
};

type ConversationRow = {
  id: string;
  userAId: string;
  userBId: string;
  otherId: string;
  otherName: string;
  otherCommunity: Community;
  otherAvatarUrl?: string;
  lastMessageAt: string;
  lastMessageBody: string | null;
  unread: boolean;
};

type MessageQueryRow = { id: string; sender_id: string; body: string; created_at: string };
type MessageRow = { id: string; senderId: string; body: string; createdAt: string };

function sortByLastMessage(rows: ConversationRow[]) {
  return [...rows].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

function MessagesView() {
  const { session } = useSession();
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const withParam = searchParams.get("with");

  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [messagesForId, setMessagesForId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeUsername, setComposeUsername] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const activeConversation = conversations?.find((c) => c.id === activeId) ?? null;
  const shownMessages = messagesForId === activeId ? messages : null;

  const mapConversation = (row: ConversationQueryRow, myId: string): ConversationRow | null => {
    const iAmA = row.user_a_id === myId;
    const other = iAmA ? row.user_b : row.user_a;
    if (!other) return null;
    const myLastRead = iAmA ? row.user_a_last_read_at : row.user_b_last_read_at;
    const unread =
      row.last_message_at !== null &&
      row.last_message_sender_id !== myId &&
      (myLastRead === null || new Date(row.last_message_at) > new Date(myLastRead));

    return {
      id: row.id,
      userAId: row.user_a_id,
      userBId: row.user_b_id,
      otherId: other.id,
      otherName: other.username,
      otherCommunity: (other.community_affiliation ?? "neutral") as Community,
      otherAvatarUrl: other.avatar_url ?? undefined,
      lastMessageAt: row.last_message_at ?? row.created_at,
      lastMessageBody: row.last_message_body,
      unread,
    };
  };

  const refreshConversations = async (myId: string): Promise<ConversationRow[]> => {
    const { data, error: fetchErr } = await supabase
      .from("conversations")
      .select(
        "id, user_a_id, user_b_id, user_a_last_read_at, user_b_last_read_at, last_message_at, last_message_body, last_message_sender_id, created_at, user_a:profiles!conversations_user_a_id_fkey(id, username, community_affiliation, avatar_url), user_b:profiles!conversations_user_b_id_fkey(id, username, community_affiliation, avatar_url)",
      )
      .or(`user_a_id.eq.${myId},user_b_id.eq.${myId}`);

    if (fetchErr) {
      setError(fetchErr.message);
      return [];
    }

    const rows = (data ?? []) as unknown as ConversationQueryRow[];
    const mapped = sortByLastMessage(
      rows.map((r) => mapConversation(r, myId)).filter((c): c is ConversationRow => c !== null),
    );
    setConversations(mapped);
    return mapped;
  };

  // Find-or-create a conversation with another profile id, then open it.
  const openWithUser = async (otherId: string) => {
    if (!session || otherId === session.id) return;
    const [userA, userB] = orderedPair(session.id, otherId);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a_id", userA)
      .eq("user_b_id", userB)
      .maybeSingle();

    let conversationId = existing?.id as string | undefined;

    if (!conversationId) {
      const { data: created, error: createErr } = await supabase
        .from("conversations")
        .insert({ user_a_id: userA, user_b_id: userB })
        .select("id")
        .single();

      if (createErr) {
        if (createErr.code === "23505") {
          // Lost a race with the other participant creating the same pair
          // at the same time -- just read back what they created.
          const { data: retry } = await supabase
            .from("conversations")
            .select("id")
            .eq("user_a_id", userA)
            .eq("user_b_id", userB)
            .maybeSingle();
          conversationId = retry?.id;
        } else if (createErr.code === "23503") {
          setError("That user couldn't be found.");
          return;
        } else {
          setError(createErr.message);
          return;
        }
      } else {
        conversationId = created?.id;
      }
    }

    await refreshConversations(session.id);
    if (conversationId) setActiveId(conversationId);
  };

  // Initial load: fetch conversations, then resolve `?with=<profileId>` (a
  // real-user deep link) if present. Friends is still mock-only (Phase B10
  // backlog), so its "Message" links pass a fake id like "f1" -- the UUID
  // check below means those just fall through to picking the first real
  // conversation instead of erroring on an invalid uuid query.
  useEffect(() => {
    if (!session) return;
    let active = true;

    (async () => {
      const list = await refreshConversations(session.id);
      if (!active) return;

      if (withParam && UUID_RE.test(withParam)) {
        await openWithUser(withParam);
        router.replace("/messages");
      } else if (list.length > 0) {
        setActiveId(list[0].id);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const markRead = async (conv: ConversationRow) => {
    if (!session) return;
    const column = conv.userAId === session.id ? "user_a_last_read_at" : "user_b_last_read_at";
    const { error: updateErr } = await supabase
      .from("conversations")
      .update({ [column]: new Date().toISOString() })
      .eq("id", conv.id);
    if (!updateErr) {
      setConversations((prev) => prev?.map((c) => (c.id === conv.id ? { ...c, unread: false } : c)) ?? prev);
    }
  };

  const openConversation = (conv: ConversationRow) => {
    setActiveId(conv.id);
    if (conv.unread) markRead(conv);
  };

  // Load messages + subscribe to live delivery for the active thread.
  // `messagesForId` tracks which conversation `messages` belongs to, so
  // switching threads shows "Loading…" instead of a stale setState call at
  // the top of this effect (the lint rule for that: state updates in an
  // effect body should come from the async work/subscription, not run
  // unconditionally on every dependency change).
  useEffect(() => {
    if (!activeId) return;
    let active = true;

    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });

      if (!active) return;
      const rows = (data ?? []) as unknown as MessageQueryRow[];
      setMessages(rows.map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at })));
      setMessagesForId(activeId);
    })();

    const channel = supabase
      .channel(`direct_messages:conversation:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const row = payload.new as MessageQueryRow;
          if (!active) return;

          setMessages((prev) => {
            const next = prev ?? [];
            if (next.some((m) => m.id === row.id)) return next;
            return [...next, { id: row.id, senderId: row.sender_id, body: row.body, createdAt: row.created_at }];
          });

          setConversations((prev) => {
            if (!prev) return prev;
            const updated = prev.map((c) =>
              c.id === activeId
                ? { ...c, lastMessageAt: row.created_at, lastMessageBody: row.body, unread: false }
                : c,
            );
            return sortByLastMessage(updated);
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, activeId]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeId || !session) return;
    const body = draft.trim();
    setDraft("");
    // Don't append locally -- the Realtime subscription above adds it once
    // the insert lands, same single-source-of-truth pattern as Feed's Live
    // Hub chat (avoids a duplicate local + broadcast copy of one message).
    const { error: sendErr } = await supabase
      .from("direct_messages")
      .insert({ conversation_id: activeId, sender_id: session.id, body });
    if (sendErr) setError(sendErr.message);
  };

  const handleCompose = async (e: FormEvent) => {
    e.preventDefault();
    if (!composeUsername.trim() || !session) return;
    setComposing(true);
    setComposeError(null);

    const { data: profile, error: lookupErr } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", composeUsername.trim())
      .maybeSingle();

    if (lookupErr || !profile) {
      setComposing(false);
      setComposeError(`No user found with username "${composeUsername.trim()}".`);
      return;
    }
    if (profile.id === session.id) {
      setComposing(false);
      setComposeError("You can't message yourself.");
      return;
    }

    await openWithUser(profile.id);
    setComposing(false);
    setComposeOpen(false);
    setComposeUsername("");
  };

  if (!session) return null;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-[1100px] md:h-screen">
      {/* Conversation list */}
      <aside
        className={`w-full shrink-0 flex-col border-r border-outline-variant md:flex md:w-80 ${
          activeConversation ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-outline-variant p-margin-mobile">
          <h1 className="font-headline-lg text-headline-lg text-primary">Messages</h1>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            title="New Message"
            aria-label="New Message"
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">edit_square</span>
          </button>
        </div>

        {error && (
          <p className="p-margin-mobile font-caption text-caption text-error" role="alert">
            {error}
          </p>
        )}

        {conversations === null ? (
          <p className="p-margin-mobile font-body-md text-body-md text-on-surface-variant">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="p-margin-mobile font-body-md text-body-md text-on-surface-variant">
            No conversations yet. Tap the compose icon to message someone.
          </p>
        ) : (
          <ul className="flex-1 divide-y divide-outline-variant overflow-y-auto">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => openConversation(conv)}
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-container-low ${
                    activeId === conv.id ? "bg-surface-container-low" : ""
                  }`}
                >
                  <Avatar name={conv.otherName} community={conv.otherCommunity} avatarUrl={conv.otherAvatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-label-bold text-label-bold text-primary">
                        {conv.otherName}
                      </span>
                      <span className="shrink-0 font-caption text-caption text-on-surface-variant">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-caption text-caption text-on-surface-variant">
                        {conv.lastMessageBody ?? "New conversation"}
                      </span>
                      {conv.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-error" aria-label="Unread" />
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Thread */}
      <section className={`flex-1 flex-col md:flex ${activeConversation ? "flex" : "hidden md:flex"}`}>
        {!activeConversation ? (
          <div className="flex flex-1 items-center justify-center p-margin-mobile text-center font-body-md text-body-md text-on-surface-variant">
            {conversations === null ? "Loading…" : "Select a conversation to start messaging."}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-outline-variant p-margin-mobile">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="md:hidden"
                aria-label="Back to conversations"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <Avatar
                name={activeConversation.otherName}
                community={activeConversation.otherCommunity}
                avatarUrl={activeConversation.otherAvatarUrl}
                size="h-9 w-9"
              />
              <h2 className="font-label-bold text-label-bold text-primary">
                {activeConversation.otherName}
              </h2>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-margin-mobile">
              {shownMessages === null ? (
                <p className="text-center font-caption text-caption text-on-surface-variant">Loading…</p>
              ) : shownMessages.length === 0 ? (
                <p className="text-center font-caption text-caption text-on-surface-variant">
                  Say hi to {activeConversation.otherName} 👋
                </p>
              ) : (
                shownMessages.map((msg) => {
                  const mine = msg.senderId === session.id;
                  return (
                    <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          mine ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface"
                        }`}
                      >
                        <p className="whitespace-pre-line font-body-md text-body-md">{msg.body}</p>
                        <p
                          className={`mt-1 font-caption text-caption ${
                            mine ? "text-on-primary/70" : "text-on-surface-variant"
                          }`}
                        >
                          {timeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 border-t border-outline-variant p-margin-mobile"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-md text-body-md outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-50"
                disabled={!draft.trim()}
                aria-label="Send"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </>
        )}
      </section>

      {/* Compose modal */}
      {composeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-margin-mobile backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setComposeOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest ambient-shadow">
            <div className="border-b border-outline-variant px-6 py-4">
              <h2 className="font-headline-md text-headline-md text-primary">New Message</h2>
              <p className="mt-1 font-caption text-caption text-on-surface-variant">
                Start a conversation with someone by their username.
              </p>
            </div>
            <form onSubmit={handleCompose} className="flex flex-col gap-stack-md p-6">
              {composeError && (
                <p className="rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
                  {composeError}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <label htmlFor="compose-username" className="font-label-bold text-label-bold text-on-surface">
                  Username
                </label>
                <input
                  id="compose-username"
                  type="text"
                  value={composeUsername}
                  onChange={(e) => setComposeUsername(e.target.value)}
                  placeholder="e.g. MediatorMike"
                  autoFocus
                  className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-stack-sm pt-2">
                <Button type="button" variant="secondary" onClick={() => setComposeOpen(false)} disabled={composing}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={composing || !composeUsername.trim()}>
                  {composing ? "Starting…" : "Start Chat"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesClient() {
  return (
    <Suspense fallback={null}>
      <MessagesView />
    </Suspense>
  );
}
