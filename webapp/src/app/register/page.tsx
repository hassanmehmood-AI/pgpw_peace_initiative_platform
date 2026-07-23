"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";
import type { Community } from "@/components/ui/AffiliationChip";
import { profileSchema } from "@/lib/validation/registration";

// Step 2 needs a password too (real Supabase auth requires one), but the
// shared profileSchema (username + email) stays untouched — it has its own
// tests and Step 2 is the only place a password is collected.
const step2Schema = profileSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Step2Fields = z.infer<typeof step2Schema>;

// ---------------------------------------------------------------------------
// Affiliation options (mirrors the mockup exactly)
// ---------------------------------------------------------------------------
type AffiliationOption = {
  value: Community | "independent" | "supporter" | "volunteer" | "organization";
  label: string;
  subtitle: string;
  cssClass: string;
  // For session we map non-core affiliations → "neutral"
  sessionCommunity: Community;
};

const AFFILIATIONS: AffiliationOption[] = [
  { value: "crip",         label: "Crip",                      subtitle: "Community Representative", cssClass: "affiliation-card-crip",         sessionCommunity: "crip" },
  { value: "blood",        label: "Blood",                     subtitle: "Community Representative", cssClass: "affiliation-card-blood",        sessionCommunity: "blood" },
  { value: "latin_king",   label: "Latin King",                subtitle: "Community Representative", cssClass: "affiliation-card-latin_king",   sessionCommunity: "latin_king" },
  { value: "deceptacon",   label: "Deceptacon",                subtitle: "Community Representative", cssClass: "affiliation-card-deceptacon",   sessionCommunity: "deceptacon" },
  { value: "independent",  label: "Independent / No Affiliation", subtitle: "Citizen",              cssClass: "affiliation-neutral",       sessionCommunity: "neutral" },
  { value: "supporter",    label: "Community Supporter",       subtitle: "Ally",                     cssClass: "affiliation-neutral",       sessionCommunity: "neutral" },
  { value: "volunteer",    label: "Peace Volunteer",           subtitle: "Active Contributor",       cssClass: "affiliation-neutral",       sessionCommunity: "neutral" },
  { value: "organization", label: "Organization Representative", subtitle: "NGO / Govt / Charity",  cssClass: "affiliation-neutral",       sessionCommunity: "neutral" },
];

// ---------------------------------------------------------------------------
// Step labels shown in the progress header
// ---------------------------------------------------------------------------
const STEP_LABELS = ["Affiliation", "Profile", "Verification", "Agreement"];
const TOTAL_STEPS = STEP_LABELS.length;
const AGREEMENT_STEP = STEP_LABELS.indexOf("Agreement") + 1;
const VERIFICATION_STEP = STEP_LABELS.indexOf("Verification") + 1;

