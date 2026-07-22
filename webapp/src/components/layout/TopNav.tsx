"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/session";

type NavLink = {
  label: string;
  href: string;
  disabled?: boolean;
};

const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Forums", href: "/forums" },
  { label: "Members", href: "#", disabled: true },
  { label: "Peace Resources", href: "/safety" },
  { label: "About", href: "/about" },
];

const iconActions = ["search", "mail", "notifications"];

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, logout } = useSession();

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-primary bg-surface-container-lowest">
      <div className="mx-auto flex w-full max-w-container-max items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
        <Logo />

        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            if (link.disabled) {
              return (
                <span
                  key={link.label}
                  aria-disabled
                  className="cursor-not-allowed text-on-surface-variant opacity-40"
                >
                  {link.label}
                </span>
              );
            }
            return (
              <a
                key={link.label}
                href={link.href}
                className={
                  active
                    ? "border-b-2 border-primary pb-1 font-bold text-primary"
                    : "rounded px-3 py-2 text-on-surface-variant transition-colors hover:bg-secondary-fixed hover:text-primary"
                }
              >
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden gap-3 md:flex">
            {iconActions.map((icon) => (
              <button
                key={icon}
                type="button"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined">{icon}</span>
              </button>
            ))}
          </div>
          <div className="hidden sm:flex sm:items-center sm:gap-3">
            {session ? (
              <>
                <Button href="/feed" variant="primary">
                  Go to Feed
                </Button>
                <Button variant="ghost" onClick={logout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button href="/login" variant="secondary">
                  Login
                </Button>
                <Button href="/register" variant="primary">
                  Sign Up
                </Button>
              </>
            )}
          </div>
          <button
            type="button"
            className="text-primary md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="material-symbols-outlined text-[32px]">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="flex flex-col gap-1 border-t border-outline-variant px-margin-mobile py-4 md:hidden">
          {navLinks.map((link) =>
            link.disabled ? (
              <span
                key={link.label}
                aria-disabled
                className="cursor-not-allowed rounded px-3 py-2 text-on-surface-variant opacity-40"
              >
                {link.label}
              </span>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="rounded px-3 py-2 text-on-surface-variant hover:bg-secondary-fixed hover:text-primary"
              >
                {link.label}
              </a>
            ),
          )}
          <div className="mt-3 flex gap-3">
            {session ? (
              <>
                <Button href="/feed" variant="primary" className="flex-1">
                  Go to Feed
                </Button>
                <Button variant="ghost" onClick={logout} className="flex-1">
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button href="/login" variant="secondary" className="flex-1">
                  Login
                </Button>
                <Button href="/register" variant="primary" className="flex-1">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
