// Regression runner.
//   node qa/regression/run.js --list    write qa/TEST_CASES.md without running anything
//   node qa/regression/run.js           run the suite and write qa/results/
//   node qa/regression/run.js --serve   start the test stack with seeded data for browser checks
//   node qa/regression/run.js --report  merge results and bugs.js into qa/TEST_CASES.md and qa/BUG_REPORT.md
const fs = require('fs');
const path = require('path');
const lib = require('./lib');
const { cases, env } = lib;
const fixtures = require('./fixtures');
require('./cases-core');
require('./cases-commerce');
require('./cases-learning');
require('./cases-security');
require('./manual-cases');

const QA = path.resolve(__dirname, '..');
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

const writeCaseDocument = (resultOf) => {
    const modules = [...new Set(cases.map(c => c.module))];
    const count = (p) => cases.filter(c => c.priority === p).length;
    const out = [
        '# Tenz Learn - Regression Test Cases', '',
        `**Branch under test:** fix/payment-gateway  `,
        `**Requirements source:** SRS.md v1.0  `,
        `**Total cases:** ${cases.length} (Critical ${count('Critical')}, High ${count('High')}, Medium ${count('Medium')}, Low ${count('Low')})`, '',
        '## How to run', '',
        '```bash', 'node qa/regression/run.js', '```', '',
        'Run `npm install` in `server/` first. The run starts its own local MongoDB and two API instances, and needs MongoDB Server installed (set `QA_MONGOD` if it is not in the default path). It does not use `server/.env` values for the database, Stripe, email or Google: all of them are replaced with local stand-ins. Stripe webhook signature checks stay real. `BLD` and `UI` cases are run by hand.', '',
        '## Summary', '', '| Module | Cases |', '|---|---|',
        ...modules.map(m => `| ${m} | ${cases.filter(c => c.module === m).length} |`), ''
    ];
    modules.forEach(m => {
        const extra = resultOf ? ' Result | Bug |' : '';
        out.push(`## ${m}`, '', `| ID | Priority | Test case | Steps | Expected result |${extra}`, `|---|---|---|---|---|${resultOf ? '---|---|' : ''}`);
        cases.filter(c => c.module === m).forEach(c => {
            const tail = resultOf ? ` ${resultOf(c).join(' | ')} |` : '';
            out.push(`| ${c.id} | ${c.priority} | ${cell(c.title)} | ${cell(c.steps)} | ${cell(c.expected)} |${tail}`);
        });
        out.push('');
    });
    fs.writeFileSync(path.join(QA, 'TEST_CASES.md'), out.join('\n'));
    console.log(`Wrote qa/TEST_CASES.md with ${cases.length} cases`);
};