// ---------------------------------------------------------------------------
// Main registration page
// ---------------------------------------------------------------------------
export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { refreshSession } = useSession();

  // Wizard state
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  // "Resuming" = already has a Supabase auth user (signUp already happened,
  // possibly in an earlier visit) but no `profiles` row yet — i.e. a
  // registration that was interrupted before the final step. Detected on
  // mount so goNext() can skip straight past the email/password/OTP steps
  // they already completed instead of asking them to sign up again with an
  // email that's already taken. `null` = still checking.
  const [resuming, setResuming] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setResuming(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (profile) {
        // Already fully registered — nothing to do here.
        router.replace("/feed");
        return;
      }
      setResuming(true);
    })();
    return () => {
      active = false;
    };
  }, [supabase, router]);

  // Step 1 state
  const [selectedAffiliation, setSelectedAffiliation] = useState<AffiliationOption | null>(null);

  // Step 2 state — react-hook-form
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid: profileIsValid },
    trigger,
  } = useForm<Step2Fields>({
    resolver: zodResolver(step2Schema),
    mode: "onChange",
  });
  const [signingUp, setSigningUp] = useState(false);

  // Step 3 state — email OTP verification
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Step 4 state
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Navigation helpers
  // -------------------------------------------------------------------------
  const canGoNext = () => {
    if (step === 1) return selectedAffiliation !== null;
    if (step === 2) return profileIsValid;
    if (step === VERIFICATION_STEP) return otp.trim().length === 6;
    if (step === AGREEMENT_STEP) return agreed;
    return false;
  };

  const goNext = async () => {
    setStepError(null);

    if (step === 1) {
      setStep(resuming ? AGREEMENT_STEP : 2);
      return;
    }

    if (step === 2) {
      // Re-validate before advancing so errors surface if Next is clicked programmatically
      const ok = await trigger();
      if (!ok) return;

      setSigningUp(true);
      const { email, password } = getValues();
      const { data, error } = await supabase.auth.signUp({ email, password });
      setSigningUp(false);
      if (error) {
        setStepError(error.message);
        return;
      }
      // If the project has "Confirm email" disabled, signUp() already returns
      // a live session — there's no code to verify, so skip straight past it.
      setStep(data.session ? AGREEMENT_STEP : VERIFICATION_STEP);
      return;
    }

    if (step === VERIFICATION_STEP) {
      setVerifying(true);
      const { email } = getValues();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "signup",
      });
      setVerifying(false);
      if (error) {
        setStepError(error.message);
        return;
      }
      setStep(AGREEMENT_STEP);
      return;
    }

    handleComplete();
  };

  const handleResend = async () => {
    setStepError(null);
    setResendMessage(null);
    setResending(true);
    const { email } = getValues();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      setStepError(error.message);
      return;
    }
    setResendMessage("A new code was sent — check your inbox.");
  };

  const goBack = () => {
    setStepError(null);
    if (step > 1) setStep((s) => s - 1);
  };

  const handleComplete = async () => {
    setStepError(null);
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStepError(
        "Couldn't confirm your account — this usually means email confirmation is still required on the Supabase project. Try signing in from the login page instead.",
      );
      setSubmitting(false);
      return;
    }

    const { username } = getValues();
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      community_affiliation: selectedAffiliation!.sessionCommunity,
      agreed_at: new Date().toISOString(),
    });

    if (error) {
      setStepError(
        error.code === "23505"
          ? "That username is already taken — go back and choose another."
          : error.message,
      );
      setSubmitting(false);
      return;
    }

    await refreshSession();
    router.push("/feed");
    router.refresh();
  };

  const busy = submitting || signingUp || verifying;
  const progressPercent = (step / TOTAL_STEPS) * 100;

  // Still checking whether this is a resumed, interrupted registration.
  if (resuming === null) {
    return (
      <main className="halftone-bg relative flex min-h-screen flex-1 items-center justify-center overflow-hidden p-margin-mobile md:p-margin-desktop">
        <p className="font-body-md text-body-md text-on-surface-variant">Loading…</p>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <main className="halftone-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-margin-mobile md:p-margin-desktop">
      {/* Top accent line — matches mockup */}
      <div className="absolute top-0 left-0 h-1 w-full bg-primary" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col" style={{ minHeight: 600 }}>
        {/* ---------------------------------------------------------------- */}
        {/* Card shell                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest shadow-[0_0_0_1px_rgba(0,0,0,0.05)]" style={{ minHeight: 600 }}>

          {/* Header + progress */}
          <div className="flex flex-col gap-stack-md rounded-t-lg border-b border-outline-variant bg-surface-bright p-4 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Logo wordmark={false} size="sm" />
                <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
                  Join PeaceGangPeaceWorld
                </h1>
              </div>
              <span className="shrink-0 font-caption text-caption text-on-surface-variant rounded-full border border-outline-variant bg-surface-container-high px-3 py-1">
                Step {step} of {TOTAL_STEPS}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Step labels */}
            <div className="flex justify-between px-1 font-caption text-caption text-on-surface-variant">
              {STEP_LABELS.map((label, idx) => (
                <span
                  key={label}
                  className={idx + 1 === step ? "font-bold text-primary" : ""}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {stepError && (
            <p
              className="flex items-center gap-2 border-b border-outline-variant bg-error-container px-8 py-3 font-caption text-caption text-on-error-container"
              role="alert"
            >
              <span className="material-symbols-outlined text-[16px]">error</span>
              {stepError}
            </p>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step content                                                     */}
          {/* ---------------------------------------------------------------- */}
          <div className="relative flex flex-grow flex-col overflow-hidden p-4 md:p-8">

            {/* ---- STEP 1: Affiliation Picker ---- */}
            <div
              className={`flex flex-col transition-all duration-300 ${
                step === 1 ? "pointer-events-auto flex-grow opacity-100" : "pointer-events-none absolute inset-4 opacity-0 md:inset-8"
              }`}
              aria-hidden={step !== 1}
            >
              <div className="mb-stack-lg">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2 md:font-headline-lg md:text-headline-lg">
                  Select Your Affiliation
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Identify your background to help us build bridges. This platform represents neutral ground; all affiliations are respected and expected to maintain peace.
                </p>
                {resuming && (
                  <p className="mt-3 flex items-center gap-2 rounded-lg border-l-4 border-primary bg-surface-container-low px-4 py-3 font-caption text-caption text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                    Welcome back — your email is already confirmed, so we&apos;ll skip straight to finishing your profile.
                  </p>
                )}
              </div>

              <div className="grid flex-grow grid-cols-1 gap-stack-md md:grid-cols-2">
                {/* Core community affiliations */}
                {AFFILIATIONS.slice(0, 4).map((aff) => (
                  <AffiliationCard
                    key={aff.value}
                    option={aff}
                    selected={selectedAffiliation?.value === aff.value}
                    onSelect={() => setSelectedAffiliation(aff)}
                  />
                ))}

                {/* Divider */}
                <div className="col-span-1 my-2 flex items-center gap-4 md:col-span-2">
                  <div className="h-px flex-grow bg-outline-variant" />
                  <span className="font-caption text-caption text-on-surface-variant uppercase tracking-widest">
                    Or
                  </span>
                  <div className="h-px flex-grow bg-outline-variant" />
                </div>

                {/* Neutral affiliations */}
                {AFFILIATIONS.slice(4).map((aff) => (
                  <AffiliationCard
                    key={aff.value}
                    option={aff}
                    selected={selectedAffiliation?.value === aff.value}
                    onSelect={() => setSelectedAffiliation(aff)}
                  />
                ))}
              </div>
            </div>

            {/* ---- STEP 2: Profile (username + email + password) ---- */}
            <div
              className={`flex flex-col transition-all duration-300 ${
                step === 2 ? "pointer-events-auto flex-grow opacity-100" : "pointer-events-none absolute inset-4 opacity-0 md:inset-8"
              }`}
              aria-hidden={step !== 2}
            >
              <div className="mb-stack-lg">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2 md:font-headline-lg md:text-headline-lg">
                  Basic Information
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Set up your identity on the platform.
                </p>
              </div>

              {/* react-hook-form fields — form tag needed for semantics but submit is via button onClick */}
              <form
                id="profile-form"
                className="flex flex-col gap-stack-md"
                onSubmit={handleSubmit(() => goNext())}
                noValidate
              >
                {/* Username */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="username"
                    className="font-label-bold text-label-bold text-primary"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="peacebuilder_42"
                    autoComplete="username"
                    {...register("username")}
                    className={`w-full rounded-lg border bg-surface-container-lowest px-4 py-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                      errors.username
                        ? "border-2 border-error"
                        : "border-outline-variant"
                    }`}
                  />
                  {errors.username && (
                    <p className="flex items-center gap-1 font-caption text-caption text-error" role="alert">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.username.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="font-label-bold text-label-bold text-primary"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    {...register("email")}
                    className={`w-full rounded-lg border bg-surface-container-lowest px-4 py-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                      errors.email
                        ? "border-2 border-error"
                        : "border-outline-variant"
                    }`}
                  />
                  {errors.email && (
                    <p className="flex items-center gap-1 font-caption text-caption text-error" role="alert">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="password"
                    className="font-label-bold text-label-bold text-primary"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register("password")}
                    className={`w-full rounded-lg border bg-surface-container-lowest px-4 py-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                      errors.password
                        ? "border-2 border-error"
                        : "border-outline-variant"
                    }`}
                  />
                  {errors.password && (
                    <p className="flex items-center gap-1 font-caption text-caption text-error" role="alert">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </form>
            </div>

            {/* ---- STEP 3: Email Verification ---- */}
            <div
              className={`flex flex-col transition-all duration-300 ${
                step === VERIFICATION_STEP ? "pointer-events-auto flex-grow opacity-100" : "pointer-events-none absolute inset-4 opacity-0 md:inset-8"
              }`}
              aria-hidden={step !== VERIFICATION_STEP}
            >
              <div className="mb-stack-lg">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2 md:font-headline-lg md:text-headline-lg">
                  Check Your Email
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  We sent a 6-digit code to <strong>{getValues("email")}</strong>. Enter it below to confirm your address.
                </p>
              </div>

              <div className="flex flex-grow flex-col gap-stack-md">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="otp"
                    className="font-label-bold text-label-bold text-primary"
                  >
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-center font-body-md text-body-md tracking-[0.5em] outline-none transition-colors focus:border-2 focus:border-primary"
                  />
                </div>

                {resendMessage && (
                  <p className="font-caption text-caption text-primary">{resendMessage}</p>
                )}

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="self-start font-caption text-caption text-on-surface-variant underline decoration-dotted hover:text-primary disabled:opacity-50"
                >
                  {resending ? "Resending…" : "Didn't get a code? Resend it"}
                </button>
              </div>
            </div>

            {/* ---- STEP 4: Community Agreement ---- */}
            <div
              className={`flex flex-col transition-all duration-300 ${
                step === AGREEMENT_STEP ? "pointer-events-auto flex-grow opacity-100" : "pointer-events-none absolute inset-4 opacity-0 md:inset-8"
              }`}
              aria-hidden={step !== AGREEMENT_STEP}
            >
              <div className="mb-stack-lg">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2 md:font-headline-lg md:text-headline-lg">
                  Community Agreement
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  The foundation of Radical Neutrality.
                </p>
              </div>

              {/* Scrollable terms box */}
              <div className="mb-6 flex-grow overflow-y-auto rounded-lg border border-outline-variant bg-surface p-6">
                <h3 className="font-headline-md text-headline-md text-primary mb-4">
                  Terms of Engagement
                </h3>
                <ul className="flex flex-col gap-4 font-body-md text-body-md text-on-surface-variant list-disc pl-5">
                  <li>
                    <strong>Absolute Non-Violence:</strong> This platform is a sanctuary. Threats, inciting violence, or organizing hostile actions are strictly prohibited and will result in immediate permanent banning and potential reporting to authorities.
                  </li>
                  <li>
                    <strong>Respectful Dialogue:</strong> Disagreements are expected, disrespect is not. Engage in constructive conversation regardless of affiliation.
                  </li>
                  <li>
                    <strong>No Doxxing:</strong> Sharing personal information of others without explicit consent is forbidden.
                  </li>
                  <li>
                    <strong>Moderator Authority:</strong> Our mediators and moderators have final say in dispute resolution on the platform. You agree to abide by their rulings to maintain platform peace.
                  </li>
                </ul>
              </div>

              {/* Agreement checkbox */}
              <label
                htmlFor="agreement-checkbox"
                className="group mt-auto flex cursor-pointer items-start gap-4 border-t border-outline-variant pt-4"
              >
                <div className="relative mt-1 flex items-center justify-center">
                  <input
                    id="agreement-checkbox"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="peer h-6 w-6 appearance-none rounded border-2 border-outline bg-surface-container-lowest transition-all checked:border-primary checked:bg-primary"
                  />
                  <span className="material-symbols-outlined pointer-events-none absolute text-on-primary opacity-0 peer-checked:opacity-100 transition-opacity" style={{ fontSize: 18 }}>
                    check
                  </span>
                </div>
                <span className="font-body-md text-body-md text-primary transition-colors group-hover:text-on-surface-variant">
                  I acknowledge and agree to the Terms of Engagement. I understand that violation of these terms compromises the neutral ground and will result in expulsion.
                </span>
              </label>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Navigation footer                                                */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex items-center justify-between rounded-b-lg border-t border-outline-variant bg-surface-bright p-4 md:p-8">
            {/* Back — invisible on step 1, visible after */}
            <button
              type="button"
              onClick={goBack}
              className={`rounded-lg border-2 border-primary px-6 py-3 font-label-bold text-label-bold text-primary transition-colors hover:bg-surface-container-low ${
                step === 1 ? "invisible" : ""
              }`}
            >
              Back
            </button>

            {/* Next / Complete */}
            <Button
              type="button"
              variant="primary"
              size="default"
              onClick={goNext}
              disabled={!canGoNext() || busy}
              className="ml-auto px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  {submitting ? "Joining…" : verifying ? "Verifying…" : "Creating account…"}
                </>
              ) : step === TOTAL_STEPS ? (
                "Complete Registration"
              ) : step === VERIFICATION_STEP ? (
                "Verify Code"
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: individual affiliation card button
// ---------------------------------------------------------------------------
function AffiliationCard({
  option,
  selected,
  onSelect,
}: {
  option: AffiliationOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${option.cssClass} flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:shadow-[0_0_0_1px_#000000] ${
        selected ? "selected" : ""
      }`}
    >
      <span className="font-label-bold text-label-bold">{option.label}</span>
      <span className="font-caption text-caption opacity-80">{option.subtitle}</span>
    </button>
  );
}
