"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  { label: "Feed", href: "/feed", icon: "home" },
  { label: "Forums", href: "/forums", icon: "forum" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t-2 border-primary bg-surface-container-lowest px-2 py-3 md:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 transition-colors ${
              active ? "text-primary" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-label-bold">{item.label}</span>
          </Link>
        );
      })}

      <Link
        href="/feed#feed-composer"
        aria-label="Create post"
        className="-translate-y-6 flex h-12 w-12 items-center justify-center rounded-full border-4 border-background bg-primary text-on-primary shadow-xl transition-transform active:scale-90"
      >
        <span className="material-symbols-outlined">add</span>
      </Link>

      <Link
        href="/messages"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === "/messages" ? "text-primary" : "text-on-surface-variant hover:text-primary"
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={pathname === "/messages" ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          chat
        </span>
        <span className="text-[10px] font-label-bold">Messages</span>
      </Link>

      <Link
        href="/profile"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === "/profile" ? "text-primary" : "text-on-surface-variant hover:text-primary"
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={pathname === "/profile" ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          person
        </span>
        <span className="text-[10px] font-label-bold">Profile</span>
      </Link>
    </nav>
  );
}
