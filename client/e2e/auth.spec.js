// @ts-check
import { test, expect } from '@playwright/test';
import { mockApi, users } from './helpers/api.js';

const fillLogin = async (page, email, password) => {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

test.describe('Login page rendering', () => {
  test('student portal shows the student copy', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up as a student' })).toBeVisible();
  });

  // Login renders two heading blocks — one `lg:hidden` (mobile), one
  // `hidden lg:block` (desktop) — with different wording. Only the one for the
  // current viewport is in the accessibility tree, so accept either.
  test('teacher portal shows the teacher copy', async ({ page }) => {
    await mockApi(page);
    await page.goto('/teacher/login');

    await expect(
      page.getByRole('heading', { name: /^Teacher (login|portal)$/ })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up as a teacher' })).toBeVisible();
  });

  test('admin portal shows the admin copy', async ({ page }) => {
    await mockApi(page);
    await page.goto('/admin/login');

    await expect(
      page.getByRole('heading', { name: /^(Administrator login|Welcome, administrator)$/ })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register as admin' })).toBeVisible();
  });

  test('email and password are required by the browser', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');

    await page.getByRole('button', { name: 'Sign in' }).click();

    // Native constraint validation blocks submit; we never leave /login.
    await expect(page).toHaveURL('/login');
    const emailInvalid = await page
      .getByLabel('Email address')
      .evaluate((el) => !(/** @type {HTMLInputElement} */ (el).validity.valid));
    expect(emailInvalid).toBe(true);
  });
});

test.describe('Login — each portal calls its own endpoint', () => {
  const cases = [
    { path: '/login', endpoint: 'POST /auth/student/login', user: users.student, lands: '/' },
    { path: '/teacher/login', endpoint: 'POST /auth/teacher/login', user: users.instructor, lands: '/instructor/dashboard' },
    { path: '/admin/login', endpoint: 'POST /auth/admin/login', user: users.admin, lands: '/admin/dashboard' },
  ];

  for (const { path, endpoint, user, lands } of cases) {
    test(`${path} posts to ${endpoint} and redirects to ${lands}`, async ({ page }) => {
      const { calls } = await mockApi(page, {
        [endpoint]: { status: 200, body: user },
        'GET /auth/me': { status: 200, body: user },
      });

      await page.goto(path);
      await fillLogin(page, user.email, 'Passw0rd!');

      await expect(page).toHaveURL(lands);
      expect(calls).toContain(endpoint);

      // The token must be persisted for the axios interceptor to pick up.
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBe(user.token);
    });
  }
});

test.describe('Login — failure paths', () => {
  test('invalid credentials surface an error and keep you on /login', async ({ page }) => {
    await mockApi(page, {
      'POST /auth/student/login': {
        status: 400,
        body: { message: 'Invalid credentials' },
      },
    });

    await page.goto('/login');
    await fillLogin(page, 'wrong@example.com', 'badpassword');

    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL('/login');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('a blocked account shows the blocked message', async ({ page }) => {
    await mockApi(page, {
      'POST /auth/student/login': {
        status: 403,
        body: { message: 'Your account has been blocked. Please contact support.' },
      },
    });

    await page.goto('/login');
    await fillLogin(page, users.student.email, 'Passw0rd!');

    await expect(
      page.getByText('Your account has been blocked. Contact admin for help.')
    ).toBeVisible();
  });

  test('a server error shows the generic 500 message', async ({ page }) => {
    await mockApi(page, {
      'POST /auth/student/login': { status: 500, body: { message: 'boom' } },
    });

    await page.goto('/login');
    await fillLogin(page, users.student.email, 'Passw0rd!');

    await expect(
      page.getByText('Something went wrong on our end. Please try again.')
    ).toBeVisible();
  });

  test('logging in through the wrong portal is rejected client-side', async ({ page }) => {
    // Server returns a student, but we are on the teacher portal.
    await mockApi(page, {
      'POST /auth/teacher/login': { status: 200, body: users.student },
      'GET /auth/me': { status: 200, body: users.student },
    });

    await page.goto('/teacher/login');
    await fillLogin(page, users.student.email, 'Passw0rd!');

    await expect(page.getByText('Account role is not teacher.')).toBeVisible();
    await expect(page).toHaveURL('/teacher/login');
  });

  test('the sign-in button is disabled while the request is in flight', async ({ page }) => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });

    await mockApi(page, {
      'POST /auth/student/login': async (route) => {
        await gate;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(users.student),
        });
      },
      'GET /auth/me': { status: 200, body: users.student },
    });

    await page.goto('/login');
    await fillLogin(page, users.student.email, 'Passw0rd!');

    const button = page.getByRole('button', { name: 'Signing in...' });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();

    release();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Registration', () => {
  test('student registration posts to the student endpoint', async ({ page }) => {
    const { calls } = await mockApi(page, {
      'POST /auth/student/register': { status: 201, body: users.student },
      'GET /auth/me': { status: 200, body: users.student },
    });

    await page.goto('/register');
    await page.getByLabel('Full name').fill('Sara Student');
    await page.getByLabel('Email address').fill(users.student.email);
    await page.getByLabel('Password').fill('Passw0rd!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/');
    expect(calls).toContain('POST /auth/student/register');
  });

  test('duplicate email is reported back to the user', async ({ page }) => {
    await mockApi(page, {
      'POST /auth/student/register': {
        status: 400,
        body: { message: 'User already exists' },
      },
    });

    await page.goto('/register');
    await page.getByLabel('Full name').fill('Sara Student');
    await page.getByLabel('Email address').fill(users.student.email);
    await page.getByLabel('Password').fill('Passw0rd!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('User already exists')).toBeVisible();
    await expect(page).toHaveURL('/register');
  });

  test('teacher registration uses the teacher endpoint', async ({ page }) => {
    const { calls } = await mockApi(page, {
      'POST /auth/teacher/register': { status: 201, body: users.instructor },
      'GET /auth/me': { status: 200, body: users.instructor },
    });

    await page.goto('/teacher/register');
    await page.getByLabel('Full name').fill('Ivan Instructor');
    await page.getByLabel('Email address').fill(users.instructor.email);
    await page.getByLabel('Password').fill('Passw0rd!');
    await page.getByRole('button', { name: 'Create teacher account' }).click();

    await expect(page).toHaveURL('/instructor/dashboard');
    expect(calls).toContain('POST /auth/teacher/register');
  });
});
