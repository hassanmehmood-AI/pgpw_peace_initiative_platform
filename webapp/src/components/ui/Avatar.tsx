import { avatarBg } from "@/lib/avatarColor";
import type { Community } from "@/components/ui/AffiliationChip";

type AvatarProps = {
  name: string;
  community: Community;
  avatarUrl?: string | null;
  size?: string;
  textClass?: string;
  ring?: boolean;
  className?: string;
};

// Shared "who is this" visual — a real uploaded photo when one exists,
// otherwise the community-colored initial circle used everywhere else in
// the app. `ring` swaps the community-colored border for a white one, used
// where the avatar overlaps a colored/textured surface (the Profile header).
export function Avatar({
  name,
  community,
  avatarUrl,
  size = "h-10 w-10",
  textClass = "font-label-bold text-label-bold",
  ring = false,
  className = "",
}: AvatarProps) {
  const [fillBg, fillText, fillBorder] = avatarBg[community].split(" ");
  const border = ring ? "border-4 border-surface-container-lowest" : `border-2 ${fillBorder}`;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- externally-hosted user upload, not a static/optimizable asset
      <img
        src={avatarUrl}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${border} ${size} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${border} ${fillBg} ${fillText} ${textClass} ${size} ${className}`}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
