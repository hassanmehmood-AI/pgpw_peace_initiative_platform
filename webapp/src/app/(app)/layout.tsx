"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { useSession, roleLabel, canModerate } from "@/lib/session";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, authUserId, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Genuinely signed out (no Supabase auth user at all) — proxy should have
  // already blocked this, but redirect as a fallback.
  const signedOut = !loading && !session && !authUserId;
  // Real Supabase auth succeeded, but there's no matching `profiles` row —
  // happens when registration is interrupted before the final step. This is
  // NOT "not logged in," so it must not silently bounce back to /login: that
  // looks exactly like a broken login to the user (login "succeeds" per
  // Supabase, then immediately redirects back with no explanation).
  const missingProfile = !loading && !session && !!authUserId;

  useEffect(() => {
    if (signedOut) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [signedOut, pathname, router]);

  if (loading || signedOut) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-surface">
        <p className="font-body-md text-body-md text-on-surface-variant">
          {loading ? "Loading…" : "Redirecting to sign in…"}
        </p>
      </div>
    );
  }

  if (missingProfile) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-surface p-margin-mobile">
        <div className="flex max-w-md flex-col items-start gap-4 border-l-4 border-error bg-error-container p-6">
          <h1 className="font-label-bold text-label-bold text-on-error-container">
            Account setup incomplete
          </h1>
          <p className="font-caption text-caption text-on-error-container">
            You&apos;re signed in, but the last step of registration (creating your profile)
            never finished. Pick up where you left off to finish setting up your account.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="rounded-lg border-2 border-error bg-error px-4 py-2 font-label-bold text-label-bold text-on-error transition-colors hover:opacity-90"
            >
              Finish Setting Up
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="rounded-lg border-2 border-error px-4 py-2 font-label-bold text-label-bold text-error transition-colors hover:bg-error hover:text-on-error"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-margin-mobile py-2 md:px-margin-desktop">
        <Logo size="sm" />
        <NotificationBell userId={session.id} />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <SideNav
          user={{
            name: session.name,
            role: roleLabel(session.role),
            community: session.community,
            avatarUrl: session.avatarUrl,
          }}
          isAdmin={canModerate(session.role)}
        />
        <main className="flex-1 overflow-y-auto bg-surface pb-24 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