// Merges the run results and bug register into qa/TEST_CASES.md and qa/BUG_REPORT.md
const writeReports = () => {
    const { bugs, manualResults } = require('./bugs');
    const api = JSON.parse(fs.readFileSync(path.join(QA, 'results', 'api-results.json'), 'utf8'));
    const result = Object.fromEntries(api.results.map(r => [r.id, [r.status, r.actual || '']]));
    Object.assign(result, manualResults);

    const bugFor = {};
    bugs.forEach(b => b.tests.forEach(t => { (bugFor[t] = bugFor[t] || []).push(b.id); }));

    const unmapped = cases.filter(c => result[c.id]?.[0] === 'FAIL' && !bugFor[c.id]).map(c => c.id);
    const missing = cases.filter(c => !result[c.id]).map(c => c.id);
    const passingLinked = Object.keys(bugFor).filter(id => result[id]?.[0] !== 'FAIL');
    if (unmapped.length || missing.length || passingLinked.length) {
        throw new Error(`Report check failed. Unmapped: ${unmapped}. No result: ${missing}. Linked but not failing: ${passingLinked}`);
    }

    writeCaseDocument((c) => [result[c.id][0], (bugFor[c.id] || []).join(', ') || '-']);

    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const types = ['Security', 'Vulnerability', 'Bug'];
    const typeName = { Security: 'Security issues', Vulnerability: 'Vulnerabilities', Bug: 'Bugs' };
    const n = (f) => bugs.filter(f).length;
    const pass = cases.filter(c => result[c.id][0] === 'PASS').length;
    const out = [
        '# Tenz Learn - Regression Bug Report', '',
        `**Branch:** develop at commit cd8554b  `,
        `**Run date:** ${api.ranAt.slice(0, 10)}  `,
        `**Result:** ${cases.length} test cases, ${pass} passed, ${cases.length - pass} failed  `,
        `**Findings:** ${bugs.length} (${severities.map(s => `${n(b => b.severity === s)} ${s}`).join(', ')})`, '',
        '**Recommendation: do not release this branch.** LMS-001 to LMS-004 need fixing first. LMS-001 gives any visitor full admin access, and LMS-004 locks out existing users.', '',
        '## Summary', '',
        '| Severity | Security issues | Vulnerabilities | Bugs | Total |', '|---|---|---|---|---|',
        ...severities.map(s => `| ${s} | ${types.map(t => n(b => b.severity === s && b.type === t)).join(' | ')} | ${n(b => b.severity === s)} |`),
        `| **Total** | ${types.map(t => `**${n(b => b.type === t)}**`).join(' | ')} | **${bugs.length}** |`, '',
        '- **Security issue:** a flaw in the app\'s own access control or data handling.',
        '- **Vulnerability:** an exploitable weakness, such as XSS, or a known flaw in a dependency.',
        '- **Bug:** the app does not behave as the SRS or the user would expect.', '',
        '## Test results by module', '',
        '| Module | Cases | Passed | Failed |', '|---|---|---|---|',
        ...[...new Set(cases.map(c => c.module))].map(m => {
            const list = cases.filter(c => c.module === m);
            const p = list.filter(c => result[c.id][0] === 'PASS').length;
            return `| ${m} | ${list.length} | ${p} | ${list.length - p} |`;
        }), '',
        '## How this was tested', '',
        `- The API suite ran ${api.results.length} cases against the real server code at commit cd8554b on develop, using a temporary local MongoDB. The hosted lms-dev database was not used.`,
        '- Stripe, email, Google sign-in and the AI providers were local stand-ins, so **no real payment, email or AI request was made**. Stripe webhook signatures were verified for real. Outbound calls blocked: ' + api.blockedOutbound.length + '.',
        '- Production-only behaviour (rate limits, stack traces, cron secret) ran against a second instance with NODE_ENV=production.',
        '- UI checks ran on commit 4280b9e and were not repeated on cd8554b. LMS-003 was confirmed in real Chrome with a temporary profile, and its code has not changed since.', '',
        '### Not covered', '',
        '- A real Stripe checkout page, real Google sign-in, real email delivery and real AI provider responses.',
        '- Load and performance targets (NFR-PERF), and uptime.',
        '- Browsers other than Chromium, and the deployed Render or Vercel setup.',
        '- UI coverage was a smoke test of the main pages. Instructor and admin screens were tested through the API only.', ''
    ];

    severities.forEach(s => {
        out.push(`## ${s}`, '');
        bugs.filter(b => b.severity === s).forEach(b => {
            out.push(`### ${b.id}: ${b.title}`, '', `**Type:** ${b.type}  `, `**Where:** ${b.where}  `, `**Failed tests:** ${b.tests.join(', ')}`, '', b.problem, '', `**Fix:** ${b.fix}`, '');
        });
    });

    out.push(
        '## Other observations', '', 'These are not counted as bugs.', '',
        '- Fixed on develop since the first run: LMS-063 (blocked and deleted users got wrong auth responses) and LMS-064 (wrong role returned 401). They are removed from this report, so those numbers are skipped.',
        '- `server/node_modules` on this machine has no `nodemailer`, so the server will not start until `npm install` is run in `server/`.',
        '- `server/.env` has no `EMAIL_USER` or `EMAIL_PASS`, so password reset emails cannot be sent with this configuration, and no `server/.env.example` exists.',
        '- `CRON_SECRET` is needed in production for the due date reminders; it is not in `server/.env`.',
        '- `server/tests/auth.test.js` loads `server/.env`, so `npm test` runs against the hosted lms-dev database by default.',
        '- The SRS is out of date in places: FR-PAY-04 says invoices are public, but the code correctly protects them. It lists `canManageContent`-style permissions, while the code uses `manage_content`. Section 9.6 says no email service exists.',
        '- SRS 3.3 says instructors apply and are granted the role, but `/auth/teacher/register` and `/instructor/become` grant it instantly. Please confirm which is intended.',
        '- Home page text has a typo, "LEARNING MANAGMENT SYSTEM", and the footer has placeholder contact details.',
        ''
    );
    fs.writeFileSync(path.join(QA, 'BUG_REPORT.md'), out.join('\n'));
    console.log(`Wrote reports: ${cases.length} cases, ${pass} passed, ${cases.length - pass} failed, ${bugs.length} bugs`);
};

