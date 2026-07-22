import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AffiliationChip, communityMeta, type Community } from "@/components/ui/AffiliationChip";

const registrationCommunities: Community[] = ["crip", "blood", "latin_king", "deceptacon"];

const ambassadors: {
  name: string;
  community: Community;
  role: string;
  quote?: string;
  featured?: boolean;
  image: string;
}[] = [
  {
    name: "Marcus 'Trey' Johnson",
    community: "crip",
    role: "Community Representative",
    quote:
      "Control your tongue and your urges, and you eliminate almost all your drama.",
    featured: true,
    image: "/images/landing/ambassador-marcus.jpg",
  },
  {
    name: "Elena Rodriguez",
    community: "blood",
    role: "Community Organizer",
    image: "/images/landing/ambassador-elena.jpg",
  },
  {
    name: "David 'OG' Smith",
    community: "latin_king",
    role: "Youth Mentor / Speaker",
    image: "/images/landing/ambassador-david.jpg",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-secondary-fixed">
        <div className="mx-auto flex w-full max-w-container-max flex-col items-center gap-gutter px-margin-mobile py-stack-lg md:flex-row md:px-margin-desktop md:py-[80px]">
          <div className="z-10 flex flex-1 flex-col gap-stack-md">
            <h1 className="font-display-lg text-display-lg uppercase leading-none tracking-tighter text-primary md:text-[64px]">
              Ending Violence
              <br />
              Through <span className="text-on-surface-variant">Unity</span>.
            </h1>
            <p className="mt-4 max-w-xl border-l-4 border-primary pl-4 font-body-lg text-body-lg text-on-surface-variant">
              A moderated digital space dedicated to bridging divides. We
              foster positive connections, communication, and digital
              community building across neutral territory.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Button href="/register" size="lg" variant="primary" className="uppercase">
                Join the Movement
              </Button>
              <Button href="/forums" size="lg" variant="secondary" className="uppercase">
                Explore Communities
              </Button>
            </div>
          </div>
          <div className="group relative mt-8 h-[400px] w-full flex-1 md:mt-0 md:h-[600px]">
            <div className="halftone-bg ambient-shadow absolute inset-0 overflow-hidden rounded-xl border-4 border-primary">
              <Image
                src="/images/landing/hero-unity.jpg"
                alt="A geometric light installation symbolizing unity and connection in an urban plaza at night"
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover mix-blend-multiply opacity-80 transition-opacity duration-500 group-hover:opacity-100"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-primary mix-blend-exclusion" />
            <div className="absolute top-8 -right-4 h-16 w-16 rotate-12 border-4 border-primary" />
          </div>
        </div>
      </section>

      {/* Community Registration */}
      <section className="border-b border-secondary-fixed">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-stack-lg md:px-margin-desktop">
          <div className="mb-stack-lg">
            <h2 className="inline-block border-b-4 border-primary pb-2 font-headline-lg text-headline-lg uppercase tracking-tight text-primary">
              Community Registration
            </h2>
            <p className="mt-2 max-w-2xl font-body-md text-on-surface-variant">
              Select your community to begin the registration process. PGPW
              acts as a neutral mediator ensuring respectful dialogue.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
            {registrationCommunities.map((community) => {
              const meta = communityMeta[community];
              return (
                <Card
                  key={community}
                  hoverable
                  className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 ${meta.className}`}
                    >
                      <span className="material-symbols-outlined text-[32px]">
                        {meta.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline-md text-headline-md text-primary">
                        {meta.label} Community
                      </h3>
                      <p className="mt-1 font-body-md text-sm text-on-surface-variant">
                        Register for verified access and dialogue.
                      </p>
                    </div>
                  </div>
                  <Button href="/register" variant="secondary" className="w-full sm:w-auto">
                    Register
                  </Button>
                </Card>
              );
            })}
          </div>

          <div className="mt-stack-md flex items-start gap-4 border-l-4 border-primary bg-surface-container-high p-4">
            <span className="material-symbols-outlined mt-1 text-primary">
              gavel
            </span>
            <div>
              <h4 className="font-label-bold text-label-bold text-primary">
                Strict Anti-Violence Policy
              </h4>
              <p className="mt-1 font-caption text-caption text-on-surface-variant">
                PGPW is a strictly moderated neutral zone. All registrants
                must agree to our terms of peaceful dialogue. Threats,
                incitement, or glorification of violence will result in
                immediate permanent bans. We build bridges, not divisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Peace Ambassadors */}
      <section>
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-stack-lg md:px-margin-desktop">
          <div className="mb-stack-lg flex items-end justify-between border-b border-outline-variant pb-4">
            <div>
              <h2 className="font-headline-lg text-headline-lg uppercase tracking-tight text-primary">
                Peace Ambassadors
              </h2>
              <p className="mt-1 font-body-md text-on-surface-variant">
                Leaders paving the way through music and dialogue.
              </p>
            </div>
            <span
              aria-disabled
              className="hidden cursor-not-allowed items-center gap-1 font-label-bold text-on-surface-variant opacity-40 sm:flex"
            >
              View All Roster
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
            {ambassadors
              .filter((a) => a.featured)
              .map((ambassador) => (
                <Card
                  key={ambassador.name}
                  as="article"
                  hoverable
                  padding="none"
                  className="group flex flex-col overflow-hidden md:col-span-8 md:flex-row"
                >
                  <div className="relative h-[300px] md:h-auto md:w-2/5">
                    <Image
                      src={ambassador.image}
                      alt={`Portrait of ${ambassador.name}`}
                      fill
                      sizes="(min-width: 768px) 40vw, 100vw"
                      className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                    />
                    <div className="absolute left-4 top-4">
                      <Badge tone="inverse">
                        <span className="material-symbols-outlined text-[12px]">
                          verified
                        </span>
                        Ambassador
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between p-6 md:w-3/5">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <AffiliationChip community={ambassador.community} />
                        <span className="font-caption text-sm text-on-surface-variant">
                          Joined 2023
                        </span>
                      </div>
                      <h3 className="mt-2 font-headline-md text-headline-md text-primary">
                        {ambassador.name}
                      </h3>
                      {ambassador.quote && (
                        <p className="mt-3 text-sm font-body-md text-on-surface-variant">
                          &ldquo;{ambassador.quote}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

            <div className="flex flex-col gap-gutter md:col-span-4">
              {ambassadors
                .filter((a) => !a.featured)
                .map((ambassador) => (
                  <Card
                    key={ambassador.name}
                    hoverable
                    className="group flex items-center gap-4"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={ambassador.image}
                        alt={`Portrait of ${ambassador.name}`}
                        fill
                        sizes="80px"
                        className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-label-bold text-primary">
                          {ambassador.name}
                        </h4>
                        <span className="material-symbols-outlined text-sm text-outline">
                          open_in_new
                        </span>
                      </div>
                      <AffiliationChip
                        community={ambassador.community}
                        size="sm"
                        className="mt-1"
                      />
                      <p className="mt-1 truncate font-caption text-on-surface-variant">
                        {ambassador.role}
                      </p>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
