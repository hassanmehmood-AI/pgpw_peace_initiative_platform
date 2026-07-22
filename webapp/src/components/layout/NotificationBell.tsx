"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";

type NotificationType = "forum_reply" | "new_report" | "new_contact_message";

type NotificationRow = {
  id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, message, link, read, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!active) return;
      setNotifications(
        (data ?? []).map((n) => ({
          id: n.id,
          type: n.type,
          message: n.message,
          link: n.link,
          read: n.read,
          createdAt: n.created_at,
        })),
      );
    })();

    // Realtime: new notifications for this user land instantly, no refresh.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as {
            id: string;
            type: NotificationType;
            message: string;
            link: string | null;
            read: boolean;
            created_at: string;
          };
          setNotifications((prev) => [
            { id: n.id, type: n.type, message: n.message, link: n.link, read: n.read, createdAt: n.created_at },
            ...prev,
          ]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 font-caption text-[10px] font-bold text-on-error">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest ambient-shadow">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <h3 className="font-label-bold text-label-bold text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="font-caption text-caption text-primary underline underline-offset-2"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="p-4 font-caption text-caption text-on-surface-variant">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {notifications.map((n) => {
                  const body = (
                    <div className={`flex flex-col gap-1 px-4 py-3 ${n.read ? "" : "bg-secondary-fixed"}`}>
                      <p className="font-body-md text-body-md text-on-surface">{n.message}</p>
                      <p className="font-caption text-caption text-on-surface-variant">{timeAgo(n.createdAt)}</p>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => {
                            markRead(n.id);
                            setOpen(false);
                          }}
                          className="block transition-colors hover:bg-surface-container-low"
                        >
                          {body}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="block w-full text-left transition-colors hover:bg-surface-container-low"
                        >
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
