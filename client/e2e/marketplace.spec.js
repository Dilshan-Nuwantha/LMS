// @ts-check
import { test, expect } from '@playwright/test';
import { mockApi, mockApiAsUser, makeCourse, makeCourseDetail, users } from './helpers/api.js';

const page1 = (courses, pages = 1) => ({
  status: 200,
  body: { courses, pagination: { page: 1, pages, total: courses.length } },
});

test.describe('Marketplace listing', () => {
  test('renders a course card per result', async ({ page }) => {
    const courses = [
      makeCourse({ _id: 'c1', title: 'Mastering React Testing' }),
      makeCourse({ _id: 'c2', title: 'Node.js From Scratch' }),
      makeCourse({ _id: 'c3', title: 'Design Systems 101' }),
    ];
    await mockApi(page, { 'GET /marketplace': page1(courses) });

    await page.goto('/marketplace');

    await expect(page.getByRole('heading', { name: 'Mastering React Testing' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Node.js From Scratch' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Design Systems 101' })).toBeVisible();
  });

  test('a course card links to its landing page', async ({ page }) => {
    await mockApi(page, {
      'GET /marketplace': page1([makeCourse({ _id: 'abc123', title: 'Mastering React Testing' })]),
      'GET /marketplace/abc123': { status: 200, body: makeCourseDetail({ _id: 'abc123' }) },
    });

    await page.goto('/marketplace');
    await page.getByRole('link', { name: /Mastering React Testing/ }).click();

    await expect(page).toHaveURL('/marketplace/course/abc123');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mastering React Testing' })
    ).toBeVisible();
  });

  test('shows the empty state when nothing matches', async ({ page }) => {
    await mockApi(page, { 'GET /marketplace': page1([]) });

    await page.goto('/marketplace');

    await expect(page.getByRole('heading', { name: 'No courses found' })).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
  });

  test('a failed fetch shows an error toast instead of crashing', async ({ page }) => {
    await mockApi(page, {
      'GET /marketplace': { status: 500, body: { message: 'db down' } },
    });

    await page.goto('/marketplace');

    // The axios interceptor handles 5xx globally with its own copy.
    await expect(
      page.getByText('Something went wrong on our end. Please try again.')
    ).toBeVisible();
    // Page shell survives the failure.
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
  });

  test('sorting updates the URL and refetches', async ({ page }) => {
    const { calls } = await mockApi(page, {
      'GET /marketplace': page1([makeCourse()]),
    });

    await page.goto('/marketplace');
    await expect(page.getByRole('heading', { name: 'Mastering React Testing' })).toBeVisible();

    const before = calls.filter((c) => c === 'GET /marketplace').length;
    await page.getByRole('combobox').selectOption('rating');

    await expect(page).toHaveURL(/sortBy=rating/);
    await expect
      .poll(() => calls.filter((c) => c === 'GET /marketplace').length)
      .toBeGreaterThan(before);
  });

  test('the filter panel toggles open', async ({ page }) => {
    await mockApi(page, { 'GET /marketplace': page1([makeCourse()]) });

    await page.goto('/marketplace');
    await expect(page.getByPlaceholder('Min')).toHaveCount(0);

    await page.getByRole('button', { name: 'Filters', exact: true }).click();

    await expect(page.getByPlaceholder('Min')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeVisible();
  });

  test('a ?q= query routes to the search endpoint', async ({ page }) => {
    const { calls } = await mockApi(page, {
      'GET /marketplace/search': page1([makeCourse({ title: 'Playwright Deep Dive' })]),
    });

    await page.goto('/marketplace?q=playwright');

    await expect(page.getByRole('heading', { name: 'Playwright Deep Dive' })).toBeVisible();
    expect(calls).toContain('GET /marketplace/search');
    expect(calls).not.toContain('GET /marketplace');
  });
});

test.describe('Home routing', () => {
  test('a logged-out visitor sees the marketplace at /', async ({ page }) => {
    await mockApi(page, { 'GET /marketplace': page1([makeCourse()]) });

    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Mastering React Testing' })).toBeVisible();
  });

  test('a user with no enrolments stays on the marketplace', async ({ page }) => {
    await mockApiAsUser(page, users.student, {
      'GET /courses/my/enrolled': { status: 200, body: [] },
      'GET /marketplace': page1([makeCourse()]),
    });

    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Mastering React Testing' })).toBeVisible();
  });

  test('an enrolled user is redirected to /my-learning', async ({ page }) => {
    await mockApiAsUser(page, users.student, {
      'GET /courses/my/enrolled': {
        status: 200,
        body: [{ _id: 'e1', title: 'Already Enrolled Course' }],
      },
    });

    await page.goto('/');

    await expect(page).toHaveURL('/my-learning');
  });
});
