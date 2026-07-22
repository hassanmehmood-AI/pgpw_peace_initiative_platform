import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AffiliationChip } from "@/components/ui/AffiliationChip";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";

const communities = ["crip", "blood", "latin_king", "deceptacon", "neutral"] as const;

export default function StyleGuidePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />

      <div className="flex flex-1">
        <SideNav
          user={{ name: "Marcus Johnson", role: "Peace Builder", community: "crip" }}
          isAdmin
        />

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-stack-lg px-margin-mobile py-stack-lg pb-32 md:px-gutter">
          <section className="flex flex-col gap-stack-md">
            <h1 className="font-headline-lg text-headline-lg text-primary">
              Phase A1 — Design System
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Every reusable component in one place, for visual QA against the
              mockups before wiring real pages.
            </p>
          </section>

          <section className="flex flex-col gap-stack-sm">
            <h2 className="font-headline-md text-headline-md text-primary">Buttons</h2>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="primary" href="/register">
                As Link
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-stack-sm">
            <h2 className="font-headline-md text-headline-md text-primary">Badges</h2>
            <div className="flex flex-wrap items-center gap-4">
              <Badge tone="neutral">Topic Focus</Badge>
              <Badge tone="inverse">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Ambassador
              </Badge>
            </div>
          </section>

          <section className="flex flex-col gap-stack-sm">
            <h2 className="font-headline-md text-headline-md text-primary">
              Affiliation Chips
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {communities.map((community) => (
                <AffiliationChip key={community} community={community} showIcon />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {communities.map((community) => (
                <AffiliationChip
                  key={community}
                  community={community}
                  selected
                  showIcon
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-stack-sm">
            <h2 className="font-headline-md text-headline-md text-primary">Cards</h2>
            <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
              <Card hoverable>
                <h3 className="font-headline-md text-headline-md text-primary">
                  Default Card
                </h3>
                <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                  bg-surface-container-lowest, border-outline-variant, rounded-xl.
                </p>
              </Card>
              <Card as="article" hoverable className="halftone-bg">
                <h3 className="font-headline-md text-headline-md text-primary">
                  Halftone Card
                </h3>
                <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                  Decorative texture variant for featured content.
                </p>
              </Card>
            </div>
          </section>

          <section className="flex flex-col gap-stack-sm">
            <h2 className="font-headline-md text-headline-md text-primary">
              Typography Scale
            </h2>
            <p className="font-display-lg text-display-lg text-primary">Display LG</p>
            <p className="font-headline-lg text-headline-lg text-primary">Headline LG</p>
            <p className="font-headline-md text-headline-md text-primary">Headline MD</p>
            <p className="font-body-lg text-body-lg text-on-surface">Body LG</p>
            <p className="font-body-md text-body-md text-on-surface">Body MD</p>
            <p className="font-label-bold text-label-bold text-on-surface">Label Bold</p>
            <p className="font-caption text-caption text-on-surface-variant">Caption</p>
          </section>
        </main>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
