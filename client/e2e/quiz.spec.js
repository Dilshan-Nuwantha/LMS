// @ts-check
import { test, expect } from '@playwright/test';
import { mockApiAsUser, captureJson, users } from './helpers/api.js';

const COURSE_ID = 'course1';
const QUIZ_ID = 'quiz1';
const QUIZ_URL = `/course/${COURSE_ID}/quiz/${QUIZ_ID}`;
const PASSING_SCORE = 70;

/** Questions as `startQuizAttempt` sends them — `correctAnswer` is stripped. */
const questions = [
  { questionText: 'What is the capital of France?', questionType: 'mcq', options: ['Berlin', 'Paris', 'Madrid'], points: 2 },
  { questionText: 'Playwright can drive WebKit.', questionType: 'true-false', options: [], points: 1 },
  { questionText: 'Which command runs the test suite?', questionType: 'short-answer', options: [], points: 1 },
];

/** The same questions with answers, as `submitQuizAttempt` returns them for review. */
const answerKey = [1, true, 'npx playwright test'];
const questionsWithAnswers = questions.map((q, i) => ({ ...q, correctAnswer: answerKey[i] }));

const quizMeta = { _id: QUIZ_ID, title: 'Playwright Basics Quiz', passingScore: PASSING_SCORE };

const startResponse = ({ timeLimit = 0, startedAt = new Date().toISOString() } = {}) => ({
  status: 201,
  body: {
    attempt: { _id: 'attempt1', quiz: QUIZ_ID, status: 'in-progress', startedAt, answers: [] },
    quiz: { ...quizMeta, timeLimit, questions },
  },
});

