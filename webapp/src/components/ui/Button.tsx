import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "default" | "lg" | "sm" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90 ambient-shadow",
  secondary:
    "bg-surface-container-lowest border-2 border-primary text-primary hover:bg-secondary-fixed",
  ghost: "bg-transparent text-primary hover:bg-secondary-fixed",
};

const sizeClasses: Record<Size, string> = {
  default: "px-4 py-2 text-label-bold font-label-bold",
  sm: "px-3 py-1.5 text-label-bold font-label-bold",
  lg: "px-8 py-4 text-lg font-label-bold uppercase tracking-wide",
  icon: "p-2",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant = "primary",
  size = "default",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg transition-colors transition-opacity disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (props.href) {
    const { href, ...anchorProps } = props;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
