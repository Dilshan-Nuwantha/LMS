// @ts-check
import { test, expect } from '@playwright/test';
import { mockApiAsUser, captureJson, users } from './helpers/api.js';

const openSecurityTab = async (page) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Security', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
};

const submitPasswords = async (page, { current, next, confirm }) => {
  // Placeholder matching is a case-insensitive substring by default, and
  // "New password" is inside "Repeat new password" — hence exact.
  await page.getByPlaceholder('Enter current password', { exact: true }).fill(current);
  await page.getByPlaceholder('New password', { exact: true }).fill(next);
  await page.getByPlaceholder('Repeat new password', { exact: true }).fill(confirm);
  await page.getByRole('button', { name: 'Update Password' }).click();
};

test.describe('Profile', () => {
  test('shows the signed-in user', async ({ page }) => {
    await mockApiAsUser(page, users.student);
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: users.student.name, exact: true })).toBeVisible();
    await expect(page.getByText(users.student.email, { exact: true })).toBeVisible();
  });

  test('edits and saves the display name', async ({ page }) => {
    const bodies = [];
    await mockApiAsUser(page, users.student, {
      'PUT /auth/profile': captureJson(bodies, { reply: (body) => ({ ...users.student, ...body }) }),
    });
    await page.goto('/profile');

    await page.getByRole('button', { name: 'Edit Profile' }).click();
    // The name field has no label; it is the only input capped at 50 characters.
    await page.locator('input[maxlength="50"]').fill('  Sara Renamed  ');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText('Profile updated', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sara Renamed', exact: true })).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0].name).toBe('Sara Renamed');
  });

  test('cannot save a blank name', async ({ page }) => {
    const { calls } = await mockApiAsUser(page, users.student);
    await page.goto('/profile');

    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.locator('input[maxlength="50"]').fill('   ');

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    expect(calls).not.toContain('PUT /auth/profile');
  });
});

test.describe('Profile — change password', () => {
  test('rejects mismatched passwords without calling the API', async ({ page }) => {
    const { calls } = await mockApiAsUser(page, users.student);
    await openSecurityTab(page);

    await submitPasswords(page, { current: 'OldPass1!', next: 'NewPass1!', confirm: 'NewPass2!' });

    await expect(page.getByText('Passwords do not match')).toBeVisible();
    expect(calls).not.toContain('PUT /auth/updatepassword');
  });

  test('rejects a new password under 6 characters', async ({ page }) => {
    const { calls } = await mockApiAsUser(page, users.student);
    await openSecurityTab(page);

    await submitPasswords(page, { current: 'OldPass1!', next: 'abc12', confirm: 'abc12' });

    await expect(page.getByText('Must be at least 6 characters')).toBeVisible();
    expect(calls).not.toContain('PUT /auth/updatepassword');
  });

  test('sends the current and new password, then clears the form', async ({ page }) => {
    const bodies = [];
    await mockApiAsUser(page, users.student, {
      'PUT /auth/updatepassword': captureJson(bodies),
    });
    await openSecurityTab(page);

    await submitPasswords(page, { current: 'OldPass1!', next: 'NewPass1!', confirm: 'NewPass1!' });

    await expect(page.getByText('Password updated', { exact: true })).toBeVisible();
    // The confirmation field is client-side only; it must not be sent.
    expect(bodies).toEqual([{ currentPassword: 'OldPass1!', newPassword: 'NewPass1!' }]);
    await expect(page.getByPlaceholder('Enter current password', { exact: true })).toHaveValue('');
    await expect(page.getByPlaceholder('Repeat new password', { exact: true })).toHaveValue('');
  });

  test('shows the server message when the current password is wrong', async ({ page }) => {
    await mockApiAsUser(page, users.student, {
      'PUT /auth/updatepassword': { status: 400, body: { message: 'Invalid current password' } },
    });
    await openSecurityTab(page);

    await submitPasswords(page, { current: 'WrongPass1!', next: 'NewPass1!', confirm: 'NewPass1!' });

    await expect(page.getByText('Invalid current password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update Password' })).toBeEnabled();
  });
});
