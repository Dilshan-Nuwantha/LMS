// Writes the bugs and test results as rows in the column order of the workbook's
// "Bug Tracker" and "QA Test Cases" tabs, for update-workbook.py to add.
//   node qa/regression/export-sheet.js [firstBugNumber]
const fs = require('fs');
const path = require('path');
const { cases } = require('./lib');
const env = require('./env');
require('./cases-core');
require('./cases-commerce');
require('./cases-learning');
require('./cases-security');
require('./manual-cases');
const { bugs, manualResults, retested } = require('./bugs');

const RESULTS = path.resolve(__dirname, '../results');
const RUN_DATE = '2026-11-06';
const VERIFIED_BY = 'Claude Code regression 2026-11-06';
const firstBug = Number(process.argv[2]) || 5;
const api = JSON.parse(fs.readFileSync(path.join(RESULTS, 'api-results.json'), 'utf8'));
const result = Object.fromEntries(api.results.map(r => [r.id, [r.status, r.actual || '']]));
Object.assign(result, manualResults);

const sheetId = Object.fromEntries(bugs.map((b, i) => [b.id, `BUG-${String(firstBug + i).padStart(3, '0')}`]));
const bugsFor = {};
bugs.forEach(b => b.tests.forEach(t => { (bugsFor[t] = bugsFor[t] || []).push(sheetId[b.id]); }));

// Module names as the workbook already uses them
const MODULE = {
    Authentication: 'Authentication', 'Course management': 'Course Management', 'Lecture progress': 'Learning Content',
    'Co-instructors': 'Course Management', Marketplace: 'Course Management', Payments: 'Payments', Coupons: 'Coupons',
    'Instructor tools': 'Course Management', Admin: 'Authorization', Quizzes: 'Assessments', 'AI features': 'Integration',
    Broadcasts: 'Notifications', Resources: 'Learning Content', Reviews: 'Course Management', Notifications: 'Notifications',
    'Activity log': 'Security', Security: 'Security', 'Error handling': 'Integration', 'Build and dependencies': 'Integration',
    'User interface': 'Integration'
};

// The workbook's Read Me forbids secrets, so tokens never leave the results file
const clean = (s) => String(s ?? '').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token removed]').replace(/\s+/g, ' ').trim();
const actual = (id) => {
    const [status, text] = result[id];
    if (status === 'PASS') return text || 'As expected';
    return text.replace(/ - \{.*$/, '').slice(0, 220);
};
// Only these browser and build checks were not repeated after the fixes
const uiOnEarlierCommit = new Set(cases.filter(c => !c.fn && !retested.includes(c.id)).map(c => c.id));
const developer = (where) => (/^client\//.test(where) ? 'Frontend Developer' : 'Backend Developer');

const bugRows = bugs.map(b => {
    const test = cases.find(c => c.id === b.tests[0]);
    return [
        sheetId[b.id], MODULE[test.module], `[${b.type}] ${b.title}`,
        `${test.steps}. Failed tests: ${b.tests.map(t => `TC-REG-${t}`).join(', ')}. Location: ${b.where}`,
        b.severity, b.severity, 'QA / Tester', b.status, developer(b.where), 'Local',
        b.fix, b.problem, RUN_DATE, '', b.status === 'Closed' ? VERIFIED_BY : '', '', '', '', ''
    ].map(clean);
});

const testRows = cases.map(c => [
    `TC-REG-${c.id}`, c.title, MODULE[c.module],
    c.fn ? 'Local regression stack running' : 'Client and API running locally', c.steps, c.expected, actual(c.id),
    result[c.id][0] === 'PASS' ? 'Pass' : 'Fail', c.fn ? 'Automated' : 'Manual', c.priority,
    'Claude Code', RUN_DATE, (bugsFor[c.id] || []).join(', '),
    `Regression run on ${uiOnEarlierCommit.has(c.id) ? 'commit 4280b9e' : 'Beralidu b5a0d04 plus BUG-026 to BUG-061, BUG-065 and BUG-074 fixes'} (${c.id})`
].map(clean));

// The team's own fixes, covered by these passing cases: AUTH-004, AUTH-012, PAY-016, PAY-001
const closedBugs = Object.fromEntries(['BUG-001', 'BUG-002', 'BUG-003', 'BUG-004'].map(id => [id, VERIFIED_BY]));
fs.writeFileSync(path.join(RESULTS, 'workbook-rows.json'), JSON.stringify({ bugRows, testRows, closedBugs }));
fs.rmSync(env.root, { recursive: true, force: true });
console.log(`Bugs ${bugRows.length}, tests ${testRows.length}, pass ${testRows.filter(r => r[7] === 'Pass').length}, fail ${testRows.filter(r => r[7] === 'Fail').length}`);
