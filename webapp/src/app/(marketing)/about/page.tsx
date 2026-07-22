import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const stats: { icon: string; label: string; value: string; inverse?: boolean }[] = [
  { icon: "group", label: "Registered Members", value: "14,205" },
  { icon: "forum", label: "Discussions Completed", value: "8,492" },
  { icon: "handshake", label: "Community Partnerships", value: "127" },
  {
    icon: "shield_check",
    label: "Conflicts Safely Reported",
    value: "3,104",
    inverse: true,
  },
];

const guidelines = [
  {
    title: "1. Respect the Neutral Zone",
    body: "Leave organizational rivalries at the door. The platform is for resolution, not escalation.",
    emphasized: true,
  },
  {
    title: "2. No Incitement",
    body: "Zero tolerance for calls to violence, doxxing, or organizing harm against any individual or group.",
  },
  {
    title: "3. Constructive Engagement",
    body: "Debate is encouraged; personal attacks are not. Focus on issues, not identities.",
  },
  {
    title: "4. Protect Privacy",
    body: "Do not share screenshots of private mediated sessions without explicit consent from all parties.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-outline-variant bg-surface-bright">
        <div className="mx-auto grid w-full max-w-container-max grid-cols-1 items-center gap-gutter px-margin-mobile py-stack-lg md:grid-cols-12 md:px-margin-desktop">
          <div className="flex flex-col gap-stack-md md:col-span-7">
            <h1 className="font-display-lg text-display-lg text-primary">
              Radical Neutrality.
            </h1>
            <h2 className="font-headline-lg text-headline-lg-mobile text-surface-tint md:text-headline-lg">
              Building bridges in a divided world.
            </h2>
            <p className="mt-4 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              PeaceGangPeaceWorld is a digital mediator. We provide a
              neutral, uncompromising platform designed to facilitate
              dialogue, reduce conflict, and empower grassroots movements
              through secure communication and shared resources.
            </p>
          </div>
          <div className="mt-stack-lg flex justify-center md:col-span-5 md:mt-0 md:justify-end">
            <ImagePlaceholder
              icon="diversity_3"
              className="h-64 w-64 rounded-lg border md:h-80 md:w-80"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-stack-lg md:px-margin-desktop">
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={
                  stat.inverse
                    ? "rounded-xl border border-primary bg-primary p-6"
                    : "group rounded-xl border border-outline-variant p-6 transition-all duration-200 hover:border-primary"
                }
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={
                      stat.inverse
                        ? "material-symbols-outlined text-on-primary"
                        : "material-symbols-outlined text-surface-tint transition-colors group-hover:text-primary"
                    }
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {stat.icon}
                  </span>
                  <span
                    className={
                      stat.inverse
                        ? "font-label-bold text-label-bold uppercase tracking-wider text-[10px] text-on-primary"
                        : "font-label-bold text-label-bold uppercase tracking-wider text-[10px] text-on-surface-variant"
                    }
                  >
                    {stat.label}
                  </span>
                </div>
                <p
                  className={
                    stat.inverse
                      ? "font-headline-lg text-headline-lg text-on-primary"
                      : "font-headline-lg text-headline-lg text-primary"
                  }
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed sections */}
      <section className="bg-surface-container-low">
        <div className="mx-auto flex w-full max-w-container-max flex-col gap-stack-lg px-margin-mobile py-stack-lg md:px-margin-desktop">
          {/* Our Mission */}
          <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-12">
            <div className="md:sticky md:top-24 md:col-span-4">
              <h3 className="mb-2 font-headline-md text-headline-md text-primary">
                Our Mission
              </h3>
              <div className="h-1 w-12 bg-primary" />
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm md:col-span-8">
              <p className="mb-4 font-body-lg text-body-lg text-on-surface">
                To provide a strictly neutral, high-security digital
                environment where conflicting parties can engage in mediated
                dialogue without fear of censorship, surveillance, or bias.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                We believe that peace is an active pursuit requiring robust
                tools. Our platform acts as a demilitarized zone on the
                internet, offering resources for conflict resolution, trauma
                support, and community building, independent of state or
                corporate interference.
              </p>
            </div>
          </div>

          {/* Why PGPW Exists */}
          <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-12">
            <div className="md:sticky md:top-24 md:col-span-4">
              <h3 className="mb-2 font-headline-md text-headline-md text-primary">
                Why PGPW Exists
              </h3>
              <div className="h-1 w-12 bg-primary" />
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm md:col-span-8">
              <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
                Traditional social media platforms thrive on algorithmic
                division, amplifying conflict for engagement. PGPW was built
                as a direct counter-measure to this architecture of
                hostility.
              </p>
              <ul className="flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-1 text-primary">
                    check_circle
                  </span>
                  <div>
                    <h4 className="font-label-bold text-label-bold text-on-surface">
                      Algorithmic Neutrality
                    </h4>
                    <p className="text-sm font-body-md text-on-surface-variant">
                      No feed manipulation. Content is displayed
                      chronologically or based on user-defined priority.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-1 text-primary">
                    check_circle
                  </span>
                  <div>
                    <h4 className="font-label-bold text-label-bold text-on-surface">
                      Data Sovereignty
                    </h4>
                    <p className="text-sm font-body-md text-on-surface-variant">
                      User data is never monetized. End-to-end encryption
                      ensures conversations remain private.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Community Guidelines */}
          <div
            id="guidelines"
            className="grid scroll-mt-24 grid-cols-1 items-start gap-gutter md:grid-cols-12"
          >
            <div className="md:sticky md:top-24 md:col-span-4">
              <h3 className="mb-2 font-headline-md text-headline-md text-primary">
                Community Guidelines
              </h3>
              <div className="h-1 w-12 bg-primary" />
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm md:col-span-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {guidelines.map((guideline) => (
                  <div
                    key={guideline.title}
                    className={
                      guideline.emphasized
                        ? "border-l-2 border-primary pl-4"
                        : "border-l-2 border-outline-variant pl-4"
                    }
                  >
                    <h4 className="mb-2 font-label-bold text-label-bold text-on-surface">
                      {guideline.title}
                    </h4>
                    <p className="text-sm font-body-md text-on-surface-variant">
                      {guideline.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Safety & Moderation */}
          <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-12">
            <div className="md:sticky md:top-24 md:col-span-4">
              <h3 className="mb-2 font-headline-md text-headline-md text-primary">
                Safety &amp; Moderation
              </h3>
              <div className="h-1 w-12 bg-primary" />
            </div>
            <div className="rounded-xl border border-primary bg-primary p-8 text-on-primary shadow-sm md:col-span-8">
              <p className="mb-4 font-body-md text-body-md">
                Moderation on PGPW is handled by a decentralized council of
                verified community mediators, ensuring that decisions are
                context-aware and culturally competent, rather than relying
                on blunt automated systems.
              </p>
              <div className="mt-6 flex items-center gap-4 rounded-lg bg-tertiary-container p-4">
                <span
                  className="material-symbols-outlined text-error"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <p className="font-caption text-caption text-secondary-fixed">
                  If you are in immediate physical danger, please contact
                  local emergency services. PGPW is a mediation platform, not
                  an emergency response service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
