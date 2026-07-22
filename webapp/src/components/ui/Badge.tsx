import type { ReactNode } from "react";

type Tone = "neutral" | "inverse";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-tertiary-fixed text-primary border border-outline-variant",
  inverse: "bg-primary text-on-primary",
};

type BadgeProps = {
  tone?: Tone;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-caption text-caption ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
