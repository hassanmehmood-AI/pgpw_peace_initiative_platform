export type Community = "crip" | "blood" | "latin_king" | "deceptacon" | "neutral";

export const communityMeta: Record<Community, { label: string; icon: string; className: string }> = {
  crip: { label: "Crip", icon: "water_drop", className: "affiliation-crip" },
  blood: { label: "Blood", icon: "local_fire_department", className: "affiliation-blood" },
  latin_king: { label: "Latin King", icon: "crown", className: "affiliation-latin_king" },
  deceptacon: { label: "Deceptacon", icon: "shield", className: "affiliation-deceptacon" },
  neutral: { label: "Independent", icon: "diversity_3", className: "affiliation-neutral" },
};

type Size = "sm" | "md";

const sizeClasses: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

type AffiliationChipProps = {
  community: Community;
  label?: string;
  showIcon?: boolean;
  selected?: boolean;
  size?: Size;
  className?: string;
};

export function AffiliationChip({
  community,
  label,
  showIcon = false,
  selected = false,
  size = "md",
  className = "",
}: AffiliationChipProps) {
  const meta = communityMeta[community];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 font-bold ${meta.className} ${sizeClasses[size]} ${selected ? "selected" : ""} ${className}`}
    >
      {showIcon && (
        <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
      )}
      {label ?? meta.label}
    </span>
  );
}
