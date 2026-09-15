// @ts-check
import { test, expect } from '@playwright/test';
import { mockApiAsUser, users } from './helpers/api.js';

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

/** A notification shaped like the Notification model the API returns. */
const makeNotification = (overrides = {}) => ({
  _id: 'n1',
  title: 'New lecture published',
  message: 'A new lecture was added to your course',
  type: 'new_content',
  priority: 'normal',
  read: false,
  link: null,
  createdAt: minutesAgo(5),
  ...overrides,
});

const page1 = (notifications) => ({
  status: 200,
  body: { notifications, pagination: { page: 1, pages: 1, total: notifications.length } },
});

/** Two unread (one linked, one important) and one already read. */
const inbox = () => [
  makeNotification({ _id: 'n1', title: 'New lecture published', link: '/marketplace' }),
  makeNotification({ _id: 'n2', title: 'Quiz due tomorrow', type: 'due_date', priority: 'important' }),
  makeNotification({ _id: 'n3', title: 'Welcome to the course', type: 'broadcast', read: true }),
];

/**
 * The card for one notification. Cards carry no role, so scope by the
 * Tailwind `group` class they use for hover-revealed actions.
 */
const card = (page, title) => page.locator('.group').filter({ hasText: title });

test.describe('Notifications page', () => {
  test('lists notifications with type, priority and relative time', async ({ page }) => {
    await mockApiAsUser(page, users.student, { 'GET /notifications': page1(inbox()) });
    await page.goto('/notifications');

    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
    await expect(page.getByText('New lecture published')).toBeVisible();
    await expect(card(page, 'Quiz due tomorrow').getByText('Due Date', { exact: true })).toBeVisible();
    await expect(card(page, 'Quiz due tomorrow').getByText('important', { exact: true })).toBeVisible();
    await expect(card(page, 'New lecture published').getByText('5m ago')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unread (2)' })).toBeVisible();
  });

  test('marks everything read on open', async ({ page }) => {
    const { calls } = await mockApiAsUser(page, users.student, { 'GET /notifications': page1(inbox()) });
    await page.goto('/notifications');

    await expect(page.getByText('New lecture published')).toBeVisible();
    await expect.poll(() => calls).toContain('PUT /notifications/mark-all-read');
  });

  test('the Unread tab hides notifications that were already read', async ({ page }) => {
    await mockApiAsUser(page, users.student, { 'GET /notifications': page1(inbox()) });
    await page.goto('/notifications');

    await page.getByRole('button', { name: 'Unread (2)' }).click();

    await expect(page.getByText('New lecture published')).toBeVisible();
    await expect(page.getByText('Quiz due tomorrow')).toBeVisible();
    await expect(page.getByText('Welcome to the course')).toHaveCount(0);
  });

  test('shows an empty state when there are no notifications', async ({ page }) => {
    await mockApiAsUser(page, users.student, { 'GET /notifications': page1([]) });
    await page.goto('/notifications');

    await expect(page.getByRole('heading', { name: 'No notifications yet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark all read' })).toHaveCount(0);
  });

  test('the Unread tab says you are caught up when everything is read', async ({ page }) => {
    await mockApiAsUser(page, users.student, {
      'GET /notifications': page1([makeNotification({ read: true })]),
    });
    await page.goto('/notifications');

    await page.getByRole('button', { name: 'Unread', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'No unread notifications' })).toBeVisible();
    await expect(page.getByText("You're all caught up!")).toBeVisible();
  });

  test('"Mark all read" clears the unread state', async ({ page }) => {
    await mockApiAsUser(page, users.student, { 'GET /notifications': page1(inbox()) });
    await page.goto('/notifications');

    await page.getByRole('button', { name: 'Mark all read' }).click();

    await expect(page.getByRole('button', { name: 'Mark all read' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Unread', exact: true })).toBeVisible();
  });

  test('marking one notification read updates the unread count', async ({ page }) => {
    const { calls } = await mockApiAsUser(page, users.student, {
      'GET /notifications': page1(inbox()),
      'PUT /notifications/n2/read': { status: 200, body: {} },
    });
    await page.goto('/notifications');

    const quizCard = card(page, 'Quiz due tomorrow');
    await quizCard.hover();
    await quizCard.getByTitle('Mark as read').click();

    await expect(page.getByRole('button', { name: 'Unread (1)' })).toBeVisible();
    expect(calls).toContain('PUT /notifications/n2/read');
  });

  test('deleting a notification removes it', async ({ page }) => {
    const { calls } = await mockApiAsUser(page, users.student, {
      'GET /notifications': page1(inbox()),
      'DELETE /notifications/n3': { status: 200, body: {} },
    });
    await page.goto('/notifications');

    const welcome = card(page, 'Welcome to the course');
    await welcome.hover();
    await welcome.getByTitle('Delete').click();

    await expect(page.getByText('Welcome to the course')).toHaveCount(0);
    expect(calls).toContain('DELETE /notifications/n3');
  });

  test('clicking a notification marks it read and follows its link', async ({ page }) => {
    const { calls } = await mockApiAsUser(page, users.student, {
      'GET /notifications': page1(inbox()),
      'PUT /notifications/n1/read': { status: 200, body: {} },
    });
    await page.goto('/notifications');

    await page.getByText('New lecture published').click();

    await expect(page).toHaveURL('/marketplace');
    await expect.poll(() => calls).toContain('PUT /notifications/n1/read');
  });
});
