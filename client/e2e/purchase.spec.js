// @ts-check
import { test, expect } from '@playwright/test';
import { mockApi, mockApiAsUser, captureJson, makeCourseDetail, users } from './helpers/api.js';

const COURSE_ID = 'course42';
const LANDING_URL = `/marketplace/course/${COURSE_ID}`;
const SESSION_ID = 'cs_test_123';
const STRIPE_URL = `https://checkout.stripe.com/c/pay/${SESSION_ID}`;

const courseDetail = () => ({
  status: 200,
  body: makeCourseDetail({ _id: COURSE_ID, price: 499, originalPrice: 999, currency: 'INR' }),
});

/** `createCheckoutSession` responds with the Stripe session id and hosted URL. */
const checkoutReply = () => ({ sessionId: SESSION_ID, url: STRIPE_URL });

/** Stub the landing page for a signed-in student. */
const stubLanding = (page, { hasPurchased = false, extra = {} } = {}) =>
  mockApiAsUser(page, users.student, {
    [`GET /marketplace/${COURSE_ID}`]: courseDetail(),
    [`GET /purchase/verify/${COURSE_ID}`]: { status: 200, body: { hasPurchased } },
    // getMyReview responds with the review document, or null when there is none.
    [`GET /reviews/my/${COURSE_ID}`]: { status: 200, body: null },
    ...extra,
  });

/** Stand in for Stripe's hosted checkout; we only care that the browser got there. */
const fakeStripe = (page) =>
  page.route('https://checkout.stripe.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Stripe Checkout</h1>' })
  );

test.describe('Course landing page', () => {
  test('renders the course and its curriculum', async ({ page }) => {
    await mockApi(page, { [`GET /marketplace/${COURSE_ID}`]: courseDetail() });
    await page.goto(LANDING_URL);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Mastering React Testing' })
    ).toBeVisible();

    // Sections start collapsed.
    await expect(page.getByText('Installing Playwright')).toHaveCount(0);
    await page.getByRole('button', { name: /Getting Started/ }).click();
    await expect(page.getByText('Installing Playwright')).toBeVisible();
    await expect(page.getByText('Free Preview')).toBeVisible();
  });

  test('an unknown course sends you back to the marketplace', async ({ page }) => {
    await mockApi(page, {
      [`GET /marketplace/${COURSE_ID}`]: { status: 404, body: { message: 'Course not found' } },
    });
    await page.goto(LANDING_URL);

    await expect(page).toHaveURL('/marketplace');
    await expect(page.getByText('Course not found', { exact: true })).toBeVisible();
  });
});

