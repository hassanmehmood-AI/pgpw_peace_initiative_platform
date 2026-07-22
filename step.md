# PeaceGangPeaceWorld — Implementation Roadmap

Stack: **Next.js (React) + Tailwind CSS** (frontend) · **Supabase** (Postgres + Auth + Realtime + Storage) (backend)

This is a **web application**, not a static site: pages behind login (`/feed`, `/forums`, `/admin`, `/safety`) live inside a persistent app shell (`SideNav`/`BottomNav`) with client-side navigation and session-aware state, distinct from the public marketing pages (Landing/About). See Phase A2.

Reference designs already built (static HTML mockups, one set per breakpoint):
`desktop/` and `mobile/` → Landing, About, Registration Flow, News Feed, Forum Categories, Admin Dashboard, Safety Reporting.

The Next.js app itself lives in **`webapp/`**.

**Working order: finish the entire frontend (Part A) with mock/static data first. Only after every page and component is built and responsive do we start Part B (Supabase backend).** This keeps UI decisions from being blocked on schema work, and means the backend is wired against a UI that's already final.

---

# PART A — Frontend (static/mock data only, no Supabase yet)

## Phase A0 — Project Setup ✅

- [x] Create Next.js app (App Router) with TypeScript + Tailwind CSS preset — scaffolded in `webapp/` (Next.js 16, Tailwind v4)
- [x] Copy design tokens from `desktop/peacegangpeaceworld/DESIGN.md` front-matter (colors, typography, spacing, radius) into theme config — Tailwind v4 uses CSS-first config, so tokens live in `webapp/src/app/globals.css` (`@theme` block) instead of `tailwind.config.ts`; verified hex values against the literal `tailwind.config` embedded in every mockup `code.html`, including community colors (Crip blue `#0000FF`, Blood red `#FF0000`, Latin King yellow `#FFD700`, Deceptacon purple `#800080`)
- [x] Install core deps: `zod`, `react-hook-form`, `@hookform/resolvers` (bridges the two) — **no `@supabase/*` packages yet**
- [x] Set up Git repo + basic CI (lint + build on push) — `git init` at project root, `.github/workflows/ci.yml` runs `npm ci && npm run lint && npm run build` in `webapp/`
- [x] Create a `mocks/` folder for fake data — `webapp/src/mocks/` scaffolded, actual mock data gets filled in per-feature in Phases A5–A8
- [x] Folder renamed `web/` → `webapp/` to make clear this is the web application, not a static site — CI workflow paths updated to match

---

## Phase A1 — Design System (componentize the mockups) ✅

Convert repeated markup from the HTML files into reusable components — this is the highest-leverage step since every page reuses the same nav/footer/card patterns.

- [x] `Button` (`webapp/src/components/ui/Button.tsx`) — primary/secondary/ghost variants, `sm`/`default`/`lg`/`icon` sizes, renders as `<Link>` when given `href` or a native `<button>` otherwise
- [x] `TopNav` (`webapp/src/components/layout/TopNav.tsx`) — logo, Home/Forums/Peace Resources/About links (+ `Members` as a disabled placeholder, matching the deferred nav items noted in Phase B10), search/mail/notification icons, Login/Sign Up, responsive mobile menu
- [x] `BottomNav` (`webapp/src/components/layout/BottomNav.tsx`) — mobile companion to `SideNav` for the **app shell** specifically (Feed/Forums + center "create post" FAB + disabled Messages/Profile placeholders), not a duplicate of `TopNav` — see note below
- [x] `SideNav` (`webapp/src/components/layout/SideNav.tsx`) — dashboard shell: News Feed, Forums (live), Profile/Friends/Messages/Settings (disabled placeholders), conditional Admin link via `isAdmin` prop
- [x] `Footer` (`webapp/src/components/layout/Footer.tsx`) — Quick Links/Legal (disabled placeholders), Crisis Resources/Safety Policy → `/safety` (matches mockup, both link to the same page)
- [x] `Card` (`webapp/src/components/ui/Card.tsx`), `Badge` (`webapp/src/components/ui/Badge.tsx`), `AffiliationChip` (`webapp/src/components/ui/AffiliationChip.tsx`) — community color chips (Crip blue, Blood red, Latin King yellow, Deceptacon purple) with `selected` state, ported verbatim from the registration mockup's color/opacity values
- [x] Also added: `Logo` (`webapp/src/components/ui/Logo.tsx`) — monogram placeholder since no real logo asset exists yet (only a flat screenshot in `desktop/pgpw_brand_logo/`); `ambient-shadow` and `halftone-bg` utilities in `globals.css` (referenced throughout the mockups but never actually defined there); Material Symbols icon font wired into the root layout (every mockup icon depends on it)
- [x] Built **responsive from the start** (one component, `md:` breakpoints) instead of separate mobile/desktop components
- [x] `webapp/src/app/style-guide/page.tsx` — temporary page exercising every component together for visual QA; not linked from any real nav, safe to keep around for Phase A9

**Note on `BottomNav` scope:** the mockups actually contain two different mobile bottom-nav patterns — a marketing one (Home/Forums/Members/Profile, seen on `pgpw_landing_page_mobile`) and an app-shell one with a create-post FAB (seen on `pgpw_news_feed_mobile`). Rather than building both, `TopNav` handles mobile marketing nav via its own collapsible menu, and `BottomNav` is scoped to the app shell only (paired with `SideNav`) — this avoids two components doing overlapping jobs. Revisit if a plain marketing bottom-nav turns out to be wanted later.

**Verification:** `npm run lint` and `npm run build` both pass clean. Confirmed via the built HTML output (dev server + curl) that all icons, affiliation chip classes, and branding render structurally correctly. **Not yet visually confirmed in a browser** — no screenshot/browser tool was available this session, so please open `http://localhost:3000/style-guide` yourself (`npm run dev` in `webapp/`) to sanity-check colors, spacing, and the icon font before we build on top of this.

---

## Phase A2 — App Shell & Routing (mock auth only) ✅

This phase is what makes this a **web application** rather than a marketing site: authenticated pages share one persistent, client-navigated shell instead of being independent server-rendered pages that happen to share a header.

- [x] Route groups: `webapp/src/app/(marketing)/` (Landing `/`, `/about`) and `webapp/src/app/(app)/` (`/feed`, `/forums`, `/safety`, `/admin`) — confirmed via `npm run build`'s route list that group folders don't leak into the URL
- [x] `(app)/layout.tsx` renders `SideNav`/`BottomNav` once and persists across all app routes — only `{children}` swaps on navigation, no shell remount
- [x] Mock session in `webapp/src/lib/session.tsx` — `SessionProvider` + `useSession()`, backed by `localStorage` via `useSyncExternalStore` (not `useEffect`+`useState`: reading localStorage is synchronous, so `useSyncExternalStore` avoids both a hydration flash and a `set-state-in-effect` lint error). **Not real auth** — no server session/cookie, purely a client-side redirect gate; Phase B2 replaces this entirely.
- [x] `useSession()` is callable from anywhere in the tree without prop-drilling — proved by `/feed` reading it directly to show "Posting as {name} ({role})"
- [x] Role-based guard on `/admin` — `canModerate(session.role)` (mediator/admin only), shows an explicit **Access Denied** panel rather than silently redirecting elsewhere
- [x] Responsive shell: `(marketing)` uses `TopNav`+`Footer`; `(app)` uses `SideNav`+`BottomNav`. `TopNav` is also session-aware — swaps Login/Sign Up for "Go to Feed"/"Log out" when a mock session exists, proving the context reaches the marketing layout too
- [x] Active-route highlighting already built into `SideNav`/`BottomNav`/`TopNav` from Phase A1 (`usePathname`)
- [x] `/login` — **temporary dev-only stub**, not the real Phase A4 login/registration UI: a role/community/name picker that calls `session.login()` and redirects back to `?redirect=` (or `/feed`). Clearly labeled in the UI as temporary. Needed now so the guarded routes above are actually demoable.
- [x] `/register` — minimal stub pointing to `/login`, since `TopNav`'s Sign Up button needed a non-404 target; real 4-step flow is Phase A4
- [x] Stub content added for `/feed`, `/forums`, `/safety`, `/admin` (each just states which phase builds its real content) so the shell and guards have somewhere to render

