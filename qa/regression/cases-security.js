// Security checks and error handling. Rate limit and production checks use the production instance.
const { tc, api, prod, ok, is, eq, lastOtp, googleCode, newUser, multipart, sleep, uid, lines, webhook, serverRequire, env } = require('./lib');
const { F, models, mkCourse, addSection, addLecture, enroll, buy } = require('./fixtures');
const jwt = serverRequire('jsonwebtoken');

const S = 'Security';
const ip = () => ({ 'X-Forwarded-For': `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });

tc('SEC-001', S, 'Critical', 'Public admin registration is closed', 'POST /auth/admin/register with no credentials', 'Refused; SRS 10.2 says there is no admin self-registration', async () => {
    const r = await api('POST', '/auth/admin/register', { body: { name: 'Evil', email: `evil.${uid()}@qa.test`, password: 'Secret123!' } });
    F.evil = r.json;
    ok(r.status >= 400, `an admin account was created by a guest (HTTP ${r.status}, role ${r.json?.role})`);
});
tc('SEC-002', S, 'Critical', 'Self-registered admin has no admin access', 'Call GET /admin/users with the token from SEC-001', 'Denied', async () => {
    const r = await api('GET', '/admin/users', { token: F.evil?.token });
    ok(r.status >= 400, `guest-created admin read ${r.json?.length} user records`);
});
tc('SEC-003', S, 'Critical', 'Role in the register body is ignored', 'POST /auth/register with role admin', 'Created as student', async () => {
    const r = await api('POST', '/auth/register', { body: { name: 'E', email: `e.${uid()}@qa.test`, password: 'Secret123!', role: 'admin' } });
    eq(r.json.role, 'student', 'role');
});
tc('SEC-004', S, 'Critical', 'Google sign-in cannot create an admin', 'POST /auth/admin/google with a new identity', 'Refused', async () => {
    const r = await api('POST', '/auth/admin/google', { body: { code: googleCode({ sub: 'g' + uid(), email: `ga.${uid()}@qa.test`, name: 'G', email_verified: true }) } });
    ok(r.status >= 400, `role ${r.json?.role} created`);
});
tc('SEC-005', S, 'High', 'Login rejects database operators', 'POST /auth/login with email {"$regex":"^student1"} and a valid password', 'HTTP 400', async () => {
    const r = await api('POST', '/auth/login', { body: { email: { $regex: `^${F.s1.email.replace('.', '\\.')}` }, password: F.s1.password } });
    is(r, 400);
});
tc('SEC-006', S, 'Critical', 'Passwords never reach the activity log', 'Change a password, read the log entry', 'No password value stored', async () => {
    const u = await newUser('student', 'logpw');
    await api('PUT', '/auth/updatepassword', { token: u.token, body: { currentPassword: u.password, newPassword: 'PlainNewPass99!' } });
    await sleep(150);
    const row = await models.Activity.findOne({ user: u.id, action: 'Password Updated' }).lean();
    ok(!JSON.stringify(row).includes('PlainNewPass99!'), 'plaintext old and new passwords are stored in Activity.data');
});
tc('SEC-007', S, 'Critical', 'AI keys never reach the activity log', 'Save an AI key, read the log entry', 'No key value stored', async () => {
    const u = await newUser('teacher', 'logkey');
    await api('POST', '/ai/config', { token: u.token, body: { provider: 'openai', apiKey: 'sk-plain-secret-key-9999', model: 'm' } });
    await sleep(150);
    ok(!(await models.Activity.exists({ user: u.id, 'data.apiKey': 'sk-plain-secret-key-9999' })), 'plaintext AI key is stored in Activity.data, bypassing AES encryption');
});
tc('SEC-008', S, 'High', 'Bank details never reach the activity log', 'Save bank details, read the log entry', 'No account number stored', async () => {
    const u = await newUser('teacher', 'logbank');
    await api('POST', '/instructor/bank-details', { token: u.token, body: { accountHolderName: 'Q', accountNumber: '998877665544' } });
    await sleep(150);
    ok(!(await models.Activity.exists({ user: u.id, 'data.accountNumber': '998877665544' })), 'account number stored in Activity.data');
});
tc('SEC-009', S, 'High', 'A reset token is not a login token', 'Use a resetToken as a Bearer token', 'HTTP 401', async () => {
    const u = await newUser('student', 'rt');
    await api('POST', '/auth/forgot-password', { body: { email: u.email } });
    const v = await api('POST', '/auth/verify-otp', { body: { email: u.email, otp: lastOtp(u.email) } });
    is(await api('GET', '/auth/me', { token: v.json.resetToken }), 401);
});
tc('SEC-010', S, 'Medium', 'OTP hash is not exposed', 'Request a reset, then GET /auth/me', 'No otpHash field', async () => {
    const u = await newUser('student', 'oh');
    await api('POST', '/auth/forgot-password', { body: { email: u.email } });
    const r = await api('GET', '/auth/me', { token: u.token });
    ok(!r.json.otpHash, 'otpHash returned; a 6-digit code can be cracked offline');
});
tc('SEC-011', S, 'High', 'Reset code locks after repeated failures', 'Send 12 wrong codes from different IPs, then the right code', 'The code is locked or invalidated', async () => {
    const u = await newUser('student', 'brute');
    await api('POST', '/auth/forgot-password', { body: { email: u.email } });
    const otp = lastOtp(u.email);
    for (let i = 0; i < 12; i++) await api('POST', '/auth/verify-otp', { body: { email: u.email, otp: '000000' } });
    const r = await api('POST', '/auth/verify-otp', { body: { email: u.email, otp } });
    is(r, 400);
});
tc('SEC-012', S, 'High', 'Login is rate limited', 'Production mode: 6 wrong logins from one IP', 'Sixth request returns HTTP 429 (NFR-SEC-06)', async () => {
    const h = ip();
    let last;
    for (let i = 0; i < 6; i++) last = await prod('POST', '/auth/login', { headers: h, body: { email: 'x@qa.test', password: 'x' } });
    is(last, 429);
});
tc('SEC-013', S, 'High', 'Registration is rate limited', 'Production mode: 4 registrations from one IP', 'Fourth request returns HTTP 429', async () => {
    const h = ip();
    let last;
    for (let i = 0; i < 4; i++) last = await prod('POST', '/auth/register', { headers: h, body: { name: 'A', email: `r.${uid()}@qa.test`, password: 'Secret123!' } });
    is(last, 429);
    F.prodUser = null;
});
tc('SEC-014', S, 'Medium', 'Reset code checks are rate limited', 'Production mode: 6 verify-otp calls from one IP', 'Sixth returns HTTP 429', async () => {
    const h = ip();
    let last;
    for (let i = 0; i < 6; i++) last = await prod('POST', '/auth/verify-otp', { headers: h, body: { email: 'x@qa.test', otp: '1' } });
    is(last, 429);
});
tc('SEC-015', S, 'Medium', 'General API limit', 'Production mode: 301 requests from one IP', 'HTTP 429 at the limit', async () => {
    const h = ip();
    let last;
    for (let i = 0; i < 301; i++) last = await prod('GET', '/marketplace/categories', { headers: h });
    is(last, 429);
});
tc('SEC-016', S, 'Medium', 'Rate limit cannot be dodged with a header', 'Production mode: 8 logins, changing X-Forwarded-For each time', 'Still limited (only valid if the app sits directly on the internet; see the bug note)', async () => {
    let limited = false;
    for (let i = 0; i < 8; i++) limited = (await prod('POST', '/auth/login', { headers: ip(), body: { email: 'x@qa.test', password: 'x' } })).status === 429 || limited;
    ok(limited, '8 attempts, none limited');
});
tc('SEC-017', S, 'Medium', 'Marketplace course creation is rate limited', 'Production mode: 11 calls to POST /instructor/course', 'HTTP 429 at the limit (NFR-SEC-06 covers course creation)', async () => {
    const h = ip();
    const reg = await prod('POST', '/auth/teacher/register', { headers: h, body: { name: 'T', email: `t.${uid()}@qa.test`, password: 'Secret123!' } });
    is(reg, 201);
    let last;
    for (let i = 0; i < 11; i++) last = await prod('POST', '/instructor/course', { headers: h, token: reg.json.token, body: { title: 'T', description: 'D', price: 1 } });
    is(last, 429);
});
tc('SEC-018', S, 'High', 'Production errors hide stack traces', 'Production mode: trigger an error', 'stack is null', async () => {
    const r = await prod('GET', '/marketplace/not-an-id', { headers: ip() });
    eq(r.json.stack, null, 'stack');
});
tc('SEC-019', S, 'Low', 'Production errors hide internals', 'Production mode: GET /marketplace/not-an-id', 'No database details in the message', async () => {
    const r = await prod('GET', '/marketplace/not-an-id', { headers: ip() });
    ok(!/Cast to|ObjectId|model/i.test(r.json.message), `message: ${r.json.message}`);
});
tc('SEC-020', S, 'Medium', 'Security headers are set', 'Read the headers on an API response', 'nosniff, HSTS and frame protection present; X-Powered-By absent', async () => {
    const h = (await api('GET', '/health')).headers;
    const missing = ['x-content-type-options', 'strict-transport-security', 'x-frame-options'].filter(n => !h.get(n));
    if (h.get('x-powered-by')) missing.push('x-powered-by is exposed');
    ok(!missing.length, `missing: ${missing.join(', ')}`);
});
tc('SEC-021', S, 'High', 'CORS allows only the client origin', 'Send a request with Origin https://evil.test', 'That origin is not reflected', async () => {
    const r = await api('GET', '/health', { headers: { Origin: 'https://evil.test' } });
    ok(r.headers.get('access-control-allow-origin') !== 'https://evil.test', 'origin reflected');
});
tc('SEC-022', S, 'Critical', 'Unsigned and wrongly signed tokens are rejected', 'Use an alg:none token and one signed with another secret', 'HTTP 401 each', async () => {
    const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    is(await api('GET', '/auth/me', { token: `${b({ alg: 'none', typ: 'JWT' })}.${b({ id: F.admin.id })}.` }), 401, 'alg none');
    is(await api('GET', '/auth/me', { token: jwt.sign({ id: F.admin.id }, 'wrong') }), 401, 'wrong secret');
});
const ADMIN_ROUTES = [['GET', '/admin/dashboard'], ['GET', '/admin/instructors'], ['GET', '/admin/users'], ['GET', '/admin/payouts'], ['POST', '/admin/payouts'], ['POST', '/admin/impersonate'], ['GET', '/activities']];
tc('SEC-023', S, 'Critical', 'Non-admins are refused on admin routes', 'Call each admin route as a student and an instructor', 'Denied every time', async () => {
    for (const [m, u] of ADMIN_ROUTES) for (const t of [F.s1, F.instr]) ok((await api(m, u, { token: t.token, body: m === 'POST' ? {} : undefined })).status >= 400, `${m} ${u} allowed`);
});
tc('SEC-024', S, 'Low', 'Wrong role gets 403, not 401', 'GET /admin/dashboard as a student', 'HTTP 403; 401 means "not logged in", and the client shows "session expired"', async () => {
    is(await api('GET', '/admin/dashboard', { token: F.s1.token }), 403);
});
tc('SEC-025', S, 'Critical', 'Guests are refused on protected routes', 'Call a sample of protected routes with no token', 'HTTP 401 each', async () => {
    for (const u of ['/courses', '/courses/my/enrolled', '/purchase/my-purchases', '/notifications', '/student-ai/conversations', '/instructor/dashboard', '/admin/users', '/activities/me']) is(await api('GET', u), 401, u);
});
tc('SEC-026', S, 'High', 'Cron endpoint needs its secret in production', 'Production mode: GET /cron/due-reminders with and without the secret', 'HTTP 401 without, HTTP 200 with', async () => {
    is(await prod('GET', '/cron/due-reminders', { headers: ip() }), 401);
    is(await prod('GET', '/cron/due-reminders', { headers: { ...ip(), Authorization: 'Bearer qa-cron-secret' } }), 200);
});
tc('SEC-027', S, 'High', "Instructors cannot message another instructor's students", 'POST /notifications/course/:id/send as an unrelated instructor', 'HTTP 403', async () => {
    is(await api('POST', `/notifications/course/${F.course.id}/send`, { token: F.instr2.token, body: { title: 'Phishing' } }), 403);
});
tc('SEC-028', S, 'High', 'Notifications cannot target arbitrary users', 'Send with studentIds of a user outside the course', 'Refused', async () => {
    const c = await mkCourse(F.instr2);
    const r = await api('POST', `/notifications/course/${c.id}/send`, { token: F.instr2.token, body: { title: 'Spam-' + uid(), studentIds: [F.admin.id] } });
    await sleep(100);
    ok(r.status >= 400, 'notification delivered to a user who is not in the course');
});
tc('SEC-029', S, 'High', "Instructors cannot change another course's settings", 'PUT /notifications/course/:id/settings as an unrelated instructor', 'HTTP 403', async () => {
    is(await api('PUT', `/notifications/course/${F.course.id}/settings`, { token: F.instr2.token, body: { newContent: false } }), 403);
});
tc('SEC-030', S, 'Medium', 'Course list shows only what the user may see', 'GET /courses as a student', 'No drafts, private or blocked courses of other users', async () => {
    const r = await api('GET', '/courses', { token: F.s3.token });
    ok(!r.json.some(c => c.status === 'Draft' && c.user !== F.s3.id), `returned ${r.json.length} courses, including other users' drafts`);
});
tc('SEC-031', S, 'Medium', 'Broadcasts are for course members', 'GET active broadcasts as a non-enrolled user', 'HTTP 403', async () => {
    is(await api('GET', `/broadcasts/course/${F.course.id}/active`, { token: F.s3.token }), 403);
});
tc('SEC-032', S, 'Medium', 'Only members can read or post comments', 'POST and GET comments as a non-enrolled user', 'HTTP 403', async () => {
    is(await api('POST', `/courses/lectures/${F.L2}/comments`, { token: F.s3.token, body: { content: 'Spam', courseId: F.course.id } }), 403, 'post');
    is(await api('GET', `/courses/lectures/${F.L2}/comments`, { token: F.s3.token }), 403, 'read');
});
tc('SEC-033', S, 'High', 'Paywall: quiz questions are for members', 'GET /quizzes/:id and /quizzes/course/:id as a non-enrolled user', 'HTTP 403', async () => {
    is(await api('GET', `/quizzes/${F.quiz._id}`, { token: F.s3.token }), 403);
});
tc('SEC-034', S, 'Critical', 'Script links are rejected', 'Add a resource link and a lecture URL using javascript:', 'HTTP 400 each', async () => {
    const payload = 'javascript:alert(document.domain)';
    is(await api('POST', `/resources/${F.course.id}`, { token: F.instr.token, form: multipart({ url: payload, title: 'XSS' }) }), 400, 'resource');
    is(await api('PUT', `/courses/lectures/${F.L2}`, { token: F.instr.token, body: { resourceUrl: payload } }), 400, 'lecture');
});
tc('SEC-035', S, 'Medium', 'Upload filter cannot be bypassed', 'Upload HTML declared as "text/html; csv"', 'HTTP 400', async () => {
    const form = multipart({ title: 'x' }, { name: 'a.html', type: 'text/html; csv', data: Buffer.from('<script>alert(1)</script>') });
    is(await api('POST', `/resources/${F.course.id}`, { token: F.instr.token, form }), 400);
});
tc('SEC-036', S, 'Medium', 'Audit log cannot be evaded', 'Send a logged action with courseId "x" in the body', 'The action is still logged', async () => {
    const u = await newUser('student', 'evade');
    await api('PUT', '/auth/profile', { token: u.token, body: { bio: 'Hi', courseId: 'not-an-id' } });
    await sleep(150);
    ok(await models.Activity.exists({ user: u.id, action: 'Profile Updated' }), 'the invalid courseId made the log write fail silently');
});
tc('SEC-037', S, 'Medium', 'Impersonation sessions are short', 'Read the expiry of an impersonation token', 'One hour or less (SRS: temporary token)', async () => {
    const { exp, iat } = jwt.decode(F.impToken);
    ok(exp - iat <= 3600, `token lasts ${Math.round((exp - iat) / 86400)} days`);
});
tc('SEC-038', S, 'Medium', 'Impersonated actions stay out of the personal log', 'Act through the impersonation token, read /activities/me', 'The action is hidden and attributed to the admin (FR-AUTH-06)', async () => {
    const count = async () => (await api('GET', `/activities/me?action=${encodeURIComponent('Profile Updated')}`, { token: F.s2.token })).json.total;
    const before = await count();
    await api('PUT', '/auth/profile', { token: F.impToken, body: { bio: 'Set by admin' } });
    await sleep(150);
    eq(await count(), before, 'entries in the student log');
});
tc('SEC-039', S, 'Medium', 'Student notes stay private from teachers', 'Read progress and analytics as the course owner', 'Personal notes are not returned (code comment: "Teachers should not see")', async () => {
    const a = await api('GET', `/courses/${F.course.id}/progress/${F.s1.id}`, { token: F.instr.token });
    const b = await api('GET', `/courses/${F.course.id}/progresses`, { token: F.instr.token });
    ok(!a.text.includes('PRIVATE-NOTE') && !b.text.includes('PRIVATE-NOTE'), 'notes returned to the teacher');
});
tc('SEC-040', S, 'High', 'Peer progress is anonymous', 'Enable allowPeerProgress, GET /courses/:id/peers as a student', 'No names or emails (FR-COURSE-11)', async () => {
    await api('PUT', `/courses/${F.course.id}`, { token: F.instr.token, body: { allowPeerProgress: true } });
    const r = await api('GET', `/courses/${F.course.id}/peers`, { token: F.s1.token });
    is(r, 200); ok(!r.text.includes('@qa.test'), 'classmates\' emails are exposed');
});
tc('SEC-041', S, 'Medium', 'Bad regex in public search is handled', 'GET /marketplace/search?q=(', 'HTTP 200 or 400, not a 500', async () => {
    ok((await api('GET', '/marketplace/search?q=(')).status < 500, 'server error from a public endpoint');
});
tc('SEC-042', S, 'Medium', 'Page size is capped', 'GET /marketplace?limit=100000', 'The returned limit is capped', async () => {
    ok((await api('GET', '/marketplace?limit=100000')).json.pagination.limit <= 100, 'no cap');
});
tc('SEC-043', S, 'Medium', 'Bad paging values are handled', 'GET /marketplace?page=0 and limit=-1', 'HTTP 200 or 400, not a 500', async () => {
    ok((await api('GET', '/marketplace?page=0')).status < 500, 'page=0 server error');
});
tc('SEC-044', S, 'High', 'Draft course landing page is private', 'GET /marketplace/:id for a draft as a guest', 'HTTP 404', async () => is(await api('GET', `/marketplace/${F.draftMkt.id}`), 404));
tc('SEC-045', S, 'Medium', 'Hidden lecture titles stay hidden', 'GET the landing page as a guest', 'Hidden lectures are not listed', async () => {
    ok(!(await api('GET', `/marketplace/${F.course.id}`)).text.includes('SECRET hidden lecture'), 'hidden lecture title is public');
});
tc('SEC-046', S, 'Medium', 'Landing page hides internal fields', 'GET the landing page as a guest', 'No aiBlockedStudents, notificationSettings or adminBlockReason', async () => {
    const r = await api('GET', `/marketplace/${F.course.id}`);
    ok(!('aiBlockedStudents' in r.json.course), 'internal fields are public');
});
tc('SEC-047', S, 'High', 'Profile update cannot change role', 'PUT /auth/profile with role admin', 'Role is unchanged', async () => {
    await api('PUT', '/auth/profile', { token: F.s2.token, body: { role: 'admin', isBlocked: false } });
    eq((await models.User.findById(F.s2.id)).role, 'student', 'role');
});
tc('SEC-048', S, 'High', 'Course update cannot lift an admin block', 'PUT /courses/:id with isAdminBlocked false on a blocked course', 'The block stays', async () => {
    const c = await mkCourse(F.instr);
    await api('POST', `/admin/courses/${c.id}/block`, { token: F.admin.token, body: { reason: 'x' } });
    await api('PUT', `/courses/${c.id}`, { token: F.instr.token, body: { isAdminBlocked: false } });
    eq((await models.Course.findById(c.id)).isAdminBlocked, true, 'isAdminBlocked');
});
tc('SEC-049', S, 'Medium', 'Admins cannot be impersonated', 'POST /admin/impersonate with another admin email', 'Refused', async () => {
    const email = `admin4.${uid()}@qa.test`;
    await models.User.create({ name: 'A4', email, password: 'Qa-' + uid(), role: 'admin' });
    ok((await api('POST', '/admin/impersonate', { token: F.admin.token, body: { email } })).status >= 400, 'admin impersonated another admin');
});
tc('SEC-050', S, 'Low', 'Login does not reveal blocked status without the password', 'Log in to a blocked account with a wrong password', 'HTTP 400 "Invalid credentials"', async () => {
    const u = await newUser('student', 'blk2');
    await api('POST', `/admin/users/${u.id}/block`, { token: F.admin.token, body: { reason: 'Secret reason' } });
    const r = await api('POST', '/auth/login', { body: { email: u.email, password: 'wrong' } });
    is(r, 400);
});
tc('SEC-051', S, 'Critical', 'Role in the Google sign-in body is ignored', 'POST /auth/google with a new identity and role admin in the body', 'Refused, and no admin account is created', async () => {
    const email = `gr.${uid()}@qa.test`;
    await api('POST', '/auth/google', { body: { role: 'admin', code: googleCode({ sub: 'g' + uid(), email, name: 'G', email_verified: true }) } });
    ok(!(await models.User.exists({ email, role: 'admin' })), 'an admin account was created');
});
tc('SEC-052', S, 'High', 'Existing admins can still sign in', 'Log in at /auth/admin/login and with Google at /auth/admin/google', 'HTTP 200 for both', async () => {
    is(await api('POST', '/auth/admin/login', { body: { email: F.admin.email, password: F.admin.password } }), 200, 'password');
    is(await api('POST', '/auth/admin/google', { body: { code: googleCode({ sub: 'g' + uid(), email: F.admin.email, name: 'A', email_verified: true }) } }), 200, 'google');
});
tc('SEC-053', S, 'Critical', 'Disguised script links are rejected', 'Add links using mixed case, spaces, a newline, data: and vbscript:', 'HTTP 400 for each', async () => {
    for (const url of ['JaVaScRiPt:alert(1)', '  javascript:alert(1)', 'java\nscript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)']) {
        is(await api('POST', `/resources/${F.course.id}`, { token: F.instr.token, form: multipart({ url, title: 'XSS' }) }), 400, JSON.stringify(url));
    }
});
tc('SEC-054', S, 'High', 'Normal links still work', 'Add https, http and no-scheme links, and clear a lecture URL', 'All are accepted', async () => {
    for (const url of ['https://example.test/a', 'http://example.test/a', 'www.example.test/a']) {
        is(await api('POST', `/resources/${F.course.id}`, { token: F.instr.token, form: multipart({ url, title: 'Link' }) }), 201, url);
    }
    is(await api('PUT', `/courses/lectures/${F.L1}`, { token: F.instr.token, body: { resourceUrl: 'https://youtu.be/ok' } }), 200, 'lecture');
});
tc('SEC-055', S, 'High', 'Google sign-in codes never reach the activity log', 'Sign in with Google, read the log entry', 'No code stored', async () => {
    const email = `gc.${uid()}@qa.test`;
    const code = googleCode({ sub: 'g' + uid(), email, name: 'G', email_verified: true });
    const r = await api('POST', '/auth/google', { body: { code } });
    await sleep(150);
    ok(!(await models.Activity.exists({ user: r.json._id, 'data.code': code })), 'the sign-in code is stored in Activity.data');
});
tc('SEC-056', S, 'Medium', 'The log keeps useful non-secret fields', 'Create a broadcast, read the log entry', 'title and priority are stored', async () => {
    await api('POST', `/broadcasts/course/${F.course.id}`, { token: F.instr.token, body: { title: 'Logged-' + uid(), message: 'Body', priority: 'important' } });
    await sleep(150);
    const row = await models.Activity.findOne({ user: F.instr.id, action: 'Broadcast Created' }).sort({ createdAt: -1 }).lean();
    eq(row.data.priority, 'important', 'priority');
    ok(!('message' in row.data), 'message body was stored');
});
tc('SEC-057', S, 'High', 'Peer progress detail is anonymous', 'GET /courses/:id/peers/:studentId/progress as a classmate', 'No real name or email in the response', async () => {
    const peers = (await api('GET', `/courses/${F.course.id}/peers`, { token: F.s1.token })).json;
    const r = await api('GET', `/courses/${F.course.id}/peers/${peers[0]._id}/progress`, { token: F.s1.token });
    is(r, 200);
    ok(!r.text.includes('@qa.test') && !r.text.includes('QA student'), 'real identity returned');
});
tc('SEC-058', S, 'High', 'Enrolled students can still use comments', 'POST and GET lecture comments as an enrolled student', 'HTTP 201 and HTTP 200', async () => {
    is(await api('POST', `/courses/lectures/${F.L2}/comments`, { token: F.s1.token, body: { content: 'Hello', courseId: F.course.id } }), 201, 'post');
    is(await api('GET', `/courses/lectures/${F.L2}/comments`, { token: F.s1.token }), 200, 'read');
});
tc('SEC-059', S, 'Medium', 'A new reset request clears the lock', 'Lock a code with wrong tries, request a new one, use it', 'The new code works', async () => {
    const u = await newUser('student', 'relock');
    await api('POST', '/auth/forgot-password', { body: { email: u.email } });
    for (let i = 0; i < 6; i++) await api('POST', '/auth/verify-otp', { body: { email: u.email, otp: '000000' } });
    await api('POST', '/auth/forgot-password', { body: { email: u.email } });
    is(await api('POST', '/auth/verify-otp', { body: { email: u.email, otp: lastOtp(u.email) } }), 200);
});
tc('SEC-060', S, 'High', 'The device that changes the password stays logged in', 'PUT /auth/updatepassword, then use the returned token', 'HTTP 200', async () => {
    const u = await newUser('student', 'stay');
    const r = await api('PUT', '/auth/updatepassword', { token: u.token, body: { currentPassword: u.password, newPassword: 'NewSecret123!' } });
    is(await api('GET', '/auth/me', { token: r.json.token }), 200);
});
tc('SEC-061', S, 'Medium', 'Impersonation ends when the user changes password', 'Impersonate a user, change their password, reuse the token', 'HTTP 401', async () => {
    const u = await newUser('student', 'impend');
    const imp = await api('POST', '/admin/impersonate', { token: F.admin.token, body: { email: u.email } });
    await api('PUT', '/auth/updatepassword', { token: u.token, body: { currentPassword: u.password, newPassword: 'NewSecret123!' } });
    is(await api('GET', '/auth/me', { token: imp.json.token }), 401);
});
tc('QZ-026', 'Quizzes', 'High', 'A quiz in a blocked course cannot be started', 'Block a course, then start its quiz as an enrolled student', 'HTTP 403', async () => {
    const c = await mkCourse(F.instr);
    await enroll(F.instr, c.id, F.s1);
    const q = await api('POST', '/quizzes', { token: F.instr.token, body: { courseId: c.id, title: 'Q', questions: [{ questionText: 'x', correctAnswer: 0, options: ['a', 'b'] }] } });
    await api('POST', `/admin/courses/${c.id}/block`, { token: F.admin.token, body: { reason: 'qa' } });
    is(await api('POST', `/quizzes/${q.json._id}/start`, { token: F.s1.token }), 403);
});
tc('AI-028', 'AI features', 'High', 'AI true/false answers are saved as true or false', 'POST /ai/generate-quiz and read the answer type', 'correctAnswer is a boolean', async () => {
    const r = await api('POST', '/ai/generate-quiz', { token: F.instr.token, body: { courseId: F.course.id, topic: 'Testing' } });
    eq(typeof r.json.questions[0].correctAnswer, 'boolean', 'answer type');
});
tc('PAY-032', 'Payments', 'Critical', 'A removed buyer gets access back without paying twice', 'Buy, get removed, check out again', 'enrolled true, no new Stripe session, count back to 1', async () => {
    const u = await newUser('student', 'noagain');
    const c = await mkCourse(F.instr);
    await buy(u, c, F.instr);
    await api('DELETE', `/courses/${c.id}/enroll/${u.id}`, { token: F.instr.token });
    const before = lines('stripe.jsonl').length;
    const r = await api('POST', '/purchase/checkout', { token: u.token, body: { courseId: c.id } });
    is(r, 200); eq(r.json.enrolled, true, 'enrolled');
    eq(lines('stripe.jsonl').length, before, 'Stripe sessions');
    eq((await models.Course.findById(c.id)).enrollmentCount, 1, 'enrollmentCount');
});
tc('PAY-033', 'Payments', 'High', 'Refunding a removed buyer does not lower the count twice', 'Buy, get removed, send a full refund', 'enrollmentCount stays 0', async () => {
    const u = await newUser('student', 'twice');
    const c = await mkCourse(F.instr);
    const s = await buy(u, c, F.instr);
    await api('DELETE', `/courses/${c.id}/enroll/${u.id}`, { token: F.instr.token });
    await webhook('charge.refunded', { refunded: true, payment_intent: s.payment_intent });
    eq((await models.Course.findById(c.id)).enrollmentCount, 0, 'enrollmentCount');
});
tc('TCH-015', 'Co-instructors', 'High', 'A co-instructor without manage_content cannot edit lectures', 'PUT and DELETE a lecture as a co-instructor with no permissions', 'HTTP 403', async () => {
    const c = await mkCourse(F.instr);
    const u = await newUser('student', 'noperm');
    await api('POST', `/courses/${c.id}/teachers`, { token: F.instr.token, body: { email: u.email } });
    is(await api('PUT', `/courses/lectures/${c.lectureId}`, { token: u.token, body: { title: 'x' } }), 403, 'edit');
    is(await api('DELETE', `/courses/lectures/${c.lectureId}`, { token: u.token }), 403, 'delete');
});
tc('NTF-010', 'Notifications', 'Medium', 'A co-instructor with manage_students can notify the course', 'POST /notifications/course/:id/send as that co-instructor', 'HTTP 200', async () => {
    const c = await mkCourse(F.instr);
    const u = await newUser('teacher', 'notifier');
    await api('POST', `/courses/${c.id}/teachers`, { token: F.instr.token, body: { email: u.email, permissions: { manage_students: true } } });
    is(await api('POST', `/notifications/course/${c.id}/send`, { token: u.token, body: { title: 'Hi' } }), 200);
});
const retakeQuiz = async (attemptsAllowed) => {
    const q = await api('POST', '/quizzes', { token: F.instr.token, body: { courseId: F.course.id, title: 'Retake', attemptsAllowed, questions: [{ questionText: 'Pick B', options: ['A', 'B'], correctAnswer: 1 }] } });
    const a = (await api('POST', `/quizzes/${q.json._id}/start`, { token: F.s1.token })).json.attempt._id;
    const r = await api('POST', `/quizzes/${q.json._id}/submit`, { token: F.s1.token, body: { attemptId: a, answers: [{ questionIndex: 0, answer: 0 }] } });
    return { attempt: a, submit: r };
};
tc('QZ-027', 'Quizzes', 'High', 'A finished attempt hides answers while retries remain', 'Submit on a two-attempt quiz, then GET /quizzes/attempts/:id as the student', 'No correctAnswer; the student still sees which answers were wrong', async () => {
    const { attempt, submit } = await retakeQuiz(2);
    ok(!submit.text.includes('correctAnswer'), 'answers in the submit response');
    const r = await api('GET', `/quizzes/attempts/${attempt}`, { token: F.s1.token });
    is(r, 200); ok(!r.text.includes('correctAnswer'), 'answers in the attempt result');
    eq(submit.json.attempt.answers[0].isCorrect, false, 'isCorrect');
});
tc('QZ-028', 'Quizzes', 'High', 'Answers are shown once no attempts remain', 'Use the only attempt on a one-attempt quiz', 'Correct answers are returned for review', async () => {
    const { attempt, submit } = await retakeQuiz(1);
    ok(submit.text.includes('correctAnswer'), 'no answers in the submit response');
    ok((await api('GET', `/quizzes/attempts/${attempt}`, { token: F.s1.token })).text.includes('correctAnswer'), 'no answers in the attempt result');
});
tc('QZ-029', 'Quizzes', 'Medium', 'The instructor can always see answers on an attempt', 'GET an attempt as the owner while the student can still retake', 'correctAnswer is returned', async () => {
    const { attempt } = await retakeQuiz(2);
    ok((await api('GET', `/quizzes/attempts/${attempt}`, { token: F.instr.token })).text.includes('correctAnswer'), 'answers hidden from the owner');
});
tc('AI-029', 'AI features', 'High', 'A plain chat never spends the instructor key', 'As an enrolled student with no key, send a message in a normal course chat', 'Refused, and no AI call is made', async () => {
    const u = await newUser('student', 'nokey2');
    await enroll(F.instr, F.course.id, u);
    const c = await api('POST', '/student-ai/conversations', { token: u.token, body: { courseId: F.course.id } });
    const before = lines('ai.jsonl').length;
    const r = await api('POST', `/student-ai/conversations/${c.json._id}/messages`, { token: u.token, form: multipart({ message: 'Hi' }) });
    ok(r.status >= 400, `the chat was answered (HTTP ${r.status})`);
    eq(lines('ai.jsonl').length, before, 'AI calls');
});
tc('SEC-062', S, 'Medium', 'Reset code hash is hidden from admin lists too', 'Request a reset, then GET /admin/users', 'No otpHash, otpExpiry or otpAttempts in the response', async () => {
    const u = await newUser('student', 'adminhash');
    await api('POST', '/auth/forgot-password', { body: { email: u.email } });
    const r = await api('GET', '/admin/users', { token: F.admin.token });
    ok(r.text.includes(u.email), 'user missing');
    ok(!/otpHash|otpExpiry|otpAttempts/.test(r.text), 'reset fields returned');
});
tc('SEC-063', S, 'Medium', 'Search treats special characters as plain text', 'GET /marketplace/search?q=.*', 'HTTP 200 with no results, and normal search still works', async () => {
    eq((await api('GET', `/marketplace/search?q=${encodeURIComponent('.*')}`)).json.courses.length, 0, 'matches for .*');
    ok((await api('GET', '/marketplace/search?q=Main')).json.courses.length > 0, 'normal search broken');
});
tc('SEC-064', S, 'High', 'The landing page still shows public lectures', 'GET /marketplace/:id as a guest', 'Public and preview lectures are listed, with price and instructor', async () => {
    const r = await api('GET', `/marketplace/${F.course.id}`);
    is(r, 200);
    ok(r.json.course.sections[0].lectures.some(l => l._id === F.L1), 'preview lecture missing');
    eq(r.json.course.price, 5000, 'price');
    ok(r.json.instructor?.name, 'instructor missing');
});
tc('SEC-065', S, 'Medium', 'The course list keeps what a user should see', 'GET /courses as the owner and as an enrolled student', 'The owner sees their own draft; the student sees their course', async () => {
    const draft = await mkCourse(F.instr, { status: 'Draft' });
    ok((await api('GET', '/courses', { token: F.instr.token })).json.some(c => c._id === draft.id), 'own draft missing');
    ok((await api('GET', '/courses', { token: F.s1.token })).json.some(c => c._id === F.course.id), 'enrolled course missing');
    ok(!(await api('GET', '/courses', { token: F.s1.token })).json.some(c => c._id === draft.id), 'draft shown to a student');
});
tc('SEC-066', S, 'High', 'Impersonated actions are recorded against the admin', 'Act through an impersonation token, read the global log', 'The entry belongs to the admin and names the impersonated user', async () => {
    const u = await newUser('student', 'audited');
    const imp = await api('POST', '/admin/impersonate', { token: F.admin.token, body: { email: u.email } });
    await api('PUT', '/auth/profile', { token: imp.json.token, body: { bio: 'Support change' } });
    await sleep(150);
    const row = await models.Activity.findOne({ action: 'Profile Updated', details: new RegExp(`Impersonating ${u.email.replace(/\./g, '\\.')}`) }).lean();
    ok(row, 'no audit entry');
    eq(String(row.user), F.admin.id, 'entry owner');
});
tc('SEC-067', S, 'Medium', 'Course analytics hide private notes', 'Read recent activity as the course owner after a student saves a note', 'The note text is not returned', async () => {
    await api('PUT', `/courses/lectures/${F.L2}/progress`, { token: F.s1.token, body: { notes: 'ANALYTICS-PRIVATE' } });
    await sleep(150);
    const r = await api('GET', `/courses/${F.course.id}/analytics`, { token: F.instr.token });
    is(r, 200); ok(!r.text.includes('ANALYTICS-PRIVATE'), 'note returned');
});
tc('SEC-068', S, 'High', 'Teachers still see student progress status', 'GET progress detail and progress list as the owner', 'Lecture statuses are returned', async () => {
    const a = await api('GET', `/courses/${F.course.id}/progress/${F.s1.id}`, { token: F.instr.token });
    is(a, 200); ok(a.json.sections.some(s => s.lectures.some(l => l.status === 'Completed')), 'status missing');
    ok((await api('GET', `/courses/${F.course.id}/progresses`, { token: F.instr.token })).json.some(p => p.completedLectures.length > 0), 'progress missing');
});
tc('SEC-069', S, 'Medium', 'Admins can still block other users', 'Block a student as an admin', 'HTTP 200', async () => {
    const u = await newUser('student', 'stillblock');
    is(await api('POST', `/admin/users/${u.id}/block`, { token: F.admin.token, body: { reason: 'qa' } }), 200);
});
tc('RES-015', 'Resources', 'High', 'Sinhala file names download correctly', 'Upload පාඩම.pdf, then download and view it', 'HTTP 200 with the real name in the header', async () => {
    const form = multipart({ title: 'Sinhala' }, { name: 'පාඩම.pdf', type: 'application/pdf', data: Buffer.from('%PDF-1.4') });
    const up = await api('POST', `/resources/${F.course.id}`, { token: F.instr.token, form });
    for (const route of ['download', 'view']) {
        const r = await api('GET', `/resources/${F.course.id}/${up.json._id}/${route}`, { token: F.s1.token });
        is(r, 200, route);
        ok(r.headers.get('content-disposition').includes(encodeURIComponent('පාඩම.pdf')), 'name missing');
    }
});
tc('BRD-011', 'Broadcasts', 'High', 'Hidden and draft content is not announced', 'Add a hidden lecture, a hidden section, and content to a draft course', 'No broadcast is created', async () => {
    const c = await mkCourse(F.instr);
    const count = (id) => models.Broadcast.countDocuments({ course: id });
    const before = await count(c.id);
    await addLecture(F.instr, c.id, c.sectionId, 'Hidden', { isPublic: false });
    await addSection(F.instr, c.id, 'Hidden section', false);
    eq(await count(c.id), before, 'broadcasts for hidden content');
    const d = await mkCourse(F.instr, { status: 'Draft' });
    eq(await count(d.id), 0, 'broadcasts for a draft course');
});
tc('BRD-012', 'Broadcasts', 'High', 'A custom announcement replaces the automatic one', 'Add a lecture with broadcastMessage and priority urgent', 'Exactly one broadcast, with that message, that priority and a direct link', async () => {
    const c = await mkCourse(F.instr);
    const auto = await models.Broadcast.findOne({ course: c.id, title: /New Lecture/ }).lean();
    ok(auto.message.includes(`/course/${c.id}/lecture/${c.lectureId}`), 'no direct link');
    ok(auto.message.includes('Section'), 'no section name');
    const custom = await addLecture(F.instr, c.id, c.sectionId, 'Custom', { broadcastMessage: 'Read this first', broadcastPriority: 'urgent' });
    const rows = await models.Broadcast.find({ course: c.id, title: 'New Lecture: Custom' }).lean();
    eq(rows.length, 1, 'broadcasts'); ok(rows[0].message.startsWith('Read this first') && rows[0].message.includes(`/lecture/${custom}`), 'message'); eq(rows[0].priority, 'urgent', 'priority');
});
tc('NTF-011', 'Notifications', 'Medium', 'A milestone is sent once', 'Complete a lecture, set it back, complete it again on a course with two visible lectures and one hidden', 'One 50 percent notification in total, so re-ticking repeats nothing and hidden lectures do not count', async () => {
    const c = await mkCourse(F.instr);
    await addLecture(F.instr, c.id, c.sectionId, 'Second');
    await addLecture(F.instr, c.id, c.sectionId, 'Hidden', { isPublic: false });
    const u = await newUser('student', 'mile');
    await enroll(F.instr, c.id, u);
    await api('PUT', `/notifications/course/${c.id}/settings`, { token: F.instr.token, body: { progressMilestone: true } });
    for (const status of ['Completed', 'In Progress', 'Completed']) {
        await api('PUT', `/courses/lectures/${c.lectureId}/progress`, { token: u.token, body: { status } });
    }
    await sleep(150);
    const rows = await models.Notification.find({ course: c.id, type: 'milestone', user: u.id }).lean();
    eq(rows.length, 1, 'notifications');
    ok(rows[0].title.includes('50%'), `title: ${rows[0].title}`);
});
tc('CPN-024', 'Coupons', 'Medium', 'Valid coupon updates still work', 'PUT a coupon to 20 percent with a usage limit', 'HTTP 200 and the values are saved', async () => {
    const c = await mkCourse(F.instr, { price: 1000 });
    const r = await api('POST', '/coupons', { token: F.instr.token, body: { code: 'OK' + uid(), courseId: c.id, discountType: 'percentage', discountValue: 10, validUntil: new Date(Date.now() + 864e5).toISOString() } });
    is(r, 201);
    const u = await api('PUT', `/coupons/${r.json._id}`, { token: F.instr.token, body: { discountValue: 20, maxUses: 5 } });
    is(u, 200); eq(u.json.discountValue, 20, 'discountValue'); eq(u.json.maxUses, 5, 'maxUses');
});
tc('CPN-025', 'Coupons', 'Medium', 'Discounted price keeps exact cents', 'Validate a 10 percent coupon on a USD 19.99 course', 'discountAmount 2, finalPrice 17.99', async () => {
    const c = await mkCourse(F.instr, { price: 19.99, currency: 'USD' });
    const r = await api('POST', '/coupons', { token: F.instr.token, body: { code: 'US' + uid(), courseId: c.id, discountType: 'percentage', discountValue: 10, validUntil: new Date(Date.now() + 864e5).toISOString() } });
    const v = await api('POST', '/coupons/validate', { token: F.s3.token, body: { code: r.json.code, courseId: c.id } });
    eq(v.json.discountAmount, 2, 'discountAmount'); eq(v.json.finalPrice, 17.99, 'finalPrice');
});
tc('CRS-027', 'Course management', 'High', 'The owner can still delete a course, and it cleans up', 'Add a coupon, resource and co-instructor, then DELETE as the owner', 'HTTP 200 and the related records are gone', async () => {
    const c = await mkCourse(F.instr);
    await api('POST', '/coupons', { token: F.instr.token, body: { code: 'GO' + uid(), courseId: c.id, discountType: 'percentage', discountValue: 10, validUntil: new Date(Date.now() + 864e5).toISOString() } });
    await api('POST', `/resources/${c.id}`, { token: F.instr.token, form: multipart({ url: 'https://example.test/a', title: 'L' }) });
    is(await api('DELETE', `/courses/${c.id}`, { token: F.instr.token }), 200);
    eq(await models.Coupon.countDocuments({ course: c.id }), 0, 'coupons');
    eq(await models.Resource.countDocuments({ course: c.id }), 0, 'resources');
    eq(await models.Broadcast.countDocuments({ course: c.id }), 0, 'broadcasts');
});
tc('PRG-012', 'Lecture progress', 'Medium', 'A status change still updates the completion time', 'Move a lecture to In Progress, then Completed', 'completedAt changes', async () => {
    const c = await mkCourse(F.instr);
    const u = await newUser('student', 'time');
    await enroll(F.instr, c.id, u);
    const read = async () => (await api('GET', `/courses/${c.id}/my-progress`, { token: u.token })).json.completedLectures[0].completedAt;
    await api('PUT', `/courses/lectures/${c.lectureId}/progress`, { token: u.token, body: { status: 'In Progress' } });
    const first = await read();
    await sleep(20);
    await api('PUT', `/courses/lectures/${c.lectureId}/progress`, { token: u.token, body: { status: 'Completed' } });
    ok(await read() !== first, 'completedAt did not change');
});
tc('REV-016', 'Reviews', 'Medium', 'Enrolled students can review private courses', 'Enroll in a private course, then POST a review', 'HTTP 201', async () => {
    const c = await api('POST', '/courses', { token: F.instr.token, body: { title: 'Private 2', description: 'D' } });
    await enroll(F.instr, c.json._id, F.s1);
    is(await api('POST', '/reviews', { token: F.s1.token, body: { courseId: c.json._id, rating: 5 } }), 201);
});
tc('REV-017', 'Reviews', 'Low', 'Voter lists stay private', 'Read reviews as a guest after a helpful vote', 'helpfulBy is not returned', async () => {
    ok(!(await api('GET', `/reviews/course/${F.payCourse.id}`)).text.includes('helpfulBy'), 'voter ids returned');
});
tc('MKT-011', 'Marketplace', 'High', 'The language filter finds matching courses', 'Publish a Sinhala course, then filter by Sinhala', 'Only that course is returned', async () => {
    const r = await api('POST', '/instructor/course', { token: F.instr.token, body: { title: 'සිංහල', description: 'D', price: 10, language: 'Sinhala' } });
    await api('PUT', `/instructor/course/${r.json._id}`, { token: F.instr.token, body: { status: 'Published' } });
    const list = (await api('GET', '/marketplace?language=Sinhala')).json.courses;
    eq(list.length, 1, 'courses'); eq(list[0].language, 'Sinhala', 'language');
    await api('DELETE', `/courses/${r.json._id}`, { token: F.instr.token });
});
tc('ACT-009', 'Activity log', 'Medium', 'Refused actions are recorded as failed', 'Attempt a forbidden course update, read the log', 'An entry marked Failed exists', async () => {
    const u = await newUser('student', 'failedlog');
    await api('PUT', `/courses/${F.course.id}`, { token: u.token, body: { title: 'x' } });
    await sleep(150);
    ok(await models.Activity.exists({ user: u.id, action: 'Failed: Course Updated' }), 'no failed entry');
});