test.describe('Buying a course', () => {
  test('a logged-out visitor is asked to sign in before buying', async ({ page }) => {
    const { calls } = await mockApi(page, { [`GET /marketplace/${COURSE_ID}`]: courseDetail() });
    await page.goto(LANDING_URL);

    await page.getByRole('button', { name: 'Buy Now' }).click();

    await expect(page).toHaveURL('/login');
    expect(calls).not.toContain('POST /purchase/checkout');
  });

  test('Buy Now starts a Stripe checkout and redirects to it', async ({ page }) => {
    const bodies = [];
    await stubLanding(page, {
      extra: { 'POST /purchase/checkout': captureJson(bodies, { reply: checkoutReply }) },
    });
    await fakeStripe(page);
    await page.goto(LANDING_URL);

    await page.getByRole('button', { name: 'Buy Now' }).click();

    await expect(page).toHaveURL(STRIPE_URL);
    expect(bodies).toEqual([{ courseId: COURSE_ID, couponCode: null }]);
  });

  test('a valid coupon shows the saving and is sent with the checkout', async ({ page }) => {
    const couponBodies = [];
    const checkoutBodies = [];
    await stubLanding(page, {
      extra: {
        'POST /coupons/validate': captureJson(couponBodies, {
          reply: () => ({
            valid: true,
            discountType: 'fixed',
            discountValue: 100,
            discountAmount: 100,
            originalPrice: 499,
            finalPrice: 399,
          }),
        }),
        'POST /purchase/checkout': captureJson(checkoutBodies, { reply: checkoutReply }),
      },
    });
    await fakeStripe(page);
    await page.goto(LANDING_URL);

    const couponInput = page.getByPlaceholder('Enter coupon code');
    await couponInput.fill('save100');
    // The field upper-cases as you type.
    await expect(couponInput).toHaveValue('SAVE100');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    await expect(page.getByText('Coupon applied!', { exact: true })).toBeVisible();
    await expect(page.getByText('You save ₹100')).toBeVisible();
    await expect(couponInput).toHaveCount(0);
    expect(couponBodies).toEqual([{ code: 'SAVE100', courseId: COURSE_ID }]);

    await page.getByRole('button', { name: 'Buy Now' }).click();

    await expect(page).toHaveURL(STRIPE_URL);
    expect(checkoutBodies).toEqual([{ courseId: COURSE_ID, couponCode: 'SAVE100' }]);
  });

  test('an invalid coupon is rejected and can be retried', async ({ page }) => {
    await stubLanding(page, {
      extra: {
        'POST /coupons/validate': { status: 404, body: { message: 'Invalid coupon code' } },
      },
    });
    await page.goto(LANDING_URL);

    await page.getByPlaceholder('Enter coupon code').fill('BOGUS');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    await expect(page.getByText('Invalid coupon code', { exact: true })).toBeVisible();
    await expect(page.getByText('Coupon applied!', { exact: true })).toHaveCount(0);
    await expect(page.getByPlaceholder('Enter coupon code')).toBeVisible();
  });

  test('a checkout failure is reported and Buy Now comes back', async ({ page }) => {
    await stubLanding(page, {
      extra: {
        'POST /purchase/checkout': {
          status: 400,
          body: { message: 'Payments are temporarily unavailable' },
        },
      },
    });
    await page.goto(LANDING_URL);

    await page.getByRole('button', { name: 'Buy Now' }).click();

    await expect(
      page.getByText('Payments are temporarily unavailable', { exact: true })
    ).toBeVisible();
    await expect(page).toHaveURL(LANDING_URL);
    await expect(page.getByRole('button', { name: 'Buy Now' })).toBeEnabled();
  });

  test('someone who already bought it gets "Go to Course" instead', async ({ page }) => {
    await stubLanding(page, { hasPurchased: true });
    // Park the course player's own API calls: this test only checks we get there.
    await page.route(
      (url) => /^\/api\/(courses|broadcasts|quizzes)\//.test(url.pathname),
      () => {}
    );
    await page.goto(LANDING_URL);

    const goToCourse = page.getByRole('button', { name: 'Go to Course' });
    await expect(goToCourse).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buy Now' })).toHaveCount(0);
    await expect(page.getByPlaceholder('Enter coupon code')).toHaveCount(0);

    await goToCourse.click();

    await expect(page).toHaveURL(`/course/${COURSE_ID}`);
  });
});

test.describe('Checkout success page', () => {
  const sessionReply = (status) => ({
    status,
    course: { _id: COURSE_ID, title: 'Mastering React Testing' },
  });

  test('confirms a completed payment and links to the course', async ({ page }) => {
    await mockApiAsUser(page, users.student, {
      [`GET /purchase/session/${SESSION_ID}`]: { status: 200, body: sessionReply('completed') },
    });
    await page.goto(`/checkout/success?session_id=${SESSION_ID}`);

    await expect(page.getByRole('heading', { name: /Payment Successful!/ })).toBeVisible();
    await expect(page.getByText('Mastering React Testing')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start Learning Now' })).toHaveAttribute(
      'href',
      `/course/${COURSE_ID}`
    );
  });

  test('keeps polling while the payment is still pending', async ({ page }) => {
    let paid = false;
    let pendingServed = 0;
    await mockApiAsUser(page, users.student, {
      [`GET /purchase/session/${SESSION_ID}`]: async (route) => {
        const status = paid ? 'completed' : 'pending';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(sessionReply(status)),
        });
        if (status === 'pending') pendingServed++;
      },
    });
    await page.goto(`/checkout/success?session_id=${SESSION_ID}`);

    // Wait for two "pending" replies, not one: under React StrictMode the mount
    // effect fires twice, and that second initial request must not be the one
    // that sees `paid`. The page re-polls every 2s.
    await expect.poll(() => pendingServed, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await expect(page.getByText('Verifying your payment...')).toBeVisible();

    // Every reply so far said "pending", so success can only come from a later poll.
    paid = true;
    await expect(page.getByRole('heading', { name: /Payment Successful!/ })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('a missing session id shows the failure screen', async ({ page }) => {
    await mockApiAsUser(page, users.student);
    await page.goto('/checkout/success');

    await expect(page.getByRole('heading', { name: 'Payment Failed' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to Marketplace/ })).toBeVisible();
  });

  test('an unknown session shows the failure screen', async ({ page }) => {
    await mockApiAsUser(page, users.student, {
      [`GET /purchase/session/${SESSION_ID}`]: { status: 404, body: { message: 'Session not found' } },
    });
    await page.goto(`/checkout/success?session_id=${SESSION_ID}`);

    await expect(page.getByRole('heading', { name: 'Payment Failed' })).toBeVisible();
  });
});
