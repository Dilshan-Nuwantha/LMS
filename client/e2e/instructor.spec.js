// @ts-check
import { test, expect } from '@playwright/test';
import { mockApiAsUser, captureJson, users } from './helpers/api.js';

test.describe('Becoming an instructor', () => {
  test('a student can upgrade and lands on the instructor dashboard', async ({ page }) => {
    test.fail(
      true,
      'Known bug: BecomeInstructor.jsx:10 destructures `setUser` from AuthContext, which does not ' +
        'provide it. The server upgrades the account, then the page throws and shows ' +
        '"setUser is not a function" instead of redirecting.'
    );

    const promoted = { ...users.student, role: 'instructor' };
    const { calls } = await mockApiAsUser(page, users.student, {
      // Shape of instructorController.becomeInstructor.
      'POST /instructor/become': {
        status: 200,
        body: { message: 'You are now an instructor!', user: promoted },
      },
    });
    await page.goto('/become-instructor');

    await page.getByRole('button', { name: 'Start Teaching Today' }).click();

    await expect(page.getByText('You are now an instructor!', { exact: true })).toBeVisible();
    await expect(page).toHaveURL('/instructor/dashboard');
    expect(calls).toContain('POST /instructor/become');
  });

  test('a server refusal is shown and the button comes back', async ({ page }) => {
    await mockApiAsUser(page, users.student, {
      'POST /instructor/become': {
        status: 400,
        body: { message: 'You are already an instructor' },
      },
    });
    await page.goto('/become-instructor');

    await page.getByRole('button', { name: 'Start Teaching Today' }).click();

    await expect(page.getByText('You are already an instructor', { exact: true })).toBeVisible();
    await expect(page).toHaveURL('/become-instructor');
    await expect(page.getByRole('button', { name: 'Start Teaching Today' })).toBeEnabled();
  });

  test('an existing instructor is sent straight to the dashboard', async ({ page }) => {
    test.fail(
      true,
      'Known bug: BecomeInstructor.jsx:27-29 calls navigate() during render. React Router ignores ' +
        'navigation before mount (it only warns), so the component returns null and the page stays blank.'
    );

    await mockApiAsUser(page, users.instructor);
    await page.goto('/become-instructor');

    await expect(page).toHaveURL('/instructor/dashboard');
  });
});

test.describe('Instructor dashboard', () => {
  test('shows headline stats from the API', async ({ page }) => {
    await mockApiAsUser(page, users.instructor, {
      'GET /instructor/dashboard': {
        status: 200,
        body: {
          courses: [],
          totalCourses: 0,
          totalRevenue: 125000,
          totalSales: 25,
          totalStudents: 20,
          recentPurchases: [],
        },
      },
    });
    await page.goto('/instructor/dashboard');

    // formatCurrency uses the en-IN locale: lakh grouping.
    await expect(page.getByText('₹1,25,000')).toBeVisible();
    await expect(page.getByText('Total Sales')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No courses yet' })).toBeVisible();
  });
});

test.describe('Creating a course', () => {
  const titleInput = (page) => page.getByPlaceholder('e.g., Complete Web Development Bootcamp');
  const descriptionInput = (page) => page.getByPlaceholder('Describe what students will learn...');
  const priceInput = (page) => page.getByPlaceholder('499', { exact: true });
  const continueButton = (page) => page.getByRole('button', { name: 'Continue', exact: true });

  /** Fill steps 1 and 2 with valid data and land on step 3. */
  const reachLearningStep = async (page) => {
    await page.goto('/instructor/create-course');

    await titleInput(page).fill('Playwright in Practice');
    await descriptionInput(page).fill('Ship reliable end-to-end tests.');
    // The wizard's labels aren't associated with their controls, so select by name.
    await page.locator('select[name="category"]').selectOption('Development');
    await page.locator('select[name="level"]').selectOption('Beginner');
    await continueButton(page).click();

    await expect(page.getByRole('heading', { name: 'Pricing & Media' })).toBeVisible();
    await priceInput(page).fill('499');
    await continueButton(page).click();

    await expect(page.getByRole('heading', { name: 'Learning Content' })).toBeVisible();
  };

  test('step 1 requires a title and a description', async ({ page }) => {
    await mockApiAsUser(page, users.instructor);
    await page.goto('/instructor/create-course');

    await continueButton(page).click();
    await expect(page.getByText('Please enter a course title', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();

    await titleInput(page).fill('Playwright in Practice');
    await continueButton(page).click();
    await expect(page.getByText('Please enter a course description', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
  });

  test('step 2 requires a price above zero', async ({ page }) => {
    await mockApiAsUser(page, users.instructor);
    await page.goto('/instructor/create-course');

    await titleInput(page).fill('Playwright in Practice');
    await descriptionInput(page).fill('Ship reliable end-to-end tests.');
    await continueButton(page).click();
    await priceInput(page).fill('0');
    await continueButton(page).click();

    await expect(page.getByText('Please enter a valid price', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pricing & Media' })).toBeVisible();
  });

  test('Back returns to the previous step with its values kept', async ({ page }) => {
    await mockApiAsUser(page, users.instructor);
    await page.goto('/instructor/create-course');

    await titleInput(page).fill('Playwright in Practice');
    await descriptionInput(page).fill('Ship reliable end-to-end tests.');
    await continueButton(page).click();
    await expect(page.getByRole('heading', { name: 'Pricing & Media' })).toBeVisible();

    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
    await expect(titleInput(page)).toHaveValue('Playwright in Practice');
    await expect(descriptionInput(page)).toHaveValue('Ship reliable end-to-end tests.');
  });

  test('creates a draft course and opens its editor', async ({ page }) => {
    const bodies = [];
    await mockApiAsUser(page, users.instructor, {
      // createMarketplaceCourse responds 201 with the created course document.
      'POST /instructor/course': captureJson(bodies, {
        status: 201,
        reply: (body) => ({ _id: 'newcourse1', ...body, isMarketplace: true }),
      }),
    });
    // Park the course editor's own API calls: this test is about the wizard.
    await page.route(
      (url) => url.pathname.startsWith('/api/') && url.pathname.includes('/newcourse1'),
      () => {}
    );

    await reachLearningStep(page);
    await page.getByPlaceholder('e.g., Build full-stack web applications').fill('Write stable locators');
    await page.getByRole('button', { name: 'Create Course', exact: true }).click();

    await expect(page.getByText('Course created successfully!', { exact: true })).toBeVisible();
    await expect(page).toHaveURL('/admin/course/newcourse1');

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      title: 'Playwright in Practice',
      description: 'Ship reliable end-to-end tests.',
      category: 'Development',
      level: 'Beginner',
      price: 499, // a number, not the input's string
      originalPrice: 499, // defaults to price when left blank
      currency: 'INR',
      whatYouWillLearn: ['Write stable locators'],
      requirements: [], // blank rows are dropped
      status: 'Draft',
    });
  });

  test('a failed create keeps the instructor on the wizard', async ({ page }) => {
    await mockApiAsUser(page, users.instructor, {
      'POST /instructor/course': {
        status: 400,
        body: { message: 'Please provide title, description, and price' },
      },
    });

    await reachLearningStep(page);
    await page.getByRole('button', { name: 'Create Course', exact: true }).click();

    await expect(
      page.getByText('Please provide title, description, and price', { exact: true })
    ).toBeVisible();
    await expect(page).toHaveURL('/instructor/create-course');
    await expect(page.getByRole('button', { name: 'Create Course', exact: true })).toBeEnabled();
  });
});
