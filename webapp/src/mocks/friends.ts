// ---------------------------------------------------------------------------
// Mock data for the /friends page. Reuses usernames already established in
// mocks/forums.ts and mocks/feed.ts so the same "people" show up consistently
// across the app.
// ---------------------------------------------------------------------------

import type { Community } from "@/components/ui/AffiliationChip";
import type { Role } from "@/lib/session";

export type FriendStatus = "online" | "offline";

export type Friend = {
  id: string;
  name: string;
  community: Community;
  role: Role;
  status: FriendStatus;
  mutualCount: number;
};

export type FriendRequest = {
  id: string;
  name: string;
  community: Community;
  mutualCount: number;
};

export const MOCK_FRIENDS: Friend[] = [
  { id: "f1", name: "SarahP", community: "neutral", role: "admin", status: "online", mutualCount: 12 },
  { id: "f2", name: "MediatorJoe", community: "neutral", role: "admin", status: "online", mutualCount: 9 },
  { id: "f3", name: "Carlos_B", community: "blood", role: "member", status: "offline", mutualCount: 5 },
  { id: "f4", name: "LKing_Ramirez", community: "latin_king", role: "member", status: "online", mutualCount: 7 },
  { id: "f5", name: "CripKing_C", community: "crip", role: "member", status: "offline", mutualCount: 3 },
  { id: "f6", name: "DeceptaQueen", community: "deceptacon", role: "member", status: "online", mutualCount: 4 },
  { id: "f7", name: "NeutralNate", community: "neutral", role: "member", status: "offline", mutualCount: 15 },
];

export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
  { id: "r1", name: "Rosa_M", community: "blood", mutualCount: 2 },
  { id: "r2", name: "Alejandro_T", community: "latin_king", mutualCount: 1 },
];
