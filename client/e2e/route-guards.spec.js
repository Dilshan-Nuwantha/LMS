// @ts-check
import { test, expect } from '@playwright/test';
import { mockApi, mockApiAsUser, users } from './helpers/api.js';

/** Routes wrapped in <ProtectedRoute> — any logged-out visit lands on /login. */
const protectedRoutes = [
  '/my-learning',
  '/my-courses',
  '/profile',
  '/my-activity',
  '/notifications',
  '/my-purchases',
  '/ai-chat',
  '/ai-settings',
  '/become-instructor',
];

test.describe('Route guards — logged out', () => {
  for (const route of protectedRoutes) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await mockApi(page);
      await page.goto(route);

      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    });
  }

  test('admin dashboard redirects to /login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/admin/dashboard');

    await expect(page).toHaveURL('/login');
  });

  test('public routes stay reachable', async ({ page }) => {
    await mockApi(page);

    await page.goto('/marketplace');
    await expect(page).toHaveURL('/marketplace');

    await page.goto('/login');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Route guards — role enforcement', () => {
  test('student is bounced off the admin-only dashboard', async ({ page }) => {
    await mockApiAsUser(page, users.student);
    await page.goto('/admin/dashboard');

    // ProtectedRoute adminOnly sends non-admins to "/".
    await expect(page).toHaveURL('/');
  });

  test('student hitting an instructor route is sent to /become-instructor', async ({ page }) => {
    await mockApiAsUser(page, users.student);
    await page.goto('/instructor/dashboard');

    await expect(page).toHaveURL('/become-instructor');
  });

  test('instructor reaches instructor routes', async ({ page }) => {
    await mockApiAsUser(page, users.instructor);
    await page.goto('/instructor/dashboard');

    await expect(page).toHaveURL('/instructor/dashboard');
  });

  test('admin reaches instructor routes too', async ({ page }) => {
    await mockApiAsUser(page, users.admin);
    await page.goto('/instructor/dashboard');

    await expect(page).toHaveURL('/instructor/dashboard');
  });

  test('an invalid token clears the session and forces re-login', async ({ page }) => {
    // Token present in localStorage, but the server rejects it.
    await mockApiAsUser(page, users.student, {
      'GET /auth/me': { status: 401, body: { message: 'Not authorized, token failed' } },
    });

    await page.goto('/profile');

    await expect(page).toHaveURL('/login');
    // AuthContext must scrub the dead credentials.
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });
});
