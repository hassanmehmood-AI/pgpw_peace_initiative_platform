const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error("Usage: node scripts/probe-deployment.mjs https://your-production-domain");
  process.exit(1);
}
const url = new URL("/api/health", baseUrl);
if (url.protocol !== "https:") throw new Error("Use your HTTPS production URL");
const headers = process.env.CRON_SECRET
  ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  : {};
let failed = false;
// Three requests total: now, +3 minutes, +6 minutes. This is a temporary test,
// not a persistent scheduler. Keep the terminal open until it completes.
for (let attempt = 1; attempt <= 3; attempt++) {
  if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 180_000));
  try {
    const response = await fetch(url, {
      headers, redirect: "manual", signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => null);
    const passed = response.status === 200 && body?.ok === true && body?.database === "reachable";
    console.log(JSON.stringify({ attempt, observedAt: new Date().toISOString(), status: response.status, passed, body }));
    if (!passed) failed = true;
  } catch (error) {
    failed = true;
    console.error(JSON.stringify({ attempt, observedAt: new Date().toISOString(), passed: false, error: error.message }));
  }
}
process.exitCode = failed ? 1 : 0;
