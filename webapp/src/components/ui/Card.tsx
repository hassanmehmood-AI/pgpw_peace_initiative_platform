import type { ElementType, HTMLAttributes, ReactNode } from "react";

type Padding = "none" | "default" | "lg";

const paddingClasses: Record<Padding, string> = {
  none: "",
  default: "p-4",
  lg: "p-6",
};

type CardProps = {
  as?: ElementType;
  hoverable?: boolean;
  padding?: Padding;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function Card({
  as: Tag = "div",
  hoverable = false,
  padding = "lg",
  className = "",
  children,
  ...props
}: CardProps) {
  const hoverClasses = hoverable
    ? "hover:border-primary transition-colors duration-200"
    : "";

  return (
    <Tag
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl ${paddingClasses[padding]} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
