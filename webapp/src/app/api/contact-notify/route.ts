import { NextResponse, type NextRequest } from "next/server";
import { sendContactEmail } from "@/lib/contactMail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort per-instance rate limit: 5 notifications per IP per 10 minutes.
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

// Called by the Contact Us form right after the message is saved. Only emails the support inbox.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!name || !message || !EMAIL_RE.test(email) || name.length > 100 || email.length > 200 || message.length > 5000) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const sent = await sendContactEmail({ name, email, message });
  return NextResponse.json({ ok: true, emailed: sent });
}
