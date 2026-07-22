import { Logo } from "@/components/ui/Logo";

type FooterLink = {
  label: string;
  href: string;
  disabled?: boolean;
};

const footerLinks: FooterLink[] = [
  { label: "Quick Links", href: "#", disabled: true },
  { label: "Crisis Resources", href: "/safety" },
  { label: "Legal", href: "#", disabled: true },
  { label: "Safety Policy", href: "/safety" },
];

export function Footer() {
  return (
    <footer className="mt-auto flex w-full flex-col items-center gap-stack-md border-t-4 border-primary bg-primary px-margin-desktop py-stack-lg text-on-primary">
      <div className="flex w-full max-w-container-max flex-col items-center gap-4">
        <Logo tone="light" size="lg" wordmark={false} />
        <span className="font-headline-md text-headline-md font-extrabold tracking-tight">
          PeaceGangPeaceWorld
        </span>
        <div className="mt-4 flex flex-wrap justify-center gap-6">
          {footerLinks.map((link) =>
            link.disabled ? (
              <span
                key={link.label}
                aria-disabled
                className="cursor-not-allowed font-caption text-caption opacity-40"
              >
                {link.label}
              </span>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="font-caption text-caption opacity-80 transition-opacity duration-200 hover:text-secondary-fixed hover:opacity-100"
              >
                {link.label}
              </a>
            ),
          )}
        </div>
        <p className="mt-4 max-w-3xl text-center font-caption text-caption opacity-60">
          © 2026 PeaceGangPeaceWorld. All Rights Reserved. Peace-building
          disclaimer: This platform is dedicated to non-violence and mediator
          neutrality.
        </p>
      </div>
    </footer>
  );
}