/** Grade the way `submitQuizAttempt` does, so the result screen gets a realistic payload. */
const grade = (answers) => {
  let score = 0;
  const graded = answers.map(({ questionIndex, answer }) => {
    const q = questionsWithAnswers[questionIndex];
    const isCorrect = q.questionType === 'short-answer'
      ? String(answer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim()
      : answer === q.correctAnswer;
    const pointsEarned = isCorrect ? q.points : 0;
    score += pointsEarned;
    return { questionIndex, answer, isCorrect, pointsEarned };
  });
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const percentage = Math.round((score / totalPoints) * 100);
  const passed = percentage >= PASSING_SCORE;

  return {
    attempt: { _id: 'attempt1', status: 'completed', answers: graded, score, totalPoints, percentage, passed, timeTaken: 42 },
    quiz: { ...quizMeta, questions: questionsWithAnswers },
    result: { score, totalPoints, percentage, passed, passingScore: PASSING_SCORE },
  };
};

/**
 * Stub a quiz for a signed-in student. `submissions` collects the bodies the
 * UI POSTs to /submit, so tests can assert on exactly what was graded.
 */
const stubQuiz = async (page, { start = startResponse(), myAttempts = [], extra = {} } = {}) => {
  const submissions = [];
  const api = await mockApiAsUser(page, users.student, {
    [`GET /quizzes/${QUIZ_ID}/my-attempts`]: { status: 200, body: myAttempts },
    [`POST /quizzes/${QUIZ_ID}/start`]: start,
    [`POST /quizzes/${QUIZ_ID}/submit`]: captureJson(submissions, {
      reply: (body) => grade(body.answers),
    }),
    ...extra,
  });
  return { ...api, submissions };
};

test.describe('Quiz — taking an attempt', () => {
  test('starts a fresh attempt on the first question', async ({ page }) => {
    const { calls } = await stubQuiz(page);
    await page.goto(QUIZ_URL);

    await expect(page.getByRole('heading', { name: 'Playwright Basics Quiz' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What is the capital of France?' })).toBeVisible();
    await expect(page.getByText('0/3 answered')).toBeVisible();
    await expect(page.getByText('Multiple Choice')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prev', exact: true })).toBeDisabled();
    expect(calls).toContain(`POST /quizzes/${QUIZ_ID}/start`);
  });

  test('answers every question type and submits a correctly shaped payload', async ({ page }) => {
    const { submissions } = await stubQuiz(page);
    await page.goto(QUIZ_URL);

    // Options are sr-only radios wrapped in labels, so click the visible text.
    await page.getByText('Paris', { exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Paris' })).toBeChecked();
    await expect(page.getByText('1/3 answered')).toBeVisible();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Playwright can drive WebKit.' })).toBeVisible();
    await page.getByText('True', { exact: true }).click();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByPlaceholder('Type your answer...').fill('NPX Playwright Test ');
    await expect(page.getByText('3/3 answered')).toBeVisible();
    // No "Next" on the last question.
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'You Passed!' })).toBeVisible();
    await expect(page.getByText('100%', { exact: true })).toBeVisible();
    expect(submissions).toEqual([
      {
        attemptId: 'attempt1',
        answers: [
          { questionIndex: 0, answer: 1 },
          { questionIndex: 1, answer: true },
          { questionIndex: 2, answer: 'NPX Playwright Test ' },
        ],
      },
    ]);
  });

  test('a failing score shows the pass mark and the correct answers', async ({ page }) => {
    await stubQuiz(page);
    await page.goto(QUIZ_URL);

    await page.getByText('Berlin', { exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByText('False', { exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByPlaceholder('Type your answer...').fill('jest');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Not Quite' })).toBeVisible();
    await expect(page.getByText(`You need ${PASSING_SCORE}% to pass`)).toBeVisible();
    await expect(page.getByText('Your answer: Berlin')).toBeVisible();
    await expect(page.getByText('Correct: Paris')).toBeVisible();
    await expect(page.getByText('Correct: npx playwright test')).toBeVisible();
  });

  test('submitting with unanswered questions asks for confirmation first', async ({ page }) => {
    const { submissions } = await stubQuiz(page);
    await page.goto(QUIZ_URL);
    await page.getByText('Paris', { exact: true }).click();

    // Dismissing the confirm keeps the student in the quiz.
    const messages = [];
    page.once('dialog', (dialog) => {
      messages.push(dialog.message());
      void dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    expect(messages).toEqual(['You have 2 unanswered question(s). Submit anyway?']);
    await expect(page.getByText('1/3 answered')).toBeVisible();
    expect(submissions).toHaveLength(0);

    // Accepting it submits only what was answered.
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Not Quite' })).toBeVisible();
    expect(submissions[0].answers).toEqual([{ questionIndex: 0, answer: 1 }]);
  });

  test('a student who already passed lands in review mode and can retake', async ({ page }) => {
    const passedAttempt = grade(
      answerKey.map((answer, questionIndex) => ({ questionIndex, answer }))
    ).attempt;

    const { calls } = await stubQuiz(page, {
      myAttempts: [passedAttempt],
      extra: {
        [`GET /quizzes/${QUIZ_ID}`]: {
          status: 200,
          body: { ...quizMeta, questions: questionsWithAnswers },
        },
      },
    });
    await page.goto(QUIZ_URL);

    await expect(page.getByText('Review Mode')).toBeVisible();
    await expect(page.getByText('100% Passed')).toBeVisible();
    expect(calls).not.toContain(`POST /quizzes/${QUIZ_ID}/start`);

    await page.getByRole('button', { name: 'Retake Quiz' }).click();

    await expect(page.getByText('0/3 answered')).toBeVisible();
    expect(calls).toContain(`POST /quizzes/${QUIZ_ID}/start`);
  });

  test('a start error explains why and returns to the course', async ({ page }) => {
    await stubQuiz(page, {
      start: {
        status: 403,
        body: { message: 'You must be enrolled in this course to take the quiz' },
      },
    });
    // Park the course page's own API calls so it stays on its loading state;
    // this test is about the quiz page, not the page it redirects to.
    await page.route(
      (url) => url.pathname.startsWith('/api/') && url.pathname.includes(`/${COURSE_ID}`),
      () => {}
    );

    await page.goto(QUIZ_URL);

    await expect(
      page.getByText('You must be enrolled in this course to take the quiz')
    ).toBeVisible();
    await expect(page).toHaveURL(`/course/${COURSE_ID}?tab=quizzes`);
  });
});

test.describe('Quiz — time limit', () => {
  const T0 = new Date('2026-09-13T10:00:00.000Z');
  const timedStart = () => startResponse({ timeLimit: 1, startedAt: T0.toISOString() });

  test('auto-submits without a confirm when time runs out', async ({ page }) => {
    await page.clock.install({ time: T0 });
    const { submissions } = await stubQuiz(page, { start: timedStart() });
    let dialogs = 0;
    page.on('dialog', (dialog) => {
      dialogs++;
      void dialog.dismiss();
    });

    await page.goto(QUIZ_URL);
    await expect(page.getByText(/^\d+:\d{2}$/)).toBeVisible();

    await page.clock.fastForward('01:05');

    await expect(page.getByRole('heading', { name: 'Not Quite' })).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(dialogs).toBe(0);
  });

  test('auto-submit keeps the answers given before time ran out', async ({ page }) => {
    test.fail(
      true,
      'Known bug: the timer effect in QuizTake.jsx (lines 28-44) depends on ' +
        '[quiz, attempt, result, reviewMode] but not `answers`. Its interval keeps the ' +
        'handleSubmit from the first render, so a timed-out attempt submits `answers: []` ' +
        'and is graded as blank, whatever the student had answered.'
    );

    await page.clock.install({ time: T0 });
    const { submissions } = await stubQuiz(page, { start: timedStart() });

    await page.goto(QUIZ_URL);
    await page.getByText('Paris', { exact: true }).click();
    await expect(page.getByText('1/3 answered')).toBeVisible();

    await page.clock.fastForward('01:05');

    await expect(page.getByRole('heading', { name: /You Passed!|Not Quite/ })).toBeVisible();
    expect(submissions[0].answers).toEqual([{ questionIndex: 0, answer: 1 }]);
  });
});
