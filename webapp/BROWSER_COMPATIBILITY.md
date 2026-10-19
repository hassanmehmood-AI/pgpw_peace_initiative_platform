# PGPW — Browser compatibility

## Supported browsers

| Browser | Minimum | Engine |
|---|---|---|
| Chrome / Edge | 111 | Blink |
| Firefox | 128 | Gecko |
| Safari (macOS) | 16.4 | WebKit |
| Safari (iOS / iPadOS) | 16.4 | WebKit |

The floor comes from Tailwind CSS v4 (it relies on `@property`, `color-mix()` and cascade layers).
The same list is declared as `browserslist` in `package.json`, so Next.js / Lightning CSS add
vendor prefixes (e.g. `-webkit-backdrop-filter`) and downlevel syntax for these targets automatically.

## Automated check

Playwright runs one smoke suite on Chrome, Firefox and Safari (WebKit), plus Pixel 7 and iPhone 14 viewports:

```bash
npm install
npm run test:browsers:install   # one-time: downloads Chromium, Firefox, WebKit
npm run test:browsers           # starts the dev server on :3100 and runs the suite
BASE_URL=https://your-deployment.vercel.app npm run test:browsers   # test a deployed site instead
npx playwright show-report      # open the HTML report
```

For each public page (`/`, `/about`, `/login`, `/register`, `/contact`, `/legal`) it checks: HTTP status < 400, no uncaught script
or console errors, and no horizontal overflow. It also verifies the CSS/JS features the design depends on.
Pages behind sign-in are not covered; add them with a stored auth state if needed.

## Manual checklist (things automation can't judge)

- iOS Safari: address-bar resize does not clip fixed bottom navigation; inputs don't zoom on focus (font-size >= 16px).
- Safari: frosted-glass (`backdrop-blur`) panels render; date/file inputs look usable.
- Firefox: custom scrollbars fall back gracefully (`::-webkit-scrollbar` rules are ignored there).
- Image/file uploads and realtime features work in all three engines.
