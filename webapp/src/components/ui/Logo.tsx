import Link from "next/link";

type Size = "sm" | "md" | "lg";
type Tone = "dark" | "light";

const sizeClasses: Record<Size, string> = {
  sm: "h-8 w-8 text-label-bold font-label-bold",
  md: "h-10 w-10 text-headline-md font-headline-md",
  lg: "h-12 w-12 text-headline-lg font-headline-lg",
};

type LogoProps = {
  href?: string;
  wordmark?: boolean;
  size?: Size;
  tone?: Tone;
  className?: string;
};

/**
 * No production logo asset exists yet (only a flat screenshot in
 * desktop/pgpw_brand_logo/) — this monogram mark stands in until one is
 * supplied, rather than depending on the mockups' third-party preview image URLs.
 */
export function Logo({
  href = "/",
  wordmark = true,
  size = "md",
  tone = "dark",
  className = "",
}: LogoProps) {
  const markClasses =
    tone === "dark"
      ? "bg-primary text-on-primary"
      : "bg-on-primary text-primary";
  const wordClasses = tone === "dark" ? "text-primary" : "text-on-primary";

  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`flex items-center justify-center rounded-md font-extrabold ${sizeClasses[size]} ${markClasses}`}
      >
        P
      </span>
      {wordmark && (
        <span
          className={`font-display-lg text-headline-md font-extrabold tracking-tight ${wordClasses}`}
        >
          PeaceGangPeaceWorld
        </span>
      )}
    </Link>
  );
}
