# E2E tests (Playwright)

End-to-end tests for the LMS client.

## Running them

From `client/`:

```bash
npm run test:e2e            # all 4 browser projects, headless
npm run test:e2e:chromium   # chromium only — fastest feedback loop
npm run test:e2e:ui         # interactive UI mode (time-travel debugging)
npm run test:e2e:headed     # watch a real browser drive the app
npm run test:e2e:debug      # step through with the Playwright inspector
npm run test:report         # open the HTML report from the last run
```

Vite starts automatically (`webServer` in `playwright.config.js`) and an already
running dev server is reused, so there is nothing to launch by hand.

To run against a deployed environment instead, set `E2E_BASE_URL` — that also
disables the auto-started dev server:

```bash
E2E_BASE_URL=https://staging.example.com npm run test:e2e
```

## What's covered

| Spec | Covers |
| --- | --- |
| `smoke.spec.js` | Title, navbar states, auth-page chrome, 404, no uncaught page errors |
| `route-guards.spec.js` | Protected routes, role-based redirects, invalid token clean-up |
| `auth.spec.js` | Login through each portal, failure paths, registration |
| `marketplace.spec.js` | Listing, empty and error states, sort, filters, search, home redirect |
| `purchase.spec.js` | Course landing, Stripe checkout redirect, coupons, owned courses, checkout-success polling |
| `quiz.spec.js` | Every question type, submitted payload, pass/fail results, unanswered confirm, review and retake, time limit |
| `profile.spec.js` | Display-name edit, password change validation and errors |
| `notifications.spec.js` | List, unread filter, mark one / all read, delete, click-through |
| `instructor.spec.js` | Becoming an instructor, dashboard stats, course-creation wizard |

## Known bugs pinned with `test.fail`

These tests describe the **correct** behaviour and currently fail because the
app is wrong. `test.fail()` keeps the suite green while the bug exists. When
someone fixes it, Playwright reports *"expected to fail, but passed"*: delete
the `test.fail(...)` call and the test becomes a normal regression guard.

| Test | Bug |
| --- | --- |
| `instructor.spec.js` › a student can upgrade… | `BecomeInstructor.jsx:10` destructures `setUser` from `AuthContext`, which does not provide it. The server upgrades the account, then the page shows "setUser is not a function". |
| `instructor.spec.js` › an existing instructor… | `BecomeInstructor.jsx:27-29` calls `navigate()` during render. React Router ignores that before mount, so an instructor visiting `/become-instructor` gets a blank page. |
| `quiz.spec.js` › auto-submit keeps the answers… | The timer effect in `QuizTake.jsx` omits `answers` from its dependencies, so a timed-out attempt submits `answers: []` and is graded as blank. |

## How these tests are isolated

Every `/api/**` request is intercepted by `helpers/api.js` and answered with
canned JSON, and every request to any other host is aborted. **The suite never
touches the Express server, the Atlas database, or the internet.** That buys us:

- **Determinism** — no shared, mutating remote state between runs
- **Speed** — no network or database round-trips
- **CI safety** — no secrets, no database, no seeded fixtures to maintain
- **Error-path coverage** — 401 / 403 / 404 / 500 and in-flight latency are
  trivial to simulate, and painful to reproduce against a live backend

The trade-off is that a stub can drift from the real API. Stub bodies are
copied from the handlers in `server/controllers` — when you change a response
shape there, update the matching stub here.

Aborting external requests fixes a measured problem. `GoogleOAuthProvider`
injects `https://accounts.google.com/gsi/client`, and Firefox's `page.goto`
waits for that script before resolving: 6–11 s, against ~150 ms in Chromium. By
the time a Firefox assertion started, short-lived UI (a 4 s toast, a 2 s loading
state) was already gone, so those tests were slow and flaky. If a spec needs an
external page, stub that host with its own `page.route` registered after
`mockApi`; see `fakeStripe` in `purchase.spec.js`.

## Writing a new test

```js
import { test, expect } from '@playwright/test';
import { mockApiAsUser, captureJson, users } from './helpers/api.js';

test('saves a profile name', async ({ page }) => {
  const bodies = [];
  await mockApiAsUser(page, users.student, {
    'PUT /auth/profile': captureJson(bodies, { reply: (body) => ({ ...users.student, ...body }) }),
  });

  await page.goto('/profile');
  // ...drive the UI...
  expect(bodies[0].name).toBe('New Name');
});
```

Helpers:

| Helper | Purpose |
| --- | --- |
| `mockApi(page, overrides)` | Stub the API. Keys are `"METHOD /path"` without `/api` or the query string. Returns `{ calls }`, a live log of every intercepted request. |
| `mockApiAsUser(page, user, overrides)` | Same, but boots the app already signed in as `user`. |
| `captureJson(bodies, { status, reply })` | A handler that records each request's JSON body, so you can assert exactly what the UI sent. |
| `loginAs(page, user)` | Seed `token` + `userCache` in localStorage, matching what `AuthContext` writes. |
| `users.student` / `.instructor` / `.admin` | Login payloads shaped like `authController`'s response. |
| `makeCourse(overrides)` | A marketplace list item, shaped for `CourseCard`. |
| `makeCourseDetail(overrides)` | A `GET /marketplace/:id` payload: `{ course, reviews, totalLectures, instructor }`. |

An unstubbed endpoint returns an inert `200 {}` and prints a
`[mockApi] unstubbed request: …` warning. Watch for those when adding tests
against new pages.

## Gotchas this codebase will hand you

1. **Responsive duplicate headings.** `Login.jsx` renders two heading blocks
   with *different* wording (`Teacher login` on desktop, `Teacher portal` on
   mobile). `display: none` removes an element from the accessibility tree, so
   `getByRole` sees only the one for the current viewport. Match both with a
   regex when a test also runs on `mobile-chrome`.
2. **Substring matching is the default** for `getByRole` names, `getByText`
   and `getByPlaceholder`. `name: 'Filters'` also matches "Clear all filters";
   placeholder `'New password'` also matches "Repeat new password". Pass
   `exact: true`.
3. **Quiz options are `sr-only` radios inside labels.** Click the visible
   option text, then assert on `getByRole('radio', …)`.
4. **Parking the page you land on.** When a test ends by navigating somewhere
   it doesn't care about (e.g. the course player after "Go to Course"), that
   page's unstubbed calls return `{}` and can crash it mid-assertion. Register
   a `page.route` that never responds for its endpoints *after* `mockApi` —
   later routes take precedence — so it stays on its loading state.
5. **`null` is a real response.** `getMyReview` returns `null` when there is no
   review. `mockApi` sends `body: null` as-is; don't "helpfully" default it to `{}`.
6. **Timers: use `page.clock`,** never real waits. See the quiz time-limit tests:
   install the clock before `goto`, then `fastForward`.
7. **Effects may fire twice** under React StrictMode in dev. Don't assert an
   exact request count for calls made on mount.

## A note on `server/scripts/resetTestDb.js`

That script drops a test database and refuses to run unless the resolved name
contains `test`. It is **not** used by this suite, which is fully stubbed.

It only becomes relevant if you later add tests that hit the real backend. If
you do, set `MONGO_DB_NAME=lms_test` in `server/.env` first — it is currently
unset, which means `server/config/db.js` falls back to the database in
`MONGO_URI`, i.e. your real one.
