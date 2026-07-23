import Image from "next/image";
import Link from "next/link";

type Size = "sm" | "md" | "lg";
type Tone = "dark" | "light";

const sizePx: Record<Size, number> = {
  sm: 112,
  md: 144,
  lg: 192,
};

const sizeClasses: Record<Size, string> = {
  sm: "h-14 w-14",
  md: "h-18 w-18",
  lg: "h-24 w-24",
};

type LogoProps = {
  href?: string;
  wordmark?: boolean;
  size?: Size;
  tone?: Tone;
  className?: string;
};

export function Logo({
  href = "/",
  wordmark = true,
  size = "md",
  tone = "dark",
  className = "",
}: LogoProps) {
  const wordClasses = tone === "dark" ? "text-primary" : "text-on-primary";

  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/images/brand/logo.png"
        alt="PeaceGangPeaceWorld"
        width={sizePx[size]}
        height={sizePx[size]}
        unoptimized
        className={`shrink-0 rounded-md ${sizeClasses[size]}`}
      />
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
