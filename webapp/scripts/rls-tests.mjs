#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Phase B8 — RLS policy integration tests, run against the REAL Supabase
// project (not a fast offline unit test — needs network + live credentials).
// Creates disposable test users/rows via the service-role key, exercises the
// exact REST paths the app itself uses as regular authenticated users, then
// deletes everything it created.
//
// Run with: npm run test:rls (from webapp/)
// Requires webapp/.env.local to have NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.
//
// Not wired into CI on purpose: it mutates real data in the configured
// Supabase project and needs real secrets, neither of which belong in a
// standard CI run. Meant to be re-run by hand after any RLS/policy change.
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const path = join(__dirname, "..", ".env.local");
  const text = readFileSync(path, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing Supabase env vars in webapp/.env.local — aborting.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Small REST helpers
// ---------------------------------------------------------------------------
async function rest(method, path, { token, apikey = ANON_KEY, body, headers = {} } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey,
      Authorization: `Bearer ${token ?? apikey}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body, e.g. a 204 */
  }
  return { status: res.status, json };
}

async function signUp(email, password) {
  const { json } = await rest("POST", "/auth/v1/signup", { body: { email, password } });
  return json?.id ?? json?.user?.id;
}

async function signIn(email, password) {
  const { json } = await rest("POST", "/auth/v1/token?grant_type=password", { body: { email, password } });
  return json?.access_token;
}

const asService = { apikey: SERVICE_KEY, token: SERVICE_KEY };

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? "✓" : "✗ FAIL"} ${name}${detail ? " — " + detail : ""}`);
}

// ---------------------------------------------------------------------------
const stamp = Date.now();
const cleanup = [];

async function createTestUser(label, { role = "member" } = {}) {
  const email = `rls-${label}-${stamp}@example.com`;
  const password = "rls-test-password-12345";
  const userId = await signUp(email, password);
  const token = await signIn(email, password);
  await rest("POST", "/rest/v1/profiles", {
    ...asService,
    body: {
      id: userId,
      username: `rlstest_${label}_${stamp}`.slice(0, 30),
      community_affiliation: "neutral",
      role,
      agreed_at: new Date().toISOString(),
    },
  });
  cleanup.push(async () => {
    // A moderator test user can pick up a real trigger-generated
    // notification (notify_moderators_new_report fires on any reports
    // insert, including the seed report below) that isn't tracked by the
    // explicit notification cleanup — delete first or the FK blocks the
    // auth-user delete's cascade.
    await rest("DELETE", `/rest/v1/notifications?user_id=eq.${userId}`, asService);
    await rest("DELETE", `/auth/v1/admin/users/${userId}`, asService);
  });
  return { email, userId, token };
}

