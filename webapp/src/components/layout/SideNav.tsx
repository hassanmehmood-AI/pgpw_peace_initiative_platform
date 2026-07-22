"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { useSession } from "@/lib/session";
import type { Community } from "@/components/ui/AffiliationChip";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  { label: "News Feed", href: "/feed", icon: "rss_feed" },
  { label: "Profile", href: "/profile", icon: "person" },
  { label: "Friends", href: "/friends", icon: "group" },
  { label: "Messages", href: "/messages", icon: "chat" },
  { label: "Forums", href: "/forums", icon: "forum" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export type SideNavUser = {
  name: string;
  role: string;
  community: Community;
  avatarUrl?: string;
};

type SideNavProps = {
  user?: SideNavUser;
  isAdmin?: boolean;
};

export function SideNav({ user, isAdmin = false }: SideNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useSession();

  // Matches Settings' existing "Log Out" button convention (send to the
  // marketing home rather than relying on (app)/layout.tsx's own
  // signed-out redirect to /login, which would otherwise flash a
  // "Redirecting to sign in…" login wall right after logging out).
  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-outline-variant bg-surface-container-low py-stack-md md:flex">
      <div className="mb-4 flex flex-col items-center border-b border-outline-variant px-6 pb-6">
        <Logo wordmark={false} size="sm" className="mb-4" />
        <Avatar
          name={user?.name ?? "Guest"}
          community={user?.community ?? "neutral"}
          avatarUrl={user?.avatarUrl}
          size="h-20 w-20 mb-3"
          textClass="font-headline-lg text-headline-lg"
        />
        <h2 className="text-center text-headline-md font-headline-md text-primary">
          {user?.name ?? "Guest"}
        </h2>
        <p className="mt-1 font-label-bold text-label-bold text-on-surface-variant">
          {user?.role ?? "Peace Builder"}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-stack-sm overflow-y-auto px-2 pb-24">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                active
                  ? "mx-2 my-1 flex items-center gap-3 rounded-lg bg-primary px-4 py-3 font-label-bold text-label-bold text-on-primary transition-transform duration-150"
                  : "mx-2 my-1 flex items-center gap-3 rounded-lg px-4 py-3 font-label-bold text-label-bold text-on-surface-variant transition-transform duration-150 hover:bg-secondary-fixed-dim"
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={
              pathname === "/admin"
                ? "mx-2 my-1 mt-auto flex items-center gap-3 rounded-lg bg-primary px-4 py-3 font-label-bold text-label-bold text-on-primary"
                : "mx-2 my-1 mt-auto flex items-center gap-3 rounded-lg px-4 py-3 font-label-bold text-label-bold text-on-surface-variant hover:bg-secondary-fixed-dim"
            }
          >
            <span className="material-symbols-outlined">shield_person</span>
            Admin
          </Link>
        )}
      </nav>

      <div className="border-t border-outline-variant px-2 pt-stack-sm">
        <button
          type="button"
          onClick={handleLogout}
          className="mx-2 my-1 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-4 py-3 font-label-bold text-label-bold text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
        >
          <span className="material-symbols-outlined">logout</span>
          Log Out
        </button>
      </div>
    </aside>
  );
}
