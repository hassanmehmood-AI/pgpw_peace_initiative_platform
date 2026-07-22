// ---------------------------------------------------------------------------
// Mock data for Phase A5 — Forums
// All shapes here match the Supabase schema planned in Phase B1 so the
// mock → live swap in B3 only touches the data-fetching layer, not the UI.
// ---------------------------------------------------------------------------

import type { Community } from "@/components/ui/AffiliationChip";

// ---- Types -----------------------------------------------------------------

export type ForumCategory = {
  id: string;
  title: string;
  description: string;
  icon: string; // Material Symbol name
  topicCount: string; // display string e.g. "1.2k"
  latestThread: { title: string; timeAgo: string };
  moderator: string;
};

export type ForumThread = {
  id: string;
  categoryId: string;
  title: string;
  author: string;
  authorCommunity: Community;
  createdAt: string; // display string
  replyCount: number;
  viewCount: number;
  pinned?: boolean;
};

export type ForumPost = {
  id: string;
  threadId: string;
  author: string;
  authorCommunity: Community;
  body: string;
  createdAt: string; // display string
  likes: number;
};

// ---- Categories ------------------------------------------------------------

export const MOCK_CATEGORIES: ForumCategory[] = [
  {
    id: "peace-unity",
    title: "Peace and Unity",
    description:
      "Discussions focused on bridging divides, fostering understanding, and promoting non-violent communication across communities.",
    icon: "handshake",
    topicCount: "1.2k",
    latestThread: {
      title: "Organizing the upcoming neighborhood dialogue series",
      timeAgo: "2h ago",
    },
    moderator: "SarahP",
  },
  {
    id: "general",
    title: "General Discussion",
    description:
      "The main hub for open chat, daily check-ins, and topics that don't fit into specific categories. Keep it respectful.",
    icon: "forum",
    topicCount: "8.5k",
    latestThread: {
      title: "Weekend plans: What's everyone doing to unwind?",
      timeAgo: "5m ago",
    },
    moderator: "System",
  },
  {
    id: "conflict-resolution",
    title: "Conflict Resolution",
    description:
      "A mediated space for addressing grievances, seeking advice on disputes, and learning de-escalation tactics.",
    icon: "diversity_3",
    topicCount: "430",
    latestThread: {
      title: "Resources for managing workplace disputes effectively",
      timeAgo: "1d ago",
    },
    moderator: "MediatorJoe",
  },
  {
    id: "community-news",
    title: "Community News",
    description:
      "Stay up to date with announcements, local events, and platform updates relevant to every affiliation.",
    icon: "newspaper",
    topicCount: "670",
    latestThread: {
      title: "Platform update: new safety reporting features live",
      timeAgo: "3h ago",
    },
    moderator: "AdminTeam",
  },
  {
    id: "resources",
    title: "Peace Resources",
    description:
      "A curated library of guides, hotlines, legal aid contacts, and mental-health tools for community members in need.",
    icon: "menu_book",
    topicCount: "290",
    latestThread: {
      title: "Free mental health clinics available this month",
      timeAgo: "6h ago",
    },
    moderator: "SarahP",
  },
  {
    id: "introductions",
    title: "Introductions",
    description:
      "New here? Introduce yourself, share your story, and find others with similar goals for a more peaceful community.",
    icon: "waving_hand",
    topicCount: "3.1k",
    latestThread: {
      title: "Hey everyone — first-generation community member here",
      timeAgo: "12m ago",
    },
    moderator: "MediatorJoe",
  },
];

// ---- Threads ---------------------------------------------------------------

