import type { Community } from "@/components/ui/AffiliationChip";

// Community → avatar accent color. Shared across Feed/Profile/Friends/Messages
// so the "who is this" visual language stays consistent everywhere an avatar
// circle stands in for a missing photo.
export const avatarBg: Record<Community, string> = {
  crip: "bg-[rgba(0,0,255,0.12)] text-[#0000ff] border-[#0000ff]",
  blood: "bg-[rgba(255,0,0,0.12)] text-[#ff0000] border-[#ff0000]",
  latin_king: "bg-[rgba(255,215,0,0.15)] text-[#b8860b] border-[#ffd700]",
  deceptacon: "bg-[rgba(128,0,128,0.12)] text-[#800080] border-[#800080]",
  neutral: "bg-surface-container-high text-on-surface-variant border-outline-variant",
};
