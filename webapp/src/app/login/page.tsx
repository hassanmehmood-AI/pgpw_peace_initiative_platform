"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Zod schema — email + password
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFields = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Main login form (wrapped in Suspense because of useSearchParams)
// ---------------------------------------------------------------------------
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/feed";

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
  });

  const onSubmit = async (data: LoginFields) => {
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {/* Main login card */}
      <div className="flex flex-col gap-stack-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 ambient-shadow">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 pb-2 text-center">
          <Logo wordmark={false} size="lg" />
          <h1 className="font-headline-md text-headline-md text-primary">
            Welcome Back
          </h1>
          <p className="font-caption text-caption text-on-surface-variant">
            Sign in to continue to PeaceGangPeaceWorld
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-stack-md"
        >
          {authError && (
            <p
              className="flex items-center gap-2 rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container"
              role="alert"
            >
              <span className="material-symbols-outlined text-[16px]">error</span>
              {authError}
            </p>
          )}

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-email"
              className="font-label-bold text-label-bold text-on-surface"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              {...register("email")}
              className={`w-full rounded-lg border bg-surface-container-lowest px-4 py-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                errors.email ? "border-2 border-error" : "border-outline-variant"
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
              htmlFor="login-password"
              className="font-label-bold text-label-bold text-on-surface"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
                className={`w-full rounded-lg border bg-surface-container-lowest px-4 py-3 pr-12 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                  errors.password ? "border-2 border-error" : "border-outline-variant"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 font-caption text-caption text-error" role="alert">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="mt-2 w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Divider + register link */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-grow bg-outline-variant" />
          <span className="font-caption text-caption text-on-surface-variant">or</span>
          <div className="h-px flex-grow bg-outline-variant" />
        </div>

        <Button href="/register" variant="secondary" className="w-full">
          Create an Account
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page shell — Suspense required by useSearchParams
// ---------------------------------------------------------------------------
export default function LoginPage() {
  return (
    <main className="halftone-bg relative flex min-h-screen flex-1 items-center justify-center overflow-hidden p-margin-mobile md:p-margin-desktop">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 h-1 w-full bg-primary" />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
