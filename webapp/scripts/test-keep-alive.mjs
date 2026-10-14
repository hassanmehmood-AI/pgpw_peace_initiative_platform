import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

// Exercise the actual route logic offline, replacing only framework/DB adapters.
const source = readFileSync(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "")
  .replace('export const dynamic = "force-dynamic";', "")
  .replace("export async function GET(request: Request)", "async function GET(request)");

function loadRoute(env, result = { error: null }, shouldThrow = false) {
  let queries = 0;
  const route = runInNewContext(source + "\nGET;", {
    process: { env }, Date, AbortSignal,
    console: { info() {}, error() {} },
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers }) },
    createClient: () => ({
      from: (table) => {
        assert.equal(table, "forum_categories");
        queries++;
        return { select: () => ({ limit: () => ({ abortSignal: async () => {
          if (shouldThrow) throw new Error("Network failed");
          return result;
        } }) }) };
      },
    }),
  });
  return { route, queryCount: () => queries };
}
const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "test-key" };
const request = (authorization) => ({ headers: { get: () => authorization ?? null } });

test("configured cron secret rejects an unauthenticated request before querying", async () => {
  const { route, queryCount } = loadRoute({ ...env, CRON_SECRET: "secret" });
  assert.equal((await route(request())).status, 401);
  assert.equal(queryCount(), 0);
});
test("authenticated probe executes a database read and cannot be cached", async () => {
  const { route, queryCount } = loadRoute({ ...env, CRON_SECRET: "secret" });
  const response = await route(request("Bearer secret"));
  assert.equal(response.status, 200);
  assert.equal(response.body.database, "reachable");
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.equal(queryCount(), 1);
});
test("legacy public environment variables remain supported", async () => {
  const { route } = loadRoute({ NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY });
  assert.equal((await route(request())).status, 200);
});
test("missing configuration fails without querying", async () => {
  const { route, queryCount } = loadRoute({});
  assert.equal((await route(request())).status, 500);
  assert.equal(queryCount(), 0);
});
test("database errors return 503 without exposing raw database details", async () => {
  const { route } = loadRoute(env, { error: { code: "42501", message: "private detail" } });
  const response = await route(request());
  assert.equal(response.status, 503);
  assert.equal(response.body.ok, false);
  assert.equal(JSON.stringify(response).includes("private detail"), false);
});
test("network exceptions return a failed health response", async () => {
  const { route } = loadRoute(env, undefined, true);
  assert.equal((await route(request())).status, 503);
});