const E = 'Error handling';
tc('ERR-001', E, 'High', 'Health check', 'GET /health', 'HTTP 200', async () => is(await api('GET', '/health'), 200));
tc('ERR-002', E, 'Medium', 'Invalid id is a client error', 'GET /courses/not-an-id', 'HTTP 400 or 404', async () => {
    ok([400, 404].includes((await api('GET', '/courses/not-an-id', { token: F.s1.token })).status), 'server error');
});
tc('ERR-003', E, 'Medium', 'Malformed JSON is a client error', 'POST invalid JSON to /auth/login', 'HTTP 400', async () => {
    is(await api('POST', '/auth/login', { raw: '{bad', headers: { 'Content-Type': 'application/json' } }), 400);
});
tc('ERR-004', E, 'Low', 'Unknown API route returns JSON', 'GET /api/nope', 'HTTP 404 with a JSON body (NFR-REL-03)', async () => {
    const r = await api('GET', '/nope');
    is(r, 404); ok(r.json, 'HTML response');
});
tc('ERR-006', E, 'High', 'Intended error messages reach the user', 'Send an invalid token in production mode', 'The real message is returned, not a generic one', async () => {
    const h = ip();
    const r = await prod('GET', '/admin/dashboard', { headers: h, token: 'bad' });
    is(r, 401);
    ok(/token/i.test(r.json.message), `message: ${r.json.message}`);
});
tc('ERR-005', E, 'Medium', 'Validation failures are client errors', 'POST /instructor/course with level "Banana"', 'HTTP 400', async () => {
    is(await api('POST', '/instructor/course', { token: F.instr.token, body: { title: 'T', description: 'D', price: 1, level: 'Banana' } }), 400);
});
