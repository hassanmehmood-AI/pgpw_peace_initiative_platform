"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_VALUES, reportSchema, type ReportFormValues } from "@/lib/validation/report";

// ---------------------------------------------------------------------------
// Violation category display labels (mirrors the mockup's category list)
// ---------------------------------------------------------------------------
const violationCategories: { value: (typeof CATEGORY_VALUES)[number]; label: string }[] = [
  { value: "threat", label: "Direct Threat of Violence" },
  { value: "hate_speech", label: "Hate Speech / Dehumanization" },
  { value: "doxxing", label: "Doxxing / Privacy Breach" },
  { value: "impersonation", label: "Impersonation" },
  { value: "harassment", label: "Harassment" },
  { value: "recruitment", label: "Recruitment" },
];

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------
const crisisResources = [
  { label: "Emergency Services", href: "tel:911", icon: "call" },
  { label: "988 Suicide & Crisis Lifeline", href: "tel:988", icon: "call" },
  { label: "Crisis Text Line — Text HOME to 741741", href: "sms:741741", icon: "chat_bubble" },
  { label: "Neutrality Mediation Contact", href: "mailto:mediators@peacegangpeaceworld.org", icon: "forum" },
];

const pillars = [
  { title: "Zero Violence Tolerance", body: "No threats, intimidation, or promotion of harm." },
  { title: "Respect the Neutral Ground", body: "Leave conflicts at the door; this is a space for dialogue." },
  { title: "No Recruitment", body: "Actively discouraging recruitment into violent or illegal organizations." },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SafetyPage() {
  const { session } = useSession();
  const supabase = useMemo(() => createClient(), []);
  const [submitted, setSubmitted] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { target: "", details: "" },
    mode: "onSubmit",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    // `reports.target_id` is a bare uuid with no FK constraint (it's
    // polymorphic — meaning depends on target_type), and the "Entity
    // Involved" field is free text (a username, or just a group name), so it
    // won't always resolve to a real profile. Try to resolve it to get a
    // real cross-reference for moderators; fall back to target_type
    // "general" either way, folding the raw text into the description so
    // it's never silently dropped even when it doesn't resolve.
    let targetType: "user" | "general" = "general";
    let targetId: string | null = null;
    const entity = values.target?.trim();
    if (entity) {
      const { data: matchedProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", entity.replace(/^@/, ""))
        .maybeSingle();
      if (matchedProfile) {
        targetType = "user";
        targetId = matchedProfile.id;
      }
    }

    const description = entity ? `Entity involved: ${entity}\n\n${values.details}` : values.details;

    const { error } = await supabase.from("reports").insert({
      reporter_id: anonymous ? null : (session?.id ?? null),
      target_type: targetType,
      target_id: targetId,
      category: values.category,
      description,
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSubmitted(true);
    setAnonymous(false);
    reset();
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      <header className="mb-stack-lg border-b border-outline-variant pb-stack-md">
        <h1 className="mb-2 font-headline-lg text-headline-lg text-primary md:font-display-lg md:text-display-lg">
          Safety &amp; Reporting
        </h1>
        <p className="max-w-3xl font-body-lg text-body-lg text-on-surface-variant">
          Your security and the neutrality of this platform are our top priorities. Use the
          tools below to report violations or access immediate crisis resources.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* Sidebar — shown first on mobile for priority, right column on desktop */}
        <div className="order-1 flex flex-col gap-stack-lg lg:order-2 lg:col-span-4">
          {/* Crisis resources */}
          <section className="relative overflow-hidden rounded-lg border border-error bg-error-container p-6">
            <span
              className="material-symbols-outlined pointer-events-none absolute -top-4 -right-4 text-error opacity-10"
              style={{ fontSize: 140 }}
            >
              emergency
            </span>
            <div className="relative z-10 flex flex-col gap-stack-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error">warning</span>
                <h2 className="font-headline-md text-headline-md text-on-error-container">
                  Immediate Help
                </h2>
              </div>
              <p className="font-body-md text-body-md text-on-error-container">
                If you or someone else is in immediate physical danger, contact local
                emergency services right away. PGPW is a mediation platform, not an
                emergency response service.
              </p>
              <div className="flex flex-col gap-3">
                {crisisResources.map((resource) => (
                  <a
                    key={resource.label}
                    href={resource.href}
                    className="flex items-center justify-between rounded-lg border border-error bg-surface-container-lowest p-3 transition-colors hover:bg-surface-container-low"
                  >
                    <span className="font-label-bold text-label-bold text-error">
                      {resource.label}
                    </span>
                    <span className="material-symbols-outlined text-error">
                      {resource.icon}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* Platform pillars / guidelines reminder */}
          <section className="rounded-lg border border-outline-variant bg-surface-container-high p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">gavel</span>
              <h2 className="font-headline-md text-headline-md text-primary">
                Platform Pillars
              </h2>
            </div>
            <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
              By participating in PGPW, you agree to uphold our core tenets of Radical
              Neutrality.
            </p>
            <ul className="flex flex-col gap-4">
              {pillars.map((pillar) => (
                <li key={pillar.title} className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-primary">
                    check_circle
                  </span>
                  <div>
                    <strong className="block font-label-bold text-label-bold text-primary">
                      {pillar.title}
                    </strong>
                    <span className="font-caption text-caption text-on-surface-variant">
                      {pillar.body}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/about#guidelines"
              className="mt-6 inline-block font-label-bold text-label-bold text-primary underline transition-colors hover:text-on-surface-variant"
            >
              Read Full Guidelines
            </Link>
          </section>
        </div>

        {/* Report form */}
        <div className="order-2 lg:order-1 lg:col-span-8">
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
            <div className="mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-error">report</span>
              <h2 className="font-headline-md text-headline-md text-primary">
                Report a Violation
              </h2>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center gap-stack-md rounded-lg border border-primary bg-surface-container-high p-8 text-center">
                <span className="material-symbols-outlined text-[48px] text-primary">
                  check_circle
                </span>
                <h3 className="font-headline-md text-headline-md text-primary">
                  Report Submitted
                </h3>
                <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
                  Our neutral mediation team will review this within 24 hours. Thank you for
                  helping keep PGPW a safe space.
                </p>
                <Button type="button" variant="secondary" onClick={() => setSubmitted(false)}>
                  Submit Another Report
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-stack-md">
                {submitError && (
                  <p
                    className="flex items-center gap-2 rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container"
                    role="alert"
                  >
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {submitError}
                  </p>
                )}

                {/* Violation category */}
                <div>
                  <label className="mb-2 block font-label-bold text-label-bold text-primary">
                    Category of Violation
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {violationCategories.map((cat) => (
                      <label
                        key={cat.value}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant p-4 transition-colors has-checked:border-2 has-checked:border-primary has-checked:bg-secondary-fixed hover:bg-surface-container-low"
                      >
                        <input
                          type="radio"
                          value={cat.value}
                          {...register("category")}
                          className="text-primary focus:ring-primary border-outline"
                        />
                        <span className="font-body-md text-body-md">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.category && (
                    <p className="mt-2 flex items-center gap-1 font-caption text-caption text-error" role="alert">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.category.message}
                    </p>
                  )}
                </div>

                {/* Target */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="report-target" className="font-label-bold text-label-bold text-primary">
                    Entity Involved (Username or Group, optional)
                  </label>
                  <input
                    id="report-target"
                    type="text"
                    placeholder="@username"
                    {...register("target")}
                    className={`w-full rounded-lg border bg-surface-container-lowest px-4 py-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                      errors.target ? "border-2 border-error" : "border-outline-variant"
                    }`}
                  />
                  {errors.target && (
                    <p className="flex items-center gap-1 font-caption text-caption text-error" role="alert">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.target.message}
                    </p>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="report-details" className="font-label-bold text-label-bold text-primary">
                    Detailed Evidence
                  </label>
                  <textarea
                    id="report-details"
                    rows={5}
                    placeholder="Describe the incident, including date, time, and specific content."
                    {...register("details")}
                    className={`w-full rounded-lg border bg-surface-container-lowest p-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                      errors.details ? "border-2 border-error" : "border-outline-variant"
                    }`}
                  />
                  {errors.details && (
                    <p className="flex items-center gap-1 font-caption text-caption text-error" role="alert">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.details.message}
                    </p>
                  )}
                </div>

                {/* Anonymous toggle */}
                <label
                  htmlFor="report-anonymous"
                  className="flex cursor-pointer items-start gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-4"
                >
                  <div className="relative mt-1 flex items-center justify-center">
                    <input
                      id="report-anonymous"
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="peer h-6 w-6 appearance-none rounded border-2 border-outline bg-surface-container-lowest transition-all checked:border-primary checked:bg-primary"
                    />
                    <span
                      className="material-symbols-outlined pointer-events-none absolute text-on-primary opacity-0 transition-opacity peer-checked:opacity-100"
                      style={{ fontSize: 18 }}
                    >
                      check
                    </span>
                  </div>
                  <div>
                    <h4 className="font-label-bold text-label-bold text-primary">
                      Report Anonymously
                    </h4>
                    <p className="mt-1 font-caption text-caption text-on-surface-variant">
                      {anonymous
                        ? "Your identity will not be shared with the reported user or shown in the mediation log."
                        : `Reports are handled with strict confidentiality — this will be logged as submitted by ${session?.name ?? "you"}.`}
                    </p>
                  </div>
                </label>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="w-full disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit Report
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
