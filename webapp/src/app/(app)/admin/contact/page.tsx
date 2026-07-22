"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";

type ContactStatus = "new" | "resolved";

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
};

const statusTabs: { value: ContactStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
];

export default function AdminContactPage() {
  const { session } = useSession();
  const supabase = createClient();

  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("new");
  const [messages, setMessages] = useState<ContactMessageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = !!session && session.role === "admin";

  const refreshMessages = async (filter: ContactStatus | "all") => {
    let query = supabase
      .from("contact_messages")
      .select("id, name, email, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      setMessages([]);
      return;
    }
    const rows: ContactMessageRow[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
    }));

    // Viewing this list is what clears the "New" badge — no separate
    // "Mark Resolved" click. Whatever's still "new" in this batch just got
    // seen, so flip it server-side and reflect that immediately.
    const newIds = rows.filter((r) => r.status === "new").map((r) => r.id);
    if (newIds.length > 0) {
      await supabase.from("contact_messages").update({ status: "resolved" }).in("id", newIds);
    }
    setMessages(rows.map((r) => (newIds.includes(r.id) ? { ...r, status: "resolved" } : r)));
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      await refreshMessages(statusFilter);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, statusFilter]);

  if (!session || !isSuperAdmin) {
    return (
      <div className="mx-auto w-full max-w-3xl px-margin-mobile py-stack-lg md:px-gutter">
        <div className="flex items-start gap-4 border-l-4 border-error bg-error-container p-4">
          <span className="material-symbols-outlined text-error">block</span>
          <div>
            <h1 className="font-label-bold text-label-bold text-on-error-container">Access Denied</h1>
            <p className="mt-1 font-caption text-caption text-on-error-container">
              This page is restricted to Administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      <Link
        href="/admin"
        className="mb-stack-md inline-flex items-center gap-1 font-caption text-caption text-on-surface-variant hover:text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Dashboard
      </Link>

      <header className="mb-stack-lg">
        <h1 className="mb-stack-sm font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
          Contact Requests
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Every message submitted through the public Contact Us form.
        </p>
      </header>

      <div className="mb-stack-md flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={
              statusFilter === tab.value
                ? "rounded-full bg-primary px-4 py-1.5 font-label-bold text-label-bold text-on-primary"
                : "rounded-full border border-outline-variant px-4 py-1.5 font-label-bold text-label-bold text-on-surface-variant hover:bg-surface-container-high"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-stack-md rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest">
        {messages === null ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="p-stack-md font-body-md text-body-md text-on-surface-variant">No messages found.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {messages.map((message) => (
              <li key={message.id} className="p-stack-md">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-label-bold text-label-bold text-primary">{message.name}</span>
                  <a
                    href={`mailto:${message.email}`}
                    className="font-caption text-caption text-primary hover:underline"
                  >
                    {message.email}
                  </a>
                  {message.status === "new" && (
                    <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 font-caption text-[11px] font-bold text-primary">
                      New
                    </span>
                  )}
                  <span className="ml-auto shrink-0 font-caption text-caption text-on-surface-variant">
                    {timeAgo(message.createdAt)}
                  </span>
                </div>
                <div className="rounded border-l-4 border-outline-variant bg-surface-container-low p-3">
                  <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{message.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