export const MOCK_THREADS: ForumThread[] = [
  // peace-unity
  {
    id: "dialogue-series",
    categoryId: "peace-unity",
    title: "Organizing the upcoming neighborhood dialogue series",
    author: "SarahP",
    authorCommunity: "neutral",
    createdAt: "2h ago",
    replyCount: 14,
    viewCount: 203,
    pinned: true,
  },
  {
    id: "truce-framework",
    categoryId: "peace-unity",
    title: "Proposal: a shared truce framework for online spaces",
    author: "Carlos_B",
    authorCommunity: "blood",
    createdAt: "1d ago",
    replyCount: 31,
    viewCount: 450,
  },
  {
    id: "music-bridge",
    categoryId: "peace-unity",
    title: "How music has bridged my neighborhood's divisions",
    author: "LKing_Ramirez",
    authorCommunity: "latin_king",
    createdAt: "3d ago",
    replyCount: 8,
    viewCount: 117,
  },

  // general
  {
    id: "weekend-plans",
    categoryId: "general",
    title: "Weekend plans: What's everyone doing to unwind?",
    author: "DeceptaQueen",
    authorCommunity: "deceptacon",
    createdAt: "5m ago",
    replyCount: 6,
    viewCount: 48,
  },
  {
    id: "best-spots",
    categoryId: "general",
    title: "Best community spots in East Side — share yours",
    author: "NeutralNate",
    authorCommunity: "neutral",
    createdAt: "2d ago",
    replyCount: 22,
    viewCount: 310,
  },
  {
    id: "cooking-thread",
    categoryId: "general",
    title: "Share your go-to comfort food recipe 🍲",
    author: "CripKing_C",
    authorCommunity: "crip",
    createdAt: "4d ago",
    replyCount: 39,
    viewCount: 521,
  },

  // conflict-resolution
  {
    id: "workplace-disputes",
    categoryId: "conflict-resolution",
    title: "Resources for managing workplace disputes effectively",
    author: "MediatorJoe",
    authorCommunity: "neutral",
    createdAt: "1d ago",
    replyCount: 5,
    viewCount: 89,
    pinned: true,
  },
  {
    id: "neighbor-noise",
    categoryId: "conflict-resolution",
    title: "Neighbor noise complaint — mediation advice needed",
    author: "Anonymous",
    authorCommunity: "neutral",
    createdAt: "3d ago",
    replyCount: 12,
    viewCount: 155,
  },
  {
    id: "online-harassment",
    categoryId: "conflict-resolution",
    title: "Online harassment — what options do I have?",
    author: "Rosa_M",
    authorCommunity: "blood",
    createdAt: "5d ago",
    replyCount: 19,
    viewCount: 280,
  },

  // community-news
  {
    id: "safety-update",
    categoryId: "community-news",
    title: "Platform update: new safety reporting features live",
    author: "AdminTeam",
    authorCommunity: "neutral",
    createdAt: "3h ago",
    replyCount: 4,
    viewCount: 312,
    pinned: true,
  },
  {
    id: "peace-walk",
    categoryId: "community-news",
    title: "Annual peace walk — save the date: August 17",
    author: "SarahP",
    authorCommunity: "neutral",
    createdAt: "2d ago",
    replyCount: 27,
    viewCount: 480,
  },

  // resources
  {
    id: "mental-health",
    categoryId: "resources",
    title: "Free mental health clinics available this month",
    author: "SarahP",
    authorCommunity: "neutral",
    createdAt: "6h ago",
    replyCount: 9,
    viewCount: 198,
    pinned: true,
  },
  {
    id: "legal-aid",
    categoryId: "resources",
    title: "Legal aid directory — updated for 2025",
    author: "MediatorJoe",
    authorCommunity: "neutral",
    createdAt: "1w ago",
    replyCount: 3,
    viewCount: 144,
  },

  // introductions
  {
    id: "first-gen",
    categoryId: "introductions",
    title: "Hey everyone — first-generation community member here",
    author: "Alejandro_T",
    authorCommunity: "latin_king",
    createdAt: "12m ago",
    replyCount: 7,
    viewCount: 62,
  },
  {
    id: "long-time-lurker",
    categoryId: "introductions",
    title: "Long-time lurker, finally posting — hi from the East Side",
    author: "BlueKnight",
    authorCommunity: "crip",
    createdAt: "1d ago",
    replyCount: 15,
    viewCount: 201,
  },
];

// ---- Posts -----------------------------------------------------------------

