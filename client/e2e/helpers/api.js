// @ts-check

/**
 * API stubbing + auth seeding helpers.
 *
 * Every spec answers requests under the `/api` prefix through `mockApi()`, so
 * tests never touch the real Express server or the Atlas database. Benefits:
 *   - deterministic (no shared/mutating remote state)
 *   - fast (no network, no DB round-trips)
 *   - safe in CI (no secrets needed)
 *   - lets us exercise error paths (401/403/500) that are hard to reproduce live
 *
 * Response bodies mirror the real handlers in server/controllers. Keep them in
 * sync when a contract changes, or the stubs will quietly drift from reality.
 */

/** A user shaped like the payload `authController` returns on login. */
export const users = {
  student: {
    _id: '65a000000000000000000001',
    name: 'Sara Student',
    email: 'student@example.com',
    role: 'student',
    token: 'test-token-student',
    warnings: [],
  },
  instructor: {
    _id: '65a000000000000000000002',
    name: 'Ivan Instructor',
    email: 'teacher@example.com',
    role: 'instructor',
    token: 'test-token-instructor',
    warnings: [],
  },
  admin: {
    _id: '65a000000000000000000003',
    name: 'Ada Admin',
    email: 'admin@example.com',
    role: 'admin',
    token: 'test-token-admin',
    warnings: [],
  },
};

/** A marketplace course shaped like what `CourseCard` destructures. */
export const makeCourse = (overrides = {}) => ({
  _id: '65c000000000000000000001',
  title: 'Mastering React Testing',
  description: 'Learn to test React apps end to end with Playwright.',
  thumbnail: '',
  price: 49.99,
  originalPrice: 99.99,
  currency: 'USD',
  category: 'Development',
  level: 'Intermediate',
  rating: { average: 4.5, count: 128 },
  enrollmentCount: 1200,
  user: { _id: users.instructor._id, name: users.instructor.name },
  totalDuration: 185,
  ...overrides,
});

/**
 * A single-course payload shaped like `GET /marketplace/:id`
 * (`marketplaceController.getMarketplaceCourse`).
 */
export const makeCourseDetail = (overrides = {}, { reviews = [] } = {}) => {
  const course = makeCourse({
    language: 'English',
    updatedAt: '2026-08-01T00:00:00.000Z',
    whatYouWillLearn: ['Write reliable end-to-end tests'],
    requirements: ['Basic JavaScript'],
    sections: [
      {
        _id: 's1',
        title: 'Getting Started',
        isPublic: true,
        lectures: [
          { _id: 'l1', title: 'Installing Playwright', number: 1, isPublic: true, isPreview: true },
          { _id: 'l2', title: 'Your First Test', number: 2, isPublic: true, isPreview: false },
        ],
      },
    ],
    ...overrides,
  });
  const totalLectures = course.sections.reduce((n, s) => n + s.lectures.length, 0);
  return { course, reviews, totalLectures, instructor: course.user };
};

/**
 * Default responses for everything the app shell requests on load.
 * Keys are `"<METHOD> <path>"`, where path excludes the `/api` prefix and any
 * query string.
 */
const defaultHandlers = () => ({
  'GET /auth/me': { status: 401, body: { message: 'Not authorized, no token' } },
  'GET /courses/my/enrolled': { status: 200, body: [] },
  'GET /courses/my/created': { status: 200, body: [] },
  'GET /courses/search': { status: 200, body: [] },
  'GET /notifications/unread-count': { status: 200, body: { count: 0 } },
  'GET /notifications': {
    status: 200,
    body: { notifications: [], pagination: { page: 1, pages: 1, total: 0 } },
  },
  'PUT /notifications/mark-all-read': { status: 200, body: {} },
  'GET /marketplace/categories': { status: 200, body: ['Development', 'Design', 'Business'] },
  'GET /marketplace': {
    status: 200,
    body: { courses: [], pagination: { page: 1, pages: 1, total: 0 } },
  },
  'GET /marketplace/search': {
    status: 200,
    body: { courses: [], pagination: { page: 1, pages: 1, total: 0 } },
  },
  'GET /instructor/dashboard': {
    status: 200,
    body: {
      courses: [],
      totalCourses: 0,
      totalRevenue: 0,
      totalSales: 0,
      totalStudents: 0,
      recentPurchases: [],
    },
  },
  'GET /instructor/earnings': {
    status: 200,
    body: {
      totalEarnings: 0,
      totalSales: 0,
      totalPaidOut: 0,
      pendingAmount: 0,
      payouts: [],
      monthlyEarnings: [],
    },
  },
});

