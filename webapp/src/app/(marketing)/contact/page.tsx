"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";

export default function ContactPage() {
  const { session } = useSession();
  const supabase = useMemo(() => createClient(), []);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: session?.name ?? "", email: "", message: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const { error } = await supabase.from("contact_messages").insert({
      name: values.name,
      email: values.email,
      message: values.message,
      user_id: session?.id ?? null,
    });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSubmitted(true);
    reset({ name: session?.name ?? "", email: "", message: "" });
  });

  return (
    <>
      {/* Hero */}
      <section className="border-b border-outline-variant bg-surface-bright">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-stack-lg md:px-margin-desktop">
          <h1 className="font-display-lg text-display-lg text-primary">Contact Us</h1>
          <p className="mt-4 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Questions, partnership inquiries, or anything else — your message goes directly
            to the PGPW administration team.
          </p>
        </div>
      </section>

      <section className="bg-surface-container-low">
        <div className="mx-auto w-full max-w-2xl px-margin-mobile py-stack-lg md:px-margin-desktop">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
            {submitted ? (
              <div className="flex flex-col items-center gap-stack-md py-8 text-center">
                <span className="material-symbols-outlined text-[48px] text-primary">check_circle</span>
                <h2 className="font-headline-md text-headline-md text-primary">Message Sent</h2>
                <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
                  Thanks for reaching out — an administrator will review your message and get
                  back to you at the email address you provided.
                </p>
                <Button type="button" variant="secondary" onClick={() => setSubmitted(false)}>
                  Send Another Message
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

                <div className="flex flex-col gap-2">
                  <label htmlFor="contact-name" className="font-label-bold text-label-bold text-primary">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder="Your name"
                    {...register("name")}
                    className={`w-full rounded-lg border bg-surface-container-lowest px-4 py-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                      errors.name ? "border-2 border-error" : "border-outline-variant"
                    }`}
                  />
                  {errors.name && (
                    <p className="flex items-center gap-1 font-caption text-caption text-error" role="alert">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="contact-email" className="font-label-bold text-label-bold text-primary">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder="name@example.com"
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

                <div className="flex flex-col gap-2">
                  <label htmlFor="contact-message" className="font-label-bold text-label-bold text-primary">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={6}
                    placeholder="How can we help?"
                    {...register("message")}
                    className={`w-full rounded-lg border bg-surface-container-lowest p-3 font-body-md text-body-md outline-none transition-colors focus:border-2 focus:border-primary ${
                      errors.message ? "border-2 border-error" : "border-outline-variant"
                    }`}
                  />
                  {errors.message && (
                    <p className="flex items-center gap-1 font-caption text-caption text-error" role="alert">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.message.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="w-full disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Sending…
                    </>
                  ) : (
                    <>
                      Send Message
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
