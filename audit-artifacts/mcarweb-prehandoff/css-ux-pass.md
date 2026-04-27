# MCarWeb CSS / UX Pass

Date: 2026-04-27

## Scope Covered

- Browser engine: Chromium via Playwright.
- Local environments: Next dev server on port 3001 and production-mode `next start` on port 3002.
- Viewports checked: 320 x 740, 390 x 844, 768 x 1024, and 1366 x 900.
- Public pages checked: `/`, `/offer`, `/offer/details`, `/offer/contact`, `/offer/done`, `/login`, `/privacy`.
- Auth redirect checks: `/admin`, `/admin/leads`, `/admin/calendar`, `/inspector` redirect to `/login` and the login surface remains responsive.

## Results

- No horizontal overflow detected on checked pages and viewports.
- No clipped buttons, inputs, links, selects, textareas, or premium cards detected by the DOM bounding-box sweep.
- Details to contact funnel navigation was manually exercised with a signed local token.
- Production-mode screenshots were saved in `screenshots/`.
- Light/dark theme persistence was validated through the browser: theme choice is stored in `localStorage`, the root class changes between `light` and `dark`, and the toggle label changes between `Switch to dark mode` and `Switch to light mode`.
- Final production-mode checks on `/offer`, `/offer/contact`, `/privacy`, and `/login` passed in both light and dark mode with 0 horizontal overflow.

## Fixes Applied

- Changed offer funnel shell from vertical clipping to horizontal-only overflow protection.
- Reused one shared Turnstile widget and set it to flexible sizing so it fits narrow mobile cards.
- Added visible disabled styling to the final contact submit button.
- Hardened `/offer/details` rendering for partial MOT summaries.
- Changed vehicle and MOT summary grids to one column on mobile.
- Allowed Vercel Analytics domains in CSP.
- Added the Next scroll-behavior marker to the root html element.
- Added a global, accessible, persistent light/dark theme toggle.
- Improved dark-mode text contrast for subtle navigation, staff sidebar labels, privacy page content, contact form reassurance copy, inactive step labels, and disabled controls.
- Converted `/privacy` from hard-coded light-mode gray classes to theme tokens.
- Suppressed local-only Vercel Analytics script noise by rendering analytics only on Vercel deployments.

## Limits

- This was not a full real-device/browser-matrix QA pass.
- Safari, Firefox, Edge, iOS Safari, Android Chrome, authenticated admin/inspector pages, Lighthouse, and real provider-backed funnel testing still need a deployed staging/production URL and credentials.