/** Hosts the app under test is served from. Requests anywhere else are aborted. */
const appHosts = new Set(['localhost', '127.0.0.1']);
if (process.env.E2E_BASE_URL) appHosts.add(new URL(process.env.E2E_BASE_URL).hostname);

/**
 * Intercept every `/api/**` call and serve canned responses, and abort every
 * request to a host other than the app under test.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, {status?: number, body?: any} | ((route: any) => any)>} [overrides]
 *        Keyed by `"<METHOD> <path>"`. Values are a `{status, body}` pair or a
 *        function receiving the Playwright route for full control.
 * @returns {Promise<{calls: string[]}>} `calls` records every intercepted request,
 *        so a test can assert which endpoint the UI actually hit.
 */
export async function mockApi(page, overrides = {}) {
  const handlers = { ...defaultHandlers(), ...overrides };
  const calls = [];

  // Keep the suite hermetic. GoogleOAuthProvider injects
  // https://accounts.google.com/gsi/client, and Firefox's page.goto waits for
  // that script before resolving (measured 6–11s, vs ~150ms in Chromium). That
  // pushed short-lived UI such as 4s toasts out of the assertion window. A spec
  // can still stub one external host with its own page.route registered after
  // this one, since later routes take precedence.
  await page.route((url) => !appHosts.has(url.hostname), (route) => route.abort());

  // Match on pathname rather than a glob: a `**\/api\/**` glob also swallows
  // Vite's own dev-server module requests (e.g. GET /src/api/axios.js), which
  // stops the app from booting at all.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '') || '/';
    const key = `${request.method()} ${path}`;
    calls.push(key);

    const handler = handlers[key];

    if (typeof handler === 'function') {
      return handler(route);
    }

    if (handler) {
      return route.fulfill({
        status: handler.status ?? 200,
        contentType: 'application/json',
        // Not `?? {}`: that would turn a deliberate `null` body (getMyReview
        // with no review) into `{}`, which the UI reads as an existing review.
        body: JSON.stringify(handler.body === undefined ? {} : handler.body),
      });
    }

    // Unstubbed endpoint: serve an inert 200 so rendering isn't derailed, but
    // make it visible in the test output so gaps are easy to spot.
    console.warn(`[mockApi] unstubbed request: ${key} — returning {}`);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });

  return { calls };
}

/**
 * A route handler that records each request's JSON body into `bodies` and
 * replies with `reply(body)`. Use it to assert exactly what the UI sent.
 *
 * @param {any[]} bodies
 * @param {{ status?: number, reply?: (body: any) => any }} [options]
 */
export const captureJson = (bodies, { status = 200, reply = () => ({}) } = {}) =>
  async (route) => {
    const body = route.request().postDataJSON();
    bodies.push(body);
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(reply(body)),
    });
  };

/**
 * Seed localStorage so the app boots already authenticated.
 *
 * Mirrors exactly what `AuthContext` writes on login: a `token` plus a
 * `userCache` envelope of `{ user, timestamp }`. Runs before any page script,
 * so there is no logged-out flash.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} user one of `users.student` / `users.instructor` / `users.admin`
 */
export async function loginAs(page, user) {
  await page.addInitScript(
    ({ user }) => {
      localStorage.setItem('token', user.token);
      localStorage.setItem(
        'userCache',
        JSON.stringify({ user, timestamp: Date.now() })
      );
    },
    { user }
  );
}

/** Convenience: stub the API *and* sign a user in, wiring `GET /auth/me`. */
export async function mockApiAsUser(page, user, overrides = {}) {
  await loginAs(page, user);
  return mockApi(page, {
    'GET /auth/me': { status: 200, body: user },
    ...overrides,
  });
}