export const MOCK_POSTS: ForumPost[] = [
  // dialogue-series
  {
    id: "p1",
    threadId: "dialogue-series",
    author: "SarahP",
    authorCommunity: "neutral",
    body: "I've been in contact with the local community centre and they've agreed to host a two-day dialogue series in September. We need volunteers to help coordinate the breakout sessions. Who's in?",
    createdAt: "2h ago",
    likes: 12,
  },
  {
    id: "p2",
    threadId: "dialogue-series",
    author: "Carlos_B",
    authorCommunity: "blood",
    body: "Count me in for Saturday. I can bring five people from my side who are genuinely interested in making progress. We've been wanting a space like this for a long time.",
    createdAt: "1h ago",
    likes: 9,
  },
  {
    id: "p3",
    threadId: "dialogue-series",
    author: "LKing_Ramirez",
    authorCommunity: "latin_king",
    body: "This is exactly what our block needs. I'll spread the word. Can you share a flyer or any materials we can post on the neighbourhood board?",
    createdAt: "45m ago",
    likes: 6,
  },

  // truce-framework
  {
    id: "p4",
    threadId: "truce-framework",
    author: "Carlos_B",
    authorCommunity: "blood",
    body: "The core idea is simple: a three-strike system where each escalation gets logged publicly. Transparency keeps everyone accountable without needing heavy moderation.",
    createdAt: "1d ago",
    likes: 22,
  },
  {
    id: "p5",
    threadId: "truce-framework",
    author: "CripKing_C",
    authorCommunity: "crip",
    body: "Transparency is good in theory but we need to make sure it doesn't become a doxxing vector. Who controls the log and who can edit it?",
    createdAt: "22h ago",
    likes: 18,
  },
  {
    id: "p6",
    threadId: "truce-framework",
    author: "MediatorJoe",
    authorCommunity: "neutral",
    body: "Great question. The log should be read-only for all members and editable only by mediators. I can draft a governance doc if this thread gets traction.",
    createdAt: "20h ago",
    likes: 15,
  },

  // weekend-plans
  {
    id: "p7",
    threadId: "weekend-plans",
    author: "DeceptaQueen",
    authorCommunity: "deceptacon",
    body: "Planning a BBQ on Sunday, everyone's welcome. Message me if you want the address — keeping it off the public thread for safety.",
    createdAt: "5m ago",
    likes: 4,
  },
  {
    id: "p8",
    threadId: "weekend-plans",
    author: "NeutralNate",
    authorCommunity: "neutral",
    body: "Hiking the ridge trail Saturday morning if anyone wants to join. Good way to clear the head.",
    createdAt: "2m ago",
    likes: 2,
  },

  // workplace-disputes
  {
    id: "p9",
    threadId: "workplace-disputes",
    author: "MediatorJoe",
    authorCommunity: "neutral",
    body: "Pinning this resource list. Key steps: document everything in writing, request an HR meeting with a witness, and know your right to bring a union rep if applicable. Links below.",
    createdAt: "1d ago",
    likes: 17,
  },
  {
    id: "p10",
    threadId: "workplace-disputes",
    author: "Rosa_M",
    authorCommunity: "blood",
    body: "This helped me navigate a situation last month. The written-documentation tip is underrated — most managers back down once they see you have a paper trail.",
    createdAt: "18h ago",
    likes: 11,
  },

  // first-gen
  {
    id: "p11",
    threadId: "first-gen",
    author: "Alejandro_T",
    authorCommunity: "latin_king",
    body: "Hi everyone! I grew up in the Eastside and I've seen what division does to a neighbourhood. Really glad a platform like this exists. Looking forward to contributing.",
    createdAt: "12m ago",
    likes: 5,
  },
  {
    id: "p12",
    threadId: "first-gen",
    author: "SarahP",
    authorCommunity: "neutral",
    body: "Welcome Alejandro! Your perspective matters here. Don't hesitate to reach out if you have questions or want to get involved.",
    createdAt: "8m ago",
    likes: 3,
  },
];

// ---- Helpers ---------------------------------------------------------------

export function getCategoryById(id: string): ForumCategory | undefined {
  return MOCK_CATEGORIES.find((c) => c.id === id);
}

export function getThreadsByCategory(categoryId: string): ForumThread[] {
  return MOCK_THREADS.filter((t) => t.categoryId === categoryId);
}

export function getThreadById(id: string): ForumThread | undefined {
  return MOCK_THREADS.find((t) => t.id === id);
}

export function getPostsByThread(threadId: string): ForumPost[] {
  return MOCK_POSTS.filter((p) => p.threadId === threadId);
}