const run = async () => {
    await env.start();
    const results = [];
    try {
        await fixtures.seed();
        for (const c of cases.filter(x => x.fn)) {
            const t = Date.now();
            try {
                await c.fn();
                results.push({ id: c.id, status: 'PASS', ms: Date.now() - t });
            } catch (e) {
                results.push({ id: c.id, status: 'FAIL', actual: e.message, ms: Date.now() - t });
                console.log(`FAIL ${c.id} ${c.title}\n     ${e.message}`);
            }
        }
        const blocked = lib.lines('blocked.jsonl');
        const dir = path.join(QA, 'results');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'api-results.json'), JSON.stringify({ ranAt: new Date().toISOString(), blockedOutbound: blocked, results }, null, 2));
        ['development', 'production'].forEach(n => fs.copyFileSync(path.join(env.root, `server-${n}.log`), path.join(dir, `server-${n}.log`)));
        const pass = results.filter(r => r.status === 'PASS').length;
        console.log(`\n${results.length} run, ${pass} passed, ${results.length - pass} failed, ${blocked.length} outbound calls blocked`);
    } finally {
        await fixtures.mongoose.disconnect().catch(() => {});
        await env.stop();
    }
};

const serve = async () => {
    await env.start();
    await fixtures.seed();
    const { F } = fixtures;
    const { api, newUser } = lib;
    await api('PUT', `/resources/${F.course.id}/toggle-student-uploads`, { token: F.instr.token });
    const xss = "javascript:document.title='XSS-'+localStorage.getItem('token').slice(0,12);window.opener&&(window.opener.document.title='XSS-'+localStorage.getItem('token').slice(0,12))";
    await api('POST', `/resources/${F.course.id}`, { token: F.instr.token, form: lib.multipart({ url: xss, title: 'QA script link' }) });
    await api('PUT', `/courses/lectures/${F.L2}`, { token: F.instr.token, body: { resourceUrl: xss } });
    const info = { api: env.DEV, courseId: F.course.id, lecture: F.L2, student: { email: F.s1.email, password: F.s1.password } };
    fs.writeFileSync(path.join(QA, 'results', 'serve-info.json'), JSON.stringify(info, null, 2));
    console.log('Test stack ready');
    process.on('SIGTERM', () => env.stop().then(() => process.exit(0)));
    setInterval(() => {}, 1 << 30);
};

if (process.argv.includes('--report')) {
    writeReports();
    fs.rmSync(env.root, { recursive: true, force: true });
    process.exit(0);
} else if (process.argv.includes('--list')) {
    writeCaseDocument();
    fs.rmSync(env.root, { recursive: true, force: true });
    process.exit(0);
} else if (process.argv.includes('--serve')) {
    fs.mkdirSync(path.join(QA, 'results'), { recursive: true });
    serve().catch(e => { console.error(e); process.exit(1); });
} else {
    run().catch(e => { console.error(e); process.exit(1); });
}
