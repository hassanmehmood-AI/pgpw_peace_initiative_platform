import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const ts = new Date().toISOString();
  const headers = { "Cache-Control": "no-store" };
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables" },
      { status: 500, headers }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const { error } = await supabase
      .from("forum_categories")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(10_000));

    const durationMs = Date.now() - startedAt;
    if (error) {
      console.error("[supabase-keep-alive]", { ok: false, ts, durationMs, code: error.code });
      return NextResponse.json(
        { ok: false, database: "unreachable", ts, durationMs },
        { status: 503, headers }
      );
    }

    console.info("[supabase-keep-alive]", { ok: true, ts, durationMs });
    return NextResponse.json({ ok: true, database: "reachable", ts, durationMs }, { headers });
  } catch {
    const durationMs = Date.now() - startedAt;
    console.error("[supabase-keep-alive]", { ok: false, ts, durationMs, reason: "request_failed" });
    return NextResponse.json(
      { ok: false, database: "unreachable", ts, durationMs },
      { status: 503, headers }
    );
  }
}