**Verification:** `npm run lint` and `npm run build` both pass; all 9 routes return HTTP 200. Confirmed via curl that `/` renders logged-out marketing nav and `/feed` server-renders "Redirecting to sign in…" with no session (correct — `SideNav` never flashes for logged-out visitors). **Not yet verified interactively in a browser** (still no screenshot/browser tool available) — please run `npm run dev` in `webapp/` and click through: visit `/feed` while logged out (should redirect to `/login`), sign in via the dev picker, confirm you land back on `/feed` with `SideNav` showing your name, then try `/admin` as a `member` (should show Access Denied) vs as `mediator`/`admin` (should show the stub dashboard).

**Housekeeping note:** twice this session a background `npm run dev` process survived `TaskStop` and kept running (once causing a file-lock on the `web/`→`webapp/` rename, once causing a stale server to silently answer curl checks). Verified and force-killed both times via `Get-CimInstance Win32_Process` — worth checking for orphaned `node.exe` processes if a future rename/build acts up unexpectedly.

---

## Phase A3 — Landing & About Pages ✅

- [x] Landing (`(marketing)/page.tsx`) — Hero, Community Registration (4 cards: Crip/Blood/Latin King/Deceptacon, each with the community-colored icon circle reusing `AffiliationChip`'s color classes), Peace Ambassadors (1 featured + 2 compact cards, mock names/quotes kept local to the page since Landing doesn't need DB-shaped mock data)
- [x] About (`(marketing)/about/page.tsx`) — Hero, Stats bento grid, Our Mission, Why PGPW Exists, Community Guidelines (`id="guidelines"` anchor for Phase A7's "Read Full Guidelines" link), Safety & Moderation
- [x] Wired "Join the Movement" / community "Register" buttons → `/register`; "Explore Communities" → `/forums`
- [x] Added `ImagePlaceholder` (`webapp/src/components/ui/ImagePlaceholder.tsx`) — halftone/grayscale placeholder block standing in for the mockups' photographic imagery, which hotlinks to third-party AI-preview URLs (`lh3.googleusercontent.com`) not under our control; same reasoning as the `Logo` placeholder from Phase A1

**Reconciliation with the mockups:** the actual "Stats" bento grid (14,205 members etc.) lives on the **About** mockup, not Landing — step.md's original phrasing ("Landing hero, stats, and community-registration cards") conflated the two. Ported content to match where it actually lives in each mockup file rather than the phrasing here.

**Verification:** `npm run lint` and `npm run build` pass clean, all 9 routes still 200. Confirmed via curl that both pages render their real copy (hero headline, all 4 community cards, all 3 ambassadors, all 4 stat values, all 4 guideline cards). **Not yet visually confirmed in a browser** — same caveat as Phase A1/A2, no screenshot tool available this session.

---

## 
 ✅

Maps directly to `pgpw_registration_flow` (4 steps: Affiliation → Profile → Verification → Agreement).

- [x] Step 1 UI: community affiliation picker → writes to local form state
- [x] Step 2 UI: username + email fields with `zod` + `react-hook-form` validation (no real signup call)
- [x] Step 3 UI: "Send Code to Email" screen with mock/fake OTP input (accept any 6-digit code for now)
- [x] Step 4: Terms of Engagement checkbox → on submit, just set the mock session and redirect
- [x] On completion, redirect to News Feed (`/feed`) — matches the flow already wired in the mockups
- [x] Build `/login` page UI — real-looking email+password form (react-hook-form + zod); sets mock session on submit; dev role-picker preserved in a collapsible `<details>` for Phase A2 testing

---

## Phase A5 — Forums (mock data) ✅

- [x] `/forums` — list categories from `mocks/` data (cards)
- [x] `/forums/[categoryId]` — thread list for a category, from mock data
- [x] `/forums/[categoryId]/[threadId]` — thread detail + posts + reply composer (composer appends to local state only)
- [x] Search bar → client-side filter against mock category/thread titles
- [x] "New Topic" button → create-thread modal/page (pushes into local mock state)

---

## Phase A6 — News Feed (mock data) ✅

- [x] `/feed` — composer + reverse-chronological list, backed by mock feed posts + local state for new posts
- [x] Like / comment / save actions → optimistic local state updates only (no persistence)
- [x] Report button → opens report modal UI (logs to console / local state, no DB)
- [x] Trending sidebar → derived from mock data (sort by likes/comments)
- [x] Live Hub chat preview → static/mock message list + local state for new messages

---

## Phase A7 — Safety & Reporting (mock data) ✅

- [x] `/safety` — violation report form UI (supports "anonymous" toggle), submits to local state/console only — 6-category radio picker + optional "entity involved" field + details textarea, validated with `zod` + `react-hook-form`; anonymous toggle kept as plain local state (not RHF-registered) since it's a UI switch, not a validated field
- [x] Crisis resources block — static content (tel: links, hotline links) — Emergency Services (`tel:911`), 988 Suicide & Crisis Lifeline (`tel:988`), Crisis Text Line (`sms:741741`), Neutrality Mediation Contact (`mailto:`)
- [x] "Read Full Guidelines" → links to `/about#guidelines` (the anchor already built in Phase A3)

**Reconciliation with the mockups:** desktop and mobile versions differ in violation-category granularity (desktop: 3 radio pills; mobile: 6-option `<select>`) and section order (desktop puts the report form first; mobile leads with crisis resources for visibility). Took the mobile version's fuller 6-category list, and used `order-*` utilities so crisis resources lead on narrow viewports but sit in the right-hand sidebar column (next to a "Platform Pillars" guidelines reminder) on `lg:` — same responsive-single-component approach as the rest of Part A rather than building two separate layouts.

**Verification:** `npm run lint` (clean — fixed a zod v4 issue, `errorMap` isn't valid in this version, use `message` directly — and avoided a React Compiler incompatibility warning by keeping the anonymous toggle as local state instead of `watch()`) and `npm run build` both pass; `/safety` in the route list. Confirmed via curl that the route correctly redirects to the sign-in gate when no mock session exists (same app-shell guard as every other `(app)` route). **Not yet visually confirmed in a browser** — recommend logging in via `/login`, then manually exercising the report form (all 6 categories, the anonymous toggle, crisis resource links) and confirming "Read Full Guidelines" lands on the About page's Community Guidelines section.

---

## Phase A8 — Admin / Moderation Dashboard (mock data) ✅

- [x] `/admin` — gated by mock session role only (reused the `canModerate(session.role)` guard already built in Phase A2, unchanged Access Denied panel)
- [x] Stats cards: total members, active now, reported items, suspended — Total Members/Active Now are static mock baselines (`mocks/admin.ts`); Reported Items is computed live (`reports.filter(status === 'pending').length`); Suspended is a mock baseline plus a local counter that increments each time a report is suspended in the current session
- [x] Reported content queue — list mock reports with `status = 'pending'` (`mocks/admin.ts` → `MOCK_REPORTS`, 4 seeded reports spanning all 3 priority levels)
- [x] Review / Dismiss / Suspend actions → update mock local state, no persistence — Review marks a report `reviewed` (removes it from the queue without a formal moderation-log entry, matching Phase B1's `moderation_actions.action` enum which only has `dismiss`/`warn`/`suspend`, not "review"); Dismiss/Suspend both update the report's status **and** prepend an entry to the Audit Log state
- [x] Audit log view — static/mock list of past moderation actions (`MOCK_AUDIT_LOG`, 4 seeded entries covering all 3 action types) plus newly-logged entries from Dismiss/Suspend actions taken in the current session, prepended live

**Reconciliation with the mockups:** desktop and mobile report-card content differs (desktop: generic "Harassment Report"/"Spam Post" placeholders; mobile: richer cards with quoted excerpts, priority badges, and affiliation-colored tags for "Marcus_V" and "Lila_Mediate"). Took the mobile version's richer card shape (excerpt quote + priority badge + `AffiliationChip`) since it maps more directly onto the `AdminReport` shape already established for `mocks/forums.ts`/`mocks/feed.ts`, and folded in the desktop version's two placeholder reports as the other two queue items so the full 3-priority spread is represented.

**Verification:** `npm run lint` and `npm run build` both pass clean; `/admin` in the route list. Confirmed via curl that the route correctly redirects to the sign-in gate when no mock session exists (same guard as every other `(app)` route). **Not yet visually confirmed in a browser** — recommend logging in as a `mediator` or `admin` (via `/login`'s dev picker) and clicking through all three actions (Review, Dismiss, Suspend) to confirm the queue count, Suspended stat, and Audit Log all update live; also confirm a `member` session still sees Access Denied.

---

## Phase A9 — Frontend QA ⚠️ (partial — two items need a human with a browser)

- [x] Unit tests for form validation (registration, report form) with `zod` schemas — added `vitest` (`npm test`) as the project's first test runner; extracted the inline schemas from `register/page.tsx` and `(app)/safety/page.tsx` into `webapp/src/lib/validation/{registration,report}.ts` (single source of truth, importable by tests); 17 tests across boundary cases (min/max length, regex, email format, required fields, enum membership)
- [ ] Manual pass on both mobile and desktop breakpoints for every page — **not done**, no browser/screenshot tool is available in this environment. Ran an automated proxy check instead: every page component uses responsive `md:` breakpoint classes (confirmed via grep across all 13 page/layout files) — this proves responsive intent exists, but does **not** confirm it actually looks right at each breakpoint. Please run `npm run dev` and manually check both a mobile viewport and desktop for every route before starting Part B.
- [x] Accessibility check (color contrast) — computed real WCAG 2 contrast ratios (`webapp/src/lib/accessibility/contrast.ts` + `contrast.test.ts`, 12 tests) for every affiliation-chip color against its actual rendered background (the `color-mix()` 5%/15% tints from `globals.css`), not just eyeballed. **Two genuine, measured gaps found and documented (not silently fixed — these are Phase A1 colors ported verbatim from the mockups, so narrowing them is a design call, not mine to make unilaterally):**
  - **Blood Red** (`#ff0000`) chip text peaks at **4.00:1** even against plain white — never reaches the 4.5:1 AA normal-text threshold (it does clear the more lenient 3:1 large-text/UI threshold everywhere).
  - **Latin King** chip text (`#b8860b`, the darker text variant) peaks at **3.25:1** — same shortfall, still clears 3:1. Worse: the raw yellow **border** (`#ffd700` against white) measures only **1.40:1**, failing even the lenient 3:1 UI-component threshold outright.
  - Crip, Deceptacon, and Independent/Neutral all comfortably clear 4.5:1 everywhere tested (6.0–9.4:1).
  - **Recommendation for a follow-up:** darken Blood Red and/or the Latin King border slightly, or bump chip label font-weight/size if the raw hues need to stay brand-accurate.
- [ ] Full click-through demo of every flow (registration → feed → forums → report → admin) using only mock data — **not done** interactively, same no-browser-tool limitation. Ran an automated proxy check instead: audited every `href`/`Link` target across every page and every nav component (`TopNav`, `SideNav`, `BottomNav`, `Footer`) and confirmed all of them resolve to a real route in the `npm run build` route list (`/`, `/about`, `/register`, `/login`, `/feed`, `/forums`, `/forums/[categoryId]`, `/forums/[categoryId]/[threadId]`, `/safety`, `/admin`, `/about#guidelines`) — zero dead links found. This does **not** confirm the flows actually work end-to-end (form submissions, state transitions, session gating) — please click through registration → feed → forums → report → admin yourself before starting Part B.

**Verification:** `npm run lint`, `npm run build`, and `npm test` (29/29 passing) all pass clean.

---

## Phase A10 — Profile, Friends, Messages, Settings (mock data) ✅

**Not in the original roadmap.** These four were explicitly deferred to Phase B10 ("Post-Launch... currently placeholder nav items with no page") since no mockup exists for any of them. Built now at the user's explicit request, after they flagged the disabled `SideNav`/`BottomNav` items as "not functional." No reference design exists for these, so the layout/copy is original (matching the existing "Radical Neutrality" component set — `Card`, `Badge`, `AffiliationChip`, `Button`), not ported from `desktop/`/`mobile/` like every other phase.

- [x] `webapp/src/lib/session.tsx` — added `updateSession(patch)` to the session context, and `bio?: string` to `MockSession`, so Profile/Settings can persist edits to the same localStorage-backed mock session instead of inventing separate unpersisted state
- [x] `webapp/src/lib/avatarColor.ts` — extracted the community→avatar-color map that used to live only in `feed/page.tsx` into a shared module, since Profile/Friends/Messages all need the same avatar circles
- [x] `/profile` (`mocks/profile.ts` + `(app)/profile/page.tsx`) — editable bio (persisted via `updateSession`), stats computed live from `mocks/feed.ts`/`mocks/forums.ts` (posts authored, threads authored, likes received), "My Posts" list with an empty state
- [x] `/friends` (`mocks/friends.ts` + `(app)/friends/page.tsx`) — pending friend requests with Accept/Decline (mutate local state, matching the Admin dashboard's Review/Dismiss pattern), friends grid with online/offline status dot, search filter, Message/Remove actions
- [x] `/messages` (`mocks/messages.ts` + `(app)/messages/page.tsx`) — conversation list + thread view, responsive (list-or-thread on mobile via `activeConversation` truthiness, split-pane on desktop); conversation `id`s match friend `id`s so a `/messages?with=<friendId>` link from Friends always resolves — synthesizing an empty conversation on the fly if one doesn't exist yet; send-message appends to local state, unread badge clears on open
- [x] `/settings` (`(app)/settings/page.tsx`) — account fields (display name, community) wired to `updateSession()`; notification/privacy toggles (local state, no persistence — matches every other Part A mock-data phase); danger zone with Log Out (`session.logout()`) and a two-step mock Delete Account confirmation
- [x] `SideNav`/`BottomNav` — removed the `disabled` placeholder branch entirely (dead code once nothing used it), pointed all items at real routes. `BottomNav` only has room for 5 icons (Feed/Forums/FAB/Messages/Profile, per the original Phase A1 scope) so Friends/Settings aren't in it — added small cross-links from the Profile page header instead so they're still reachable on mobile

**Related bug fixes caught along the way (same session, same root cause — decorative-looking elements with no handler wired up):**
- `SideNav`/`BottomNav` used plain `<a href>` instead of Next's `<Link>` for News Feed/Forums/Admin — worked, but did a full page reload instead of the persistent client-side shell transition Phase A2 was built around. Switched to `<Link>`.
- `BottomNav`'s "create post" FAB had no `href`/`onClick` at all. Now links to `/feed#feed-composer`.
- `/feed`'s "Trending Peace Talks" sidebar items had `cursor-pointer` + hover styling but no click handler. Added a `relatedCategory` field to `mocks/feed.ts`'s `TrendingItem` type; clicking now filters the feed to that category with a clearable "Filtering by: X" chip.

**Verification:** `npm run lint`, `npm run build` (all 4 new routes — `/profile`, `/friends`, `/messages`, `/settings` — appear in the route list), and `npm test` (29/29) all pass clean. Confirmed via curl that all 4 new routes correctly redirect to the sign-in gate when logged out, same as every other `(app)` route. **Not yet visually confirmed in a browser** — same no-browser-tool caveat as every other phase this session; please click through Profile (edit bio, check computed stats), Friends (accept/decline a request, search, message a friend), Messages (send a message, verify unread badges clear), and Settings (save account changes, toggle switches, log out) before considering this phase done.

---

# PART B — Backend (Supabase integration)

Only start here once Part A is fully built and demoable.

## Phase  ✅

- [x] Install `@supabase/supabase-js`, `@supabase/ssr` — present in `webapp/package.json` (`@supabase/supabase-js@^2.110.6`, `@supabase/ssr@^0.12.3`)
- [x] Create a Supabase project (dev + prod, or dev branch) — project `iejbqtyaeminrztghmyb` created and reachable (`https://iejbqtyaeminrztghmyb.supabase.co`); single project for now, no separate dev/prod branch yet
- [x] Set up env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only) — all three in `webapp/.env.local` (gitignored at both root and `webapp/` level); service role key verified via JWT payload decode (`role: service_role`, matching project ref, not expired)

**Note:** `public` schema currently has zero tables — Phase B1 (schema) has not started yet.

---

## Phase B1 — Database Schema (Supabase/Postgres) ✅

Design tables to match the shapes already established by the `mocks/` data in Part A:

- [x] `profiles` (id → auth.users, username, avatar_url, community_affiliation, role: member/mediator/admin, bio, created_at) — `username` has `unique` + length (3–30) + no-spaces check constraints mirroring `lib/validation/registration.ts`
- [x] `communities` (id, name, color_key) — seeded with crip/blood/latin_king/deceptacon/neutral ("Independent"), matching `AffiliationChip`'s `communityMeta`
- [x] `forum_categories` (id, title, description, icon, topic_count) — seeded with all 6 categories from `mocks/forums.ts` (text slug ids, e.g. `peace-unity`, so B3's `/forums/[categoryId]` routes need no id remapping)
- [x] `forum_threads` (id, category_id, author_id, title, created_at)
- [x] `forum_posts` (id, thread_id, author_id, body, created_at) — kept separate from `feed_posts` (different parent: thread vs. author-only stream), matching how `mocks/forums.ts` and `mocks/feed.ts` are already two distinct shapes
- [x] `feed_posts` (id, author_id, body, media_url, created_at)
- [x] `post_likes`, `post_comments`, `post_saves` (join tables, post_id + user_id, scoped to `feed_posts` — Phase B4's bullet list is where these are wired, forum posts keep their own denormalized `likes` count logic in B3 instead) — `post_likes`/`post_saves` use a composite `(post_id, user_id)` primary key; `post_comments` has its own `id` since it carries a `body`, not just a flag
- [x] `reports` (id, reporter_id [nullable if anonymous], target_type, target_id, category, description, evidence_url, status, created_at) — `status` includes `suspended` in addition to pending/reviewed/dismissed, matching `mocks/admin.ts`'s actual `ReportStatus` type (step.md's original 3-value list was incomplete)
- [x] `moderation_actions` (id, report_id, moderator_id, action: dismiss/warn/suspend, notes, created_at)
- [x] Enabled **Row Level Security** on all 11 tables, with real policies (not permissive placeholders) — own-record read/write for regular users; a shared `public.is_moderator()` `SECURITY DEFINER` helper gates the reports queue and audit log to mediator/admin only, reused across every moderator-only policy instead of repeating the role-check subquery

**Verification:** Ran `mcp__supabase__get_advisors` (both `security` and `performance`) after applying. Fixed everything real it surfaced: 4 missing foreign-key indexes (`post_likes.user_id`, `post_saves.user_id`, `post_comments.user_id`, `moderation_actions.moderator_id`), a WARN-level RLS perf issue where `auth.uid()`/`is_moderator()` were being re-evaluated per-row instead of once per query (fixed by wrapping in `(select ...)` across every affected policy), and tightened `is_moderator()`'s `EXECUTE` grant (was implicitly callable by `PUBLIC`; now `authenticated`-only). One remaining advisor WARN is a reviewed false positive: `is_moderator()` must stay executable by `authenticated` for the RLS policies that call it to work at all — the function takes no arguments and only reveals the caller's own role, so this isn't a real gap (same "measured, not silently forced" treatment as the Phase A9 contrast findings). Confirmed via `list_tables` that all 11 tables exist with `rls_enabled: true` and correct FK constraints, and that seed data landed (`communities`: 5 rows, `forum_categories`: 6 rows). **Not yet tested against a real signed-in user** — Phase B2 (real auth) is what will actually exercise these policies end-to-end; worth a manual RLS smoke test then (Phase B8 already plans this).

---

## Phase B2 — Real Authentication & Registration ✅

- [x] Wire Supabase Auth (email + password) into the existing Login/Registration UI from Phase A4 — `webapp/src/app/login/page.tsx` uses `supabase.auth.signInWithPassword()`
- [x] Step 2: replace mock submit with `supabase.auth.signUp()` — `webapp/src/app/register/page.tsx`, called on "Continue" from the Profile step
- [x] Step 3: replace mock OTP with Supabase's built-in email OTP/verification link — added a real **Verification** step (`register/page.tsx`, `STEP_LABELS` is now `["Affiliation", "Profile", "Verification", "Agreement"]`, 4 steps total, matching the original mockup's 4-step flow): 6-digit code input calling `supabase.auth.verifyOtp({ email, token, type: "signup" })`, plus a "Resend code" action (`supabase.auth.resend({ type: "signup", email })`). If `signUp()` already returns a live `session` (i.e. the project has "Confirm email" turned off), the step is skipped automatically since there's no code to verify.
- [x] Step 4: on submit, insert real `profiles` row (username, affiliation, agreed_at) — `handleComplete()` in `register/page.tsx`, handles the unique-username conflict (Postgres `23505`) with a friendly inline error
- [x] Replace the mock session (Phase A2) with real Supabase session/middleware — `webapp/src/lib/session.tsx`'s `SessionProvider` now backs `useSession()` with `supabase.auth.getUser()` + `onAuthStateChange`, fetching the matching `profiles` row; the `MockSession` shape/API is unchanged so none of Part A's 9 consumer files needed edits
- [x] Add Next.js middleware to protect `(app)` routes (redirect to `/login` if no session) — **note:** this Next.js 16 project renamed `middleware.ts` → `proxy.ts` (see `webapp/AGENTS.md`); the file is `webapp/src/proxy.ts`, server-side `supabase.auth.getUser()` gate on `["/feed","/forums","/safety","/admin","/profile","/friends","/messages","/settings"]`, redirects to `/login?redirect=<path>`
- [x] Role-based guard for `/admin` now reads `role` from the real `profiles` table — `canModerate(session.role)` unchanged from Phase A2, but `session.role` is now populated from a live `profiles` query (`lib/session.tsx`'s `fetchProfile()`)

**Verification requirement (action needed in the Supabase dashboard, not something the available tools can do):** `verifyOtp({ type: "signup" })` only works if the project's **Confirm signup** email template includes `{{ .Token }}` — Supabase's default template only embeds `{{ .ConfirmationURL }}` (a magic link, no code). Go to **Authentication → Email Templates → Confirm signup** in the Supabase dashboard and add the `{{ .Token }}` variable to the email body, otherwise users will receive a link instead of a 6-digit code and the Verification step's input will never validate. **Confirmed via `auth.users` (`email_confirmed_at` == `created_at` for every existing row): "Confirm email" is currently disabled on this project**, so the Verification step is always auto-skipped right now (the `data.session` check kicks in) — the template gap above only matters once/if confirmation gets turned on.

**Bug found and fixed the same day (real user hit it):** the "Account setup incomplete" panel in `(app)/layout.tsx` — shown when a user has a Supabase auth account but no `profiles` row (registration interrupted before the final insert) — used to force a **Sign Out & Register Again**. That's a dead end: the email is already registered, so a fresh `signUp()` for it just fails. Fixed properly:
- `register/page.tsx` now checks on mount whether the current user already has an auth account but no `profiles` row (`resuming` state). If so, it skips the email/password/OTP steps (already done) and goes straight from Affiliation → Agreement, with a "Welcome back" banner explaining why.
- `(app)/layout.tsx`'s incomplete-account panel now links to `/register` (which resumes correctly) instead of forcing a sign-out; a plain "Sign Out" is still offered separately as an escape hatch.
- Confirmed against the actual affected row in the database (`hassanmehmood7888@gmail.com`, an auth user created without a matching `profiles` row) that this is a real, reachable state — not hypothetical.

**Local verification:** `npm run lint`, `npm run build` (all 16 routes still compile, `proxy.ts` shows as "ƒ Proxy (Middleware)" in the build output), and `npm test` (29/29) all pass clean after both the OTP step and the resume-registration fix. **Not yet tested against a real signup end-to-end with a live email inbox** (moot right now since email confirmation is off) — worth the RLS smoke test Phase B8 already plans, now that real signed-in users exist. Please also manually confirm the resume flow: sign in as `hassanmehmood7888@gmail.com` (or any account stuck in this state), confirm you land on the "Account setup incomplete" panel, click **Finish Setting Up**, pick an affiliation, and confirm it completes registration and lands on `/feed`.

---

## Phase B3 — Wire Forums to DB ✅

- [x] `/forums` — replace mock categories with live `forum_categories` query — `webapp/src/app/(app)/forums/page.tsx`, joined with an embedded `forum_threads(count)` aggregate for topic counts (the stored `forum_categories.topic_count` column is left unused — computing it live avoids needing a trigger to keep it in sync)
- [x] `/forums/[categoryId]` — replace mock thread list with live query — joins `profiles(username, community_affiliation)` for author info and `forum_posts(count)` for reply counts
- [x] `/forums/[categoryId]/[threadId]` — replace mock posts with live query + real insert on reply — inserts into `forum_posts` with `author_id = session.id`, then refetches
- [x] Search bar → `ilike` query against category/thread titles — `/forums` uses `.or('title.ilike.%q%,description.ilike.%q%')`, the category page uses `.ilike('title', ...)` scoped to that category; both are real Postgres queries, not client-side JS filtering
- [x] "New Topic" → real insert into `forum_threads` — since `forum_threads` has no `body` column (by design — the thread's OP is its first reply), "New Topic" does two inserts: the thread row, then a `forum_posts` row for the content typed in the modal, then navigates straight to the new thread

**Reconciliation with Phase A5's mock UI (real schema gaps, not implementation choices):**
- `forum_categories` has no `moderator` column and `forum_threads` has no `pinned` column — both were mock-only decorations from Phase A5 with no backing schema. Dropped the "Mod: @username" footer and pinned-thread sorting/badge rather than inventing new columns outside this task's scope.
- Neither `forum_threads` nor `forum_posts` has a view-count or like-count column (unlike `feed_posts`, which gets real `post_likes`/`post_saves`/`post_comments` join tables in Phase B4). Dropped the mock view counts and the per-post Like/Reply buttons from `PostCard` — they had no real data to back them, and leaving fake, non-persisting buttons in a now-"live" page would be misleading. Revisit if forum post likes become an actual requirement (would need a new join table + RLS policies, out of scope here).

**A real TypeScript gotcha worth knowing for the rest of Part B:** this project has no generated `Database` type (`generate_typescript_types` was never run), so `supabase-js` can't infer embed cardinality from the select-string alone — it types every embedded relation as an array, even genuine many-to-one embeds like `profiles(username)` on a thread/post (which return a single object at runtime, not an array). Fixed by defining a small `*QueryRow` type per query matching the real runtime shape and casting `data as unknown as ThatType[]` right after the fetch, rather than trusting the inferred type. Confirmed this isn't just a hunch — see verification below.

**Verification:** `npm run lint`, `npm run build` (all 16 routes compile), and `npm test` (29/29) all pass clean. Beyond static checks, this was smoke-tested against the **real** Supabase project: seeded a throwaway thread + reply directly via SQL, signed in as a disposable test user through the real Auth REST API (`/auth/v1/signup` + `/auth/v1/token`) to get a genuine `authenticated`-role JWT, then replayed the exact embedded-select queries the app uses against `/rest/v1/forum_threads` and `/rest/v1/forum_posts` — confirmed `profiles` comes back as a plain object and `forum_threads(count)`/`forum_posts(count)` come back as `[{count: n}]`, exactly matching the cast types used in code. Also confirmed the RLS policies on `forum_threads`/`forum_posts`/`forum_categories` are scoped to the `authenticated` role only (an anon-key request with no session correctly gets `[]`, not an error — this matches how real users hit these pages, since `proxy.ts` already gates every `(app)` route behind a session). All test data and the disposable test user were deleted afterward. **Not yet clicked through in an actual browser** — please run `npm run dev`, sign in, and confirm: browsing `/forums` shows the 6 seeded categories with correct topic counts, creating a New Topic actually lands you on the new thread with your reply visible as the first post, and search/reply/new-topic all round-trip through a page refresh (proving it's real and not just optimistic local state).

---

## Phase B4 — Wire News Feed to DB ✅

- [x] `/feed` — composer inserts into `feed_posts`; list becomes a live query — `webapp/src/app/(app)/feed/page.tsx`, joined with `profiles` for author info and `post_likes(count)`/`post_comments(count)` aggregates
- [x] Like / comment / save actions → real `post_likes` / `post_comments` / `post_saves` writes, keep optimistic UI — Like/Save toggle local state instantly then fire the real insert/delete (resyncing via refetch only if the write fails); Comments didn't have any UI at all in Phase A6 (the comment button was explicitly "visual only per spec" with no composer), so this phase adds one: clicking the comment icon expands a real, lazily-loaded thread + a small reply composer that inserts into `post_comments`
- [x] Report button → real insert into `reports` (target_type = 'feed_post') — reused the same 6-category enum + validation (`lib/validation/report.ts`) that `/safety` already defined, rather than inventing a separate category list; added a details textarea to the modal since `reports.description` has a `>= 10 chars` check constraint and the old mock modal had no text field at all
- [x] Trending sidebar → real query (most-liked/commented in last 24–72h) — fetches recent posts with engagement counts, ranks by `likes + comments` client-side, top 4 shown; clicking one scrolls to that post in the main feed (there's no separate category/hashtag concept backing this in the schema, see reconciliation below, so "filter the feed" wasn't a coherent replacement behavior)

**Reconciliation with Phase A6's mock UI (real schema gaps, not implementation choices):** `feed_posts` has no `category`, `featured`, or `featuredTitle` columns — all three were Phase A6 mock-only decorations with no backing schema (same pattern as Forums' dropped `moderator`/`pinned` fields in Phase B3). Dropped the category tag, the trending-click-to-filter-by-category mechanic, and the halftone "featured post" styling. `Profile`'s stats (`/profile`) still read from `mocks/feed.ts` — deliberately left alone, since wiring Profile to real data is explicitly Phase B10 scope, not B4.

**A real RLS/PostgREST gotcha worth knowing for the rest of Part B (caught during smoke-testing, not a bug in the shipped code — see below):** for `INSERT ... RETURNING`, Postgres also enforces the table's **SELECT** policy on the newly-inserted row, not just the INSERT policy's `WITH CHECK`. `reports` only allows `SELECT` for moderators (`is_moderator()`), so a regular member's report insert would be rejected with a `42501 row-level security policy` error — but *only* if the client requests the row back (`Prefer: return=representation`, which happens automatically whenever supabase-js's `.insert()` is chained with `.select()`). The actual code in `feed/page.tsx` calls `.insert({...})` **without** chaining `.select()`, so it correctly uses the safe `return=minimal` default and was never actually broken — this was flagged and fixed in my own debug curl script, not in the app. Worth remembering for B5/B6: never chain `.select()` onto a `reports` insert unless the inserting role is guaranteed to be a moderator.

**Also fixed during smoke-testing (a genuine bug, unlike the false alarm above):** the first version of the `feed_posts` queries used a bare `profiles(...)` embed, which PostgREST rejected with `PGRST201` ("more than one relationship was found") — because `post_likes` and `post_saves` also FK to both `feed_posts` and `profiles`, creating multiple valid join paths PostgREST can't disambiguate on its own (this didn't happen in Phase B3's forum queries, which have no such bridge tables). Fixed by using the explicit hint syntax, `profiles!feed_posts_author_id_fkey(...)`.

**Verification:** `npm run lint`, `npm run build` (all 16 routes compile), and `npm test` (29/29) all pass clean. Smoke-tested against the **real** Supabase project the same way as Phase B3: created a disposable authenticated test user (with a real `profiles` row this time, since `feed_posts.author_id` FKs to `profiles.id`, not `auth.users.id` directly), then replayed the app's exact insert/select queries for a post, a like, a comment, and a report via the real REST API — confirmed the `profiles!feed_posts_author_id_fkey` fix resolves cleanly, confirmed the reports RETURNING gotcha above, and confirmed the final (correct, no-`.select()`) report insert returns `201`. All test data and the disposable user were deleted afterward. **Not yet clicked through in an actual browser** — please run `npm run dev`, sign in, and confirm: posting, liking/unliking, saving, commenting, and reporting all persist across a page refresh (proving they're real, not optimistic-only), and that Trending shows real posts ranked by engagement.

---

## Phase B5 — Wire Safety & Reporting to DB ✅

- [x] `/safety` form → real insert into `reports` (target_type = 'user' or 'general', supports anonymous submission) — `webapp/src/app/(app)/safety/page.tsx`

**How target resolution works:** `reports.target_id` is a bare `uuid` with no FK constraint (it's polymorphic — meaning depends on `target_type`), and the form's "Entity Involved" field is free text (could be a username, could be a group name, might not exist at all), so it won't always resolve to a real profile. The submit handler looks up `profiles` by that username first: if it matches, the report gets `target_type: "user"` with a real `target_id` moderators can cross-reference; if it doesn't match (or the field was left blank), it falls back to `target_type: "general"` with `target_id: null` — but either way, the raw entity text is folded into the description (`"Entity involved: {text}\n\n{details}"`) so it's never silently dropped just because it didn't resolve to a real user.

**Anonymous submission:** `reporter_id` is set to `null` when the anonymous toggle is on, `session.id` otherwise — matches the existing RLS policy (`reporter_id IS NULL OR reporter_id = auth.uid()`) with no changes needed there.

**Verification:** `npm run lint`, `npm run build` (all 16 routes compile), and `npm test` (29/29) all pass clean. Smoke-tested against the **real** Supabase project: created a disposable authenticated test user + profile, then replayed the exact username-lookup query and all three insert paths the form can take — named+matched (→ `target_type: user` with a real `target_id`), named+unmatched (→ `target_type: general`, entity text preserved in the description), and anonymous (→ `reporter_id: null`). Confirmed via direct query that all three rows landed with exactly the expected shape. Also confirmed the code never chains `.select()` onto the `reports` insert, avoiding the RETURNING/SELECT-policy gotcha documented in Phase B4. All test data and the disposable user were deleted afterward. **Not yet clicked through in an actual browser** — please run `npm run dev`, submit a report both with and without the anonymous toggle and with/without an "Entity Involved" value, and confirm the success screen appears each time.

---

## Phase B6 — Wire Admin / Moderation Dashboard to DB ✅

- [x] Stats cards → real queries (`count()` on `profiles`/`reports`) — `webapp/src/app/(app)/admin/page.tsx`; **swapped "Active Now" for "New This Week"** (count of `profiles` created in the last 7 days) since there's no presence/session-tracking table to back a real "currently online" figure — that's explicitly Phase B7 scope ("Presence (optional)"), so faking it here would've been a fabricated number, not a real query
- [x] Reported content queue → live query, `status = 'pending'`
- [x] Review / Dismiss / Suspend actions → real insert into `moderation_actions`, update `reports.status`, and (for suspend) flag the offending `profiles` row
- [x] Audit log view → real query of past moderation actions

**Schema gap found and fixed (migrations `b6_admin_moderation_support` + `b6_perf_fixes`):** Phase B1 never gave `profiles` any way to represent "suspended" (the `role` enum is only member/mediator/admin), so "flag the offending profiles row" had nothing to write to. Added `profiles.is_suspended boolean` + `profiles.suspended_at timestamptz`. Also added `moderation_actions.subject_id uuid references profiles(id)` — the audit log needs a stable "who was this action about" reference, but `reports.target_id` is polymorphic (a report's target might be a `feed_post`, `forum_post`, `user`, or `general`), so resolving "who" from the report alone at *read* time would mean re-doing the same multi-table lookup on every audit log render. Resolving it once at *action* time and storing it is simpler and cheaper. Also added a `profiles_update_own_or_mod` RLS policy (moderators previously had no way to update anyone else's profile row at all — `profiles_update_own` only covered `id = auth.uid()`), consolidated into one policy rather than two separate permissive ones, matching the `_own_or_mod` naming/shape already used for `forum_threads`/`forum_posts`/`feed_posts`. Ran `get_advisors` after both migrations and fixed the one real hit (missing index on `moderation_actions.subject_id`).

**Reconciliation with Phase A8's mock UI (real schema gap, not an implementation choice):** the mock's `AdminReport` shape assumed every report has a `title`, `excerpt`, `priority`, and a single obvious "subject" user — none of which the real `reports` table has. There's no priority scoring anywhere in the schema or the checklist, so the priority badge is dropped rather than invented. "Title" collapsed into the category label (`lib/validation/report.ts`'s `CATEGORY_LABELS`, now exported and shared with `/feed`'s report modal instead of being duplicated); "excerpt" is just the real `description` text. **Resolving "subject" is genuinely harder than the mock assumed**, because `reports.target_id` means something different depending on `target_type`: `user` → it *is* a profile id directly; `feed_post`/`forum_post` → it's a post id, so the actual person is that post's author, one more hop away; `general` → there's no identifiable person at all (e.g. a `/safety` report where the "Entity Involved" field didn't resolve to a real username, per Phase B5). The queue resolves all three cases (batched by type, not one query per report) and the **Suspend button is disabled with an explicit tooltip** when a report has no resolvable subject, rather than pretending there's someone to suspend.

**A repeat of the Phase B4 embed-ambiguity gotcha, avoided this time because it was already known:** `moderation_actions` now has *two* FKs to `profiles` (`moderator_id` and the new `subject_id`), which is exactly the shape that broke Phase B4's first attempt at `feed_posts`. Used the explicit alias syntax from the start this time — `moderator:profiles!moderation_actions_moderator_id_fkey(username)` and `subject:profiles!moderation_actions_subject_id_fkey(username)` — and confirmed via the real REST API that it resolves both correctly in one query with no `PGRST201`.

**Verification:** `npm run lint`, `npm run build` (all 16 routes compile), and `npm test` (29/29) all pass clean. Smoke-tested against the **real** Supabase project with two disposable users — a `member` (as a report subject) and a `mediator` (to actually exercise the dashboard's own role gate, not just a superuser bypass): seeded a `feed_post` report and a direct `user` report, then replayed every query/mutation the page makes as the moderator — queue fetch with subject resolution, Dismiss (`moderation_actions` insert + `reports.status` update), Suspend (same, plus the `profiles.is_suspended` flag), and the dual-alias audit log fetch — all confirmed correct via direct DB checks afterward. **Also explicitly tested the negative case**: confirmed a regular member's attempt to flip another user's `is_suspended` column is silently rejected by RLS (zero rows affected, verified by re-querying the target row directly — a `204` alone doesn't prove a write happened, since PostgREST returns `204` for zero-row updates too). All test data and both disposable users were deleted afterward. **Not yet clicked through in an actual browser** — please run `npm run dev`, sign in as a mediator/admin, and confirm the queue, stats, and audit log all show real data, and that Review/Dismiss/Suspend visibly update the list without a page refresh.

---

## Phase B7 — Real-time Features ✅

- [x] Supabase Realtime channel for Live Hub chat (subscribe to a `chat_messages` table by room/channel) — new `chat_messages` table (migration `b7_realtime_chat_and_notifications`), room-scoped (`room = 'live_hub'` for now), added to the `supabase_realtime` publication; `webapp/src/app/(app)/feed/page.tsx` loads the last 30 messages then subscribes via `postgres_changes` INSERT events — sending a message only inserts, it never appends locally, so the Realtime event is the single source of truth (no duplicate-message risk from racing a local append against the broadcast)
- [x] Realtime notification badge (new report assigned, new reply to your thread, etc.) via a `notifications` table + subscription — new `notifications` table + a `NotificationBell` component (`webapp/src/components/layout/NotificationBell.tsx`), mounted once in `(app)/layout.tsx` in a thin bar above every app page's content (no existing header/nav surface had room for it — `SideNav` is desktop-only and `BottomNav`'s 5 icon slots are already full per Phase A10). Subscribes to `postgres_changes` INSERT filtered to the signed-in user, shows an unread-count badge, and a dropdown that marks a notification read on click (or "Mark all read")
- [x] Presence (optional): "42 Online" indicator using Supabase Presence — implemented via a real Supabase Presence channel (`presence:live_hub`) in the Feed page: every signed-in viewer tracks themselves on mount, and the Live Hub's "Online" count is the live size of the presence set, not a hardcoded number

**Notifications are populated by triggers, not application code:** two `SECURITY DEFINER` trigger functions (`notify_thread_author()` on `forum_posts` insert, `notify_moderators_new_report()` on `reports` insert) insert directly into `notifications`, bypassing RLS as their own owner — matching the existing `is_moderator()` pattern from Phase B1 (`SET search_path TO 'public'`, `EXECUTE` explicitly revoked from `anon`/`authenticated` so nobody can invoke either function directly as a PostgREST RPC call to spam notifications). This keeps `notifications` with no `INSERT` policy for regular users at all — every row is either a real reply or a real report, never something the client fabricated.

**Schema-shape correction using the two lessons learned in B4/B6:** `notify_moderators_new_report()` inserts one row per moderator via a plain `select id from profiles where role in (...)`, no ambiguous embed involved. `NotificationBell`'s query (`notifications` → single `profiles`-shaped embed potential) was checked against the same multi-FK-path pitfall from Phase B4/B6 — `notifications` only has one FK to `profiles` (`user_id`), so no explicit alias was needed here, but the fetch was still smoke-tested for real rather than assumed safe by pattern-matching.

**Dead code removed:** `mocks/feed.ts`'s `MOCK_TRENDING`/`TrendingItem` (already unused since Phase B4 made Trending a live query, just never cleaned up) and `MOCK_LIVE_MESSAGES`/`LiveMessage` (now replaced by real chat) — both deleted now that nothing imports them. `MOCK_FEED_POSTS`/`FeedPost` stay, since `/profile`'s stats still read from them (Phase B10 scope).

**Also deduplicated while touching every page again:** the same `timeAgo()` helper had been copy-pasted into 5 different page files across Phases B3/B4/B6 (forums list, category page, thread page, feed, admin). Extracted to `webapp/src/lib/timeAgo.ts` — crossed the "rule of three" a while ago, worth fixing while already in these files rather than adding a 6th copy for `NotificationBell`.

**Verification:** `npm run lint`, `npm run build` (all 16 routes compile), and `npm test` (29/29) all pass clean. Smoke-tested against the **real** Supabase project with two disposable users: confirmed a chat message insert + the exact initial-load query round-trip correctly, confirmed RLS rejects a user trying to post a chat message under someone else's `author_id`, confirmed the `forum_reply` trigger fires when a different user replies to a thread (and does *not* fire when you reply to your own thread, per the trigger's own check), confirmed the `new_report` trigger notifies every moderator (temporarily promoted a test user to `mediator` to prove it), confirmed a user cannot see another user's notifications (RLS), and confirmed "mark as read" genuinely persists (checked the row directly rather than trusting a `204`, per the Phase B6 lesson). All test data, the temporary moderator promotion, and both disposable users were removed afterward. **Presence was smoke-tested by code/pattern review only, not an end-to-end multi-tab test** — Realtime Presence is a WebSocket-only feature with no REST/SQL surface, so it can't be verified the same way as the rest of this phase; please open `/feed` in two browser sessions and confirm the "Online" count reflects both. **Not yet clicked through in an actual browser** otherwise — please also confirm Live Hub messages appear instantly across two open tabs, and that a new notification's badge/dropdown updates live without a refresh.

---

## Phase B8 — Backend Testing & QA ⚠️ (RLS tests done and a critical bug fixed; click-through still needs a human)

- [x] RLS policy tests (verify a member cannot read another user's private data, cannot access `/admin` data)
- [ ] Re-run the full click-through demo from Phase A9, this time against real data, confirming no regressions from the mock → live swap

### 🔴 Critical bug found and fixed: any member could self-promote to admin

While building the RLS test suite, testing surfaced a real privilege-escalation hole introduced back in Phase B6: `profiles_update_own_or_mod` is a **row**-level policy (`id = auth.uid() OR is_moderator()`) with no **column**-level restriction. "You can update your own profile row" silently also meant "including your own `role` and `is_suspended` columns" — verified end-to-end that a plain member could `PATCH /rest/v1/profiles?id=eq.<self>` with `{"role":"admin"}` directly via the REST API (bypassing the app's UI entirely, e.g. via browser devtools or curl) and it would genuinely persist, granting full access to `/admin` including the Suspend action on other users.

**Fixed** with migrations `b8_fix_profile_privilege_escalation` + `b8_fix_trigger_service_role_exemption`: a `BEFORE UPDATE` trigger (`prevent_privileged_profile_changes()`) that blocks changes to `role`/`is_suspended`/`suspended_at` unless the requester `is_moderator()`. Column-level Postgres `GRANT`s were considered and rejected — they apply to the `authenticated` role as a whole and can't conditionally let moderators through while blocking regular members, which a trigger can. The first version of the fix accidentally also blocked legitimate `service_role`/direct-SQL access (including this very migration tool) since `is_moderator()` resolves via `auth.uid()`, which is empty outside a real PostgREST request — fixed by explicitly exempting `current_user in ('postgres', 'service_role')`, mirroring how RLS itself already bypasses for those roles.

### RLS test suite — `webapp/scripts/rls-tests.mjs` (`npm run test:rls`)

All the RLS verification done ad hoc via `curl` throughout Phases B2–B7 is now a single, reusable, self-cleaning integration test script rather than one-off commands lost to the conversation history. It creates disposable test users (member/member/moderator) via the real Auth API, seeds a report/moderation action/notification via the service-role key, then exercises the exact REST paths the app itself uses as each role, before deleting everything it created. **Deliberately not wired into CI** — it mutates real data in whichever Supabase project `.env.local` points at and needs the service-role secret, neither of which belongs in a standard CI run; re-run by hand after any RLS/policy change.

**16/16 checks passing**, covering: member cannot read another member's notifications (but can read their own); member cannot update another member's profile; member cannot read the `reports` queue or the `moderation_actions` audit log (both admin-only) — moderator can read both; member cannot insert a moderation action; **member cannot self-promote to admin or self-unsuspend** (the bug above, now a permanent regression test); moderator *can* still change another member's role/suspension (no regression from Phase B6); member can still edit their own safe fields (bio); member cannot impersonate another user's `author_id`/`user_id` in `chat_messages` or `feed_posts`; a regular client cannot insert into `notifications` directly (trigger-only, per Phase B7); anonymous (no session at all) cannot read `reports`.

**A methodology note worth keeping in mind for any future RLS test writing:** for `SELECT`, PostgREST returns `200` with an **empty array** when RLS blocks all rows — not a `401`/`403`. For `UPDATE`, it returns `204` whether zero rows or many rows actually matched. Every check in this script asserts on the actual returned *data* (row count, or a follow-up service-role read of the real column value), never on HTTP status alone for read/update checks — status-alone was already proven unreliable twice in this project (Phase B6, then again during this phase's own escalation testing, where a "successful" self-unsuspend attempt turned out to be a no-op because the account wasn't actually suspended yet when first tested).

### Full click-through demo — needs a human with a browser

This is the one item across the entire Part A/B roadmap that genuinely cannot be done by the assistant in this environment — there has never been a screenshot/browser automation tool available in any session on this project (noted repeatedly since Phase A1). Everything below has been verified at the API/database level (either via this phase's test suite or the smoke tests in each individual B-phase) but **not** clicked through in an actual rendered browser. Please work through this list against the real deployed data:

- [ ] **Register** a brand-new account end-to-end: affiliation → profile (email+password) → verification (if email confirmation is enabled on the project — see Phase B2's note) → agreement → lands on `/feed`
- [ ] **Log out and log back in** with that account
- [ ] **Forums**: browse categories, open a category, open a thread, post a reply, create a brand-new topic from scratch, search both the category list and a thread list
- [ ] **Feed**: post something, like/unlike it, save/unsave it, add a comment, report a post (check it shows "Reported" after), confirm Trending shows real posts ranked by engagement
- [ ] **Live Hub**: send a chat message and confirm it appears instantly in a second browser tab/session signed in as a different user; open `/feed` in two sessions and confirm the "Online" count reflects both
- [ ] **Notifications**: reply to someone else's thread from a second account and confirm the first account's bell badge updates live without a refresh; click it and confirm it marks read and navigates
- [ ] **Safety**: submit a report both with and without the anonymous toggle, both with and without an "Entity Involved" value
- [ ] **Admin** (sign in as a mediator/admin — none of the current seeded accounts are mediator/admin, see note below): confirm stats, the reported queue, and Review/Dismiss/Suspend all reflect real data; confirm a `member` session still sees Access Denied
- [ ] Confirm every flow degrades sensibly on a mobile viewport, not just desktop (Phase A9 flagged this as never actually checked either)

**One real gap this surfaced:** every profile in the live database right now has `role = 'member'` — there is currently no way to become a mediator/admin except a direct database edit (`update profiles set role = 'mediator' where id = '...'`, via the Supabase dashboard or `execute_sql`). That's fine for now (no self-service moderator signup was ever in scope), but you'll need to do that manually to test the `/admin` flows above.

---

## Phase B9 — Deployment

- [ ] Deploy frontend to Vercel, connect to production Supabase project
- [ ] Set production env vars in Vercel dashboard
- [ ] Run Supabase migrations (use Supabase CLI + migration files, not manual dashboard edits, so schema is versioned)
- [ ] Set up custom domain + SSL (handled by Vercel)
- [ ] Enable Supabase daily backups

---

## Phase B10 — Post-Launch

- [ ] Monitor error logs (Vercel + Supabase logs, or add Sentry)
- [ ] Track moderation queue volume — revisit auto-flagging rules if reports pile up
- [ ] Revisit Realtime chat scaling if Live Hub usage grows heavily (Ably/Stream as an upgrade path if needed)
- [ ] Wire Phase A10's Profile/Friends/Messages/Settings to real tables once their Phase B1 schema is designed (`profiles.bio`, a `friendships` join table, `conversations`/`direct_messages`, and real notification-preference storage) — these were built mock-only in Part A and still need their backend

---

### Suggested order of execution

**Part A:** A0 → A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 → A9 → A10
**Part B:** B0 → B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B9 → B10

Within Part A, Phases A3–A8 (the actual pages) can be parallelized across a small team once A0–A2 (foundation) are done, since they mostly don't depend on each other. Same applies to B3–B6 within Part B, once B0–B2 (Supabase setup, schema, real auth) are in place. Phase A10 was added mid-project (outside the original mockup-driven scope) and has no backend counterpart yet — see the added B10 bullet above.
