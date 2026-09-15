// @ts-check
import { test, expect } from '@playwright/test';
import { mockApi, mockApiAsUser, users } from './helpers/api.js';

test.describe('App shell', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('home page loads with the correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Skill Path');
  });

  test('navbar shows brand and logged-out actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Tenz Learn' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register', exact: true })).toBeVisible();
  });

  test('navbar hides auth links once signed in', async ({ page }) => {
    await mockApiAsUser(page, users.student);
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Login', exact: true })).toHaveCount(0);
  });

  test('auth pages render without the navbar or footer chrome', async ({ page }) => {
    await page.goto('/login');

    // AppShell suppresses Navbar/Footer on auth routes.
    await expect(page.getByRole('link', { name: 'Tenz Learn' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('unknown routes render the 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(
      page.getByRole('heading', { name: '404, Page Not Found.' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Please Take Me Home' })).toBeVisible();
  });

  test('404 page links back to home', async ({ page }) => {
    await page.goto('/nope');
    await page.getByRole('link', { name: 'Please Take Me Home' }).click();

    await expect(page).toHaveURL('/');
  });

  test('no uncaught page errors on first load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Tenz Learn' })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
