"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
    <aside className="z-40 hidden h-full w-64 flex-shrink-0 flex-col justify-between overflow-hidden border-r border-outline-variant bg-surface-container-low md:flex">
      <div className="flex flex-col items-center gap-0.5 border-b border-outline-variant px-6 py-3">
        <Avatar
          name={user?.name ?? "Guest"}
          community={user?.community ?? "neutral"}
          avatarUrl={user?.avatarUrl}
          size="h-14 w-14 mb-1.5"
          textClass="font-headline-md text-headline-md"
        />
        <h2 className="text-center font-label-bold text-label-bold text-primary">
          {user?.name ?? "Guest"}
        </h2>
        <p className="font-caption text-caption text-on-surface-variant">
          {user?.role ?? "Peace Builder"}
        </p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col justify-center gap-0.5 px-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-lg bg-primary px-4 py-2 font-label-bold text-label-bold text-on-primary transition-transform duration-150"
                  : "flex items-center gap-3 rounded-lg px-4 py-2 font-label-bold text-label-bold text-on-surface-variant transition-transform duration-150 hover:bg-secondary-fixed-dim"
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={
              pathname === "/admin"
                ? "flex items-center gap-3 rounded-lg bg-primary px-4 py-2 font-label-bold text-label-bold text-on-primary"
                : "flex items-center gap-3 rounded-lg px-4 py-2 font-label-bold text-label-bold text-on-surface-variant hover:bg-secondary-fixed-dim"
            }
          >
            <span className="material-symbols-outlined text-[20px]">shield_person</span>
            Admin
          </Link>
        )}
      </nav>

      <div className="flex justify-end border-t border-outline-variant px-4 py-2">
        <button
          type="button"
          onClick={handleLogout}
          title="Log Out"
          aria-label="Log Out"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </aside>
  );
}
