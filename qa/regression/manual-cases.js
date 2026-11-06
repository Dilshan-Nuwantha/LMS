// Checks run outside the API suite: tooling and the real UI in a browser.
const { tc } = require('./lib');

const manual = (id, module, priority, title, steps, expected) => tc(id, module, priority, title, steps, expected, null);

const B = 'Build and dependencies';
manual('BLD-001', B, 'Critical', 'Client production build', 'Run npm run build in client/', 'Build succeeds');
manual('BLD-002', B, 'Medium', 'Client lint', 'Run npm run lint in client/', 'No lint errors');
manual('BLD-003', B, 'High', 'Server dependency audit', 'Run npm audit --omit=dev in server/', 'No high or critical advisories');
manual('BLD-004', B, 'High', 'Client dependency audit', 'Run npm audit --omit=dev in client/', 'No high or critical advisories');
manual('BLD-005', B, 'Critical', 'No secrets in git history', 'Search all branches for .env files and live keys', 'Nothing found');
manual('BLD-006', B, 'Low', 'Every import has a declared dependency', 'Compare client imports with package.json', 'All imports resolve to declared packages');
manual('BLD-007', B, 'High', 'Existing team test suites', 'Run the tests in server/tests with MONGO_URI and MONGO_TEST_URI set to a local database', 'All tests pass');

const U = 'User interface';
manual('UI-001', U, 'Critical', 'Home and marketplace load for a guest', 'Open / and /marketplace', 'Pages render with no console errors');
manual('UI-002', U, 'Critical', 'Log in through the form', 'Sign in as a student', 'Lands on the student dashboard');
manual('UI-003', U, 'High', 'Wrong password shows an error', 'Sign in with a wrong password', 'An error toast appears (NFR-USE-04)');
manual('UI-004', U, 'High', 'Unknown route shows the 404 page', 'Open /this-does-not-exist', 'The Not Found page renders (NFR-USE-05)');
manual('UI-005', U, 'High', 'Guest is redirected from a protected page', 'Open /my-learning logged out', 'Redirected to /login');
manual('UI-006', U, 'High', 'Student is kept out of the admin dashboard', 'Open /admin/dashboard as a student', 'Redirected away');
manual('UI-007', U, 'Medium', 'Theme toggle', 'Switch between light and dark', 'Theme changes and survives a reload (NFR-USE-01)');
manual('UI-008', U, 'Medium', 'Mobile layout at 375px', 'Open home and marketplace at 375px', 'No horizontal page scroll (NFR-USE-02)');
manual('UI-009', U, 'High', 'Course landing page', 'Open a marketplace course', 'Title, price and curriculum render');
manual('UI-010', U, 'Critical', 'Stored script link does not run', 'A javascript: resource link is clicked by a student in the course', 'The script does not run and the login token cannot be read');
manual('UI-011', U, 'High', 'Lecture script link does not run', 'A lecture has a javascript: resource URL; open it as a student', 'The link is inert');
manual('UI-012', U, 'Critical', 'Admin register page is not public', 'Open /admin/register as a guest', 'The page is not available');
manual('UI-013', U, 'Medium', 'Page title uses the product name', 'Read the browser tab title', 'Title says Tenz Learn');
manual('UI-014', U, 'Critical', 'My Learning lists enrolled courses', 'Log in as an enrolled student, open /my-learning, search, then click View Course Lectures', 'The course is listed with its category and level, search filters it, and the link opens the course');
manual('UI-015', U, 'High', 'Marketplace language filter', 'Open Advanced Filters, choose Sinhala, apply', 'Only Sinhala courses are listed');
manual('UI-016', U, 'High', 'New lecture is announced once', 'As a teacher on a published course, save one lecture normally and one with a custom announcement', 'One broadcast each, with a direct link, and the chosen priority is kept');