async function main() {
  console.log("Setting up disposable test users…\n");
  const alice = await createTestUser("alice"); // member
  const bob = await createTestUser("bob"); // member
  const mod = await createTestUser("mod", { role: "mediator" }); // moderator

  const { json: reportRows } = await rest("POST", "/rest/v1/reports", {
    ...asService,
    headers: { Prefer: "return=representation" },
    body: {
      reporter_id: alice.userId,
      target_type: "general",
      category: "harassment",
      description: "RLS test seed report",
    },
  });
  const reportId = reportRows[0].id;
  cleanup.push(() => rest("DELETE", `/rest/v1/reports?id=eq.${reportId}`, asService));

  const { json: actionRows } = await rest("POST", "/rest/v1/moderation_actions", {
    ...asService,
    headers: { Prefer: "return=representation" },
    body: { report_id: reportId, moderator_id: mod.userId, action: "dismiss", notes: "RLS test seed action" },
  });
  const actionId = actionRows[0].id;
  cleanup.push(() => rest("DELETE", `/rest/v1/moderation_actions?id=eq.${actionId}`, asService));

  const { json: notifRows } = await rest("POST", "/rest/v1/notifications", {
    ...asService,
    headers: { Prefer: "return=representation" },
    body: { user_id: alice.userId, type: "new_report", message: "RLS test seed notification" },
  });
  const notifId = notifRows[0].id;
  cleanup.push(() => rest("DELETE", `/rest/v1/notifications?id=eq.${notifId}`, asService));

  console.log("\nRunning RLS checks…\n");

  // ---- "member cannot read another user's private data" ------------------

  {
    const { json } = await rest("GET", `/rest/v1/notifications?select=id&id=eq.${notifId}`, { token: bob.token });
    record("member cannot read another member's notifications", json.length === 0, `got ${json.length} row(s)`);
  }
  {
    const { json } = await rest("GET", `/rest/v1/notifications?select=id&id=eq.${notifId}`, { token: alice.token });
    record("member CAN read their own notifications", json.length === 1, `got ${json.length} row(s)`);
  }
  {
    const { status } = await rest("PATCH", `/rest/v1/profiles?id=eq.${alice.userId}`, {
      token: bob.token,
      body: { bio: "hijacked by bob" },
    });
    const { json } = await rest("GET", `/rest/v1/profiles?select=bio&id=eq.${alice.userId}`, asService);
    record(
      "member cannot update another member's profile",
      json[0].bio !== "hijacked by bob",
      `PATCH status ${status}, bio now "${json[0].bio}"`,
    );
  }

  // ---- "member cannot access /admin data" ---------------------------------

  {
    const { json } = await rest("GET", `/rest/v1/reports?select=id&id=eq.${reportId}`, { token: alice.token });
    record("member cannot read the reports queue (admin-only)", json.length === 0, `got ${json.length} row(s)`);
  }
  {
    const { json } = await rest("GET", `/rest/v1/reports?select=id&id=eq.${reportId}`, { token: mod.token });
    record("moderator CAN read the reports queue", json.length === 1, `got ${json.length} row(s)`);
  }
  {
    const { json } = await rest("GET", `/rest/v1/moderation_actions?select=id&id=eq.${actionId}`, { token: alice.token });
    record("member cannot read the moderation audit log (admin-only)", json.length === 0, `got ${json.length} row(s)`);
  }
  {
    const { json } = await rest("GET", `/rest/v1/moderation_actions?select=id&id=eq.${actionId}`, { token: mod.token });
    record("moderator CAN read the moderation audit log", json.length === 1, `got ${json.length} row(s)`);
  }
  {
    const { status } = await rest("POST", "/rest/v1/moderation_actions", {
      token: alice.token,
      body: { report_id: reportId, moderator_id: alice.userId, action: "dismiss", notes: "forged by a member" },
    });
    record("member cannot insert a moderation action", status >= 400, `status ${status}`);
  }

  // ---- Phase B8 regression: the self-escalation bug found and fixed ------

  {
    const { status } = await rest("PATCH", `/rest/v1/profiles?id=eq.${alice.userId}`, {
      token: alice.token,
      body: { role: "admin" },
    });
    const { json } = await rest("GET", `/rest/v1/profiles?select=role&id=eq.${alice.userId}`, asService);
    record(
      "member cannot self-promote to admin",
      json[0].role === "member",
      `PATCH status ${status}, role now "${json[0].role}"`,
    );
  }
  {
    await rest("PATCH", `/rest/v1/profiles?id=eq.${alice.userId}`, {
      ...asService,
      body: { is_suspended: true },
    });
    const { status } = await rest("PATCH", `/rest/v1/profiles?id=eq.${alice.userId}`, {
      token: alice.token,
      body: { is_suspended: false },
    });
    const { json } = await rest("GET", `/rest/v1/profiles?select=is_suspended&id=eq.${alice.userId}`, asService);
    record(
      "suspended member cannot self-unsuspend",
      json[0].is_suspended === true,
      `PATCH status ${status}, is_suspended now ${json[0].is_suspended}`,
    );
  }
  {
    const { status } = await rest("PATCH", `/rest/v1/profiles?id=eq.${alice.userId}`, {
      token: mod.token,
      body: { is_suspended: false },
    });
    const { json } = await rest("GET", `/rest/v1/profiles?select=is_suspended&id=eq.${alice.userId}`, asService);
    record(
      "moderator CAN change another member's suspension status",
      status === 204 && json[0].is_suspended === false,
      `PATCH status ${status}, is_suspended now ${json[0].is_suspended}`,
    );
  }
  {
    const { status } = await rest("PATCH", `/rest/v1/profiles?id=eq.${alice.userId}`, {
      token: alice.token,
      body: { bio: "a totally normal bio edit" },
    });
    const { json } = await rest("GET", `/rest/v1/profiles?select=bio&id=eq.${alice.userId}`, asService);
    record(
      "member CAN still edit their own safe fields (bio)",
      status === 204 && json[0].bio === "a totally normal bio edit",
      `PATCH status ${status}, bio "${json[0].bio}"`,
    );
  }

  // ---- Impersonation guards (author_id/user_id must equal auth.uid()) ----

  {
    const { status } = await rest("POST", "/rest/v1/chat_messages", {
      token: alice.token,
      body: { room: "live_hub", author_id: bob.userId, body: "impersonating bob" },
    });
    record("member cannot post a chat message as another user", status >= 400, `status ${status}`);
  }
  {
    const { status } = await rest("POST", "/rest/v1/feed_posts", {
      token: alice.token,
      body: { author_id: bob.userId, body: "impersonating bob's feed post" },
    });
    record("member cannot create a feed post as another user", status >= 400, `status ${status}`);
  }
  {
    const { status } = await rest("POST", "/rest/v1/notifications", {
      token: alice.token,
      body: { user_id: alice.userId, type: "new_report", message: "forged by a client" },
    });
    record("regular client cannot insert notifications directly (trigger-only)", status >= 400, `status ${status}`);
  }

  // ---- Anonymous access -----------------------------------------------------

  {
    const { json } = await rest("GET", "/rest/v1/reports?select=id&limit=1", {});
    record("anonymous (no session) cannot read reports at all", json.length === 0, `got ${json.length} row(s)`);
  }

  // ---- Summary ---------------------------------------------------------

  console.log("\n---");
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("\nFAILED:");
    failed.forEach((f) => console.log(`  - ${f.name}`));
  }

  return failed.length === 0;
}

main()
  .then(async (ok) => {
    console.log("\nCleaning up test data…");
    for (const fn of cleanup.reverse()) {
      try {
        await fn();
      } catch (e) {
        console.error("Cleanup step failed:", e);
      }
    }
    process.exit(ok ? 0 : 1);
  })
  .catch(async (err) => {
    console.error("RLS test run crashed:", err);
    for (const fn of cleanup.reverse()) {
      try {
        await fn();
      } catch {
        /* best effort */
      }
    }
    process.exit(1);
  });
