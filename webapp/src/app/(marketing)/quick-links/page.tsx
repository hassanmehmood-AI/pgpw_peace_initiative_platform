import Link from "next/link";

type QuickLink = {
  label: string;
  href: string;
  icon: string;
  description: string;
  authRequired?: boolean;
};

type LinkGroup = {
  title: string;
  links: QuickLink[];
};

const linkGroups: LinkGroup[] = [
  {
    title: "Get Started",
    links: [
      { label: "Home", href: "/", icon: "home", description: "Back to the landing page." },
      { label: "About PGPW", href: "/about", icon: "diversity_3", description: "Our mission, guidelines, and moderation model." },
      { label: "Sign Up", href: "/register", icon: "person_add", description: "Select your affiliation and create an account." },
      { label: "Sign In", href: "/login", icon: "login", description: "Access your existing account." },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Forums", href: "/forums", icon: "forum", description: "Join category discussions across the community.", authRequired: true },
      { label: "Feed", href: "/feed", icon: "dynamic_feed", description: "Your personalized activity feed.", authRequired: true },
      { label: "Friends", href: "/friends", icon: "group", description: "Manage your connections.", authRequired: true },
      { label: "Messages", href: "/messages", icon: "mail", description: "Direct messages with other members.", authRequired: true },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Profile", href: "/profile", icon: "account_circle", description: "View and edit your public profile.", authRequired: true },
      { label: "Settings", href: "/settings", icon: "settings", description: "Manage account and notification preferences.", authRequired: true },
    ],
  },
  {
    title: "Support & Safety",
    links: [
      { label: "Peace Resources", href: "/safety", icon: "shield", description: "Crisis resources and violation reporting.", authRequired: true },
      { label: "Legal", href: "/legal", icon: "gavel", description: "Terms of Engagement and data privacy." },
      { label: "Contact Us", href: "/contact", icon: "mail", description: "Send a query straight to the admin team." },
    ],
  },
];

export default function QuickLinksPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-outline-variant bg-surface-bright">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-stack-lg md:px-margin-desktop">
          <h1 className="font-display-lg text-display-lg text-primary">Quick Links</h1>
          <p className="mt-4 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Every section of PGPW in one place. Pages marked{" "}
            <span className="font-label-bold text-label-bold text-primary">Sign in required</span>{" "}
            need an active account.
          </p>
        </div>
      </section>

      <section className="bg-surface-container-low">
        <div className="mx-auto flex w-full max-w-container-max flex-col gap-stack-lg px-margin-mobile py-stack-lg md:px-margin-desktop">
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-4 font-headline-md text-headline-md text-primary">
                {group.title}
              </h2>
              <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm transition-colors duration-200 hover:border-primary"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="material-symbols-outlined text-surface-tint transition-colors group-hover:text-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {link.icon}
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
                        arrow_forward
                      </span>
                    </div>
                    <div>
                      <h3 className="font-label-bold text-label-bold text-on-surface">
                        {link.label}
                      </h3>
                      <p className="mt-1 text-sm font-body-md text-on-surface-variant">
                        {link.description}
                      </p>
                    </div>
                    {link.authRequired && (
                      <span className="font-caption text-caption uppercase tracking-wider text-primary">
                        Sign in required
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
