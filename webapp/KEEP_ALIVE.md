# PGPW Supabase keep-alive

PGPW already had a daily GitHub Actions database check. The app now also provides
`GET /api/health` and a daily Vercel Cron job. Each probe reads at most one ID from
`forum_categories`; it does not insert/update/delete records or return content.
No new table, schema migration or RLS relaxation is needed.

## What Supabase actually requires

Supabase's docs say a few user database requests each day over the previous week
are typically enough. They do not publish an exact guaranteed minimum, and low
activity can still cause pausing. Data changes, code commits and redeployments
are not required; database queries are the relevant activity. Only paid plans
are exempt from automatic inactivity pausing.

The Vercel job generates one request daily. The existing GitHub backup generates
another if enabled with valid secrets. This is a low-cost development measure,
not a guarantee of uninterrupted free-plan service. Do not add meaningless writes
or generate traffic every three minutes merely to assume pausing is impossible.
For production uptime requirements, use a paid Supabase plan.

## Deploy and configure

1. Publish the code through your normal Git/Vercel deployment workflow.
2. In Vercel, confirm the project Root Directory is `webapp`.
3. Under Settings > Environment Variables, confirm Production has
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for PGPW's Supabase
   project, not PetalBird's. The probe also supports optional server-only
   `SUPABASE_URL` / `SUPABASE_ANON_KEY` overrides; if present, these must point
   to the same PGPW project. Never use a service-role key for this probe.
4. Recommended: set `CRON_SECRET` to a random secret of at least 16 characters.
   Vercel sends `Authorization: Bearer <secret>` automatically. External/manual
   requests must supply that header when the secret is configured.
5. Wait for the new **Production** deployment to be Ready. Preview deployments
   do not execute automatic Vercel cron jobs. Redeploy after changing env vars.
6. In Settings > Cron Jobs, confirm `/api/health` and `0 9 * * *` are enabled.
   This is daily at 09:00 UTC / 14:00 Pakistan time. Hobby invocation can be
   anywhere from 14:00 to 14:59. No local computer needs to remain running.

## Immediate deployed verification

1. Use Run in Vercel > Settings > Cron Jobs.
2. In Runtime Logs, filter to `/api/health` and look for HTTP 200 and
   `[supabase-keep-alive]` with `ok: true`, a timestamp and duration.
3. If no `CRON_SECRET` is configured, opening
   `https://peacegangpeaceworld.com/api/health` should return
   `{"ok":true,"database":"reachable","ts":"...","durationMs":123}`.
   A normal browser request returns 401 when a secret is configured, as expected.
4. Open PGPW's Supabase > Logs > API Gateway and search for
   `/rest/v1/forum_categories?select=id&limit=1`. Match its HTTP 200 and timestamp
   to Vercel's log. Empty rows are acceptable: the query still succeeded under
   the existing RLS policies. Do not make private tables public for this test.
5. Check again after the next daily scheduled window. Manual requests prove
   connectivity, but only an automatically triggered run proves scheduling.

The provided git-main URL redirects to Vercel Authentication. For browser or
external-script checks, use the public Production domain in Settings > Domains.
If the production deployment is intentionally protected, use an authenticated
Vercel dashboard/CLI or the supported protection bypass for your scheduler;
do not mistake the authentication redirect for a successful health response.
Keep deployment-protection credentials separate from `CRON_SECRET`.

## Temporary three-minute test on Hobby

From `webapp`, use your actual PGPW production domain:

```powershell
node scripts/probe-deployment.mjs https://peacegangpeaceworld.com
```

The script checks immediately, after three minutes, then after six minutes and
stops. Expect three `passed: true` results with distinct timestamps. Keep the
terminal open during this test; it does not change the daily Vercel schedule.

If `CRON_SECRET` is configured, load it without entering it into command history:

```powershell
$enteredSecret = Read-Host 'CRON_SECRET' -AsSecureString
$env:CRON_SECRET = [System.Net.NetworkCredential]::new('', $enteredSecret).Password
node scripts/probe-deployment.mjs https://peacegangpeaceworld.com
Remove-Item Env:CRON_SECRET
```

Vercel Hobby cannot schedule every three minutes. For temporary external
scheduling, cron-job.org can GET the same endpoint with the same authorization
header. Stop the temporary job when finished.

## Existing GitHub backup

The root `.github/workflows/supabase-keep-alive.yml` reads the database directly
daily at 03:00 UTC / 08:00 Pakistan time, independently of the app's cron secret.
In repository Settings > Secrets and variables > Actions, configure
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for PGPW. In Actions
> Supabase Keep-Alive, run it manually and confirm HTTP 200. Scheduled workflows
must be on the default branch; public-repository schedules can be disabled after
60 days without repository activity. The Vercel schedule is independent of that.

## Troubleshooting

- 401: missing/wrong cron secret.
- 500: missing Supabase environment configuration.
- 503: query failed, timed out, or database is paused/unavailable. Inspect the
  `[supabase-keep-alive]` failure log and Supabase API logs.
- 404: wrong production domain, old deployment or wrong Root Directory.
- No scheduled logs: confirm Production deployment, cron enabled, time range,
  and daily schedule. A browser redirect/protection page does not count as a
  successful database check.

If the project is already paused, resume it in Supabase Dashboard first; a cron
request cannot automatically resume it. Monitor pause-warning emails and logs.

## Local verification

```powershell
node --test scripts/test-keep-alive.mjs
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit
```

References:
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
