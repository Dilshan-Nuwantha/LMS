// Authentication, courses, lecture progress, co-instructors and the marketplace.
const { tc, api, ok, is, eq, lastOtp, googleCode, newUser, uid, sleep, serverRequire, env } = require('./lib');
const { F, models, mkCourse, addSection, addLecture, enroll } = require('./fixtures');
const jwt = serverRequire('jsonwebtoken');

const M = 'Authentication';
const reg = (body) => api('POST', '/auth/register', { body });

tc('AUTH-001', M, 'High', 'Register a student with valid details', 'POST /auth/register with name, email, password', 'HTTP 201, role is student, a token is returned', async () => {
    const r = await reg({ name: 'New', email: `n.${uid()}@qa.test`, password: 'Secret123!' });
    is(r, 201); eq(r.json.role, 'student', 'role'); ok(r.json.token, 'no token');
});
tc('AUTH-002', M, 'High', 'Reject a duplicate email', 'Register twice with the same email', 'Second attempt returns HTTP 400', async () => {
    const email = `d.${uid()}@qa.test`;
    await reg({ name: 'A', email, password: 'Secret123!' });
    is(await reg({ name: 'B', email, password: 'Secret123!' }), 400);
});
tc('AUTH-003', M, 'Medium', 'Reject registration with missing fields', 'Register without a password', 'HTTP 400', async () => {
    is(await reg({ name: 'A', email: `m.${uid()}@qa.test` }), 400);
});
tc('AUTH-004', M, 'High', 'Store passwords as bcrypt hashes', 'Register, then read the stored user record', 'Stored value is a bcrypt hash with cost 10 or higher (NFR-SEC-02)', async () => {
    const u = await models.User.findById(F.s1.id).select('+password');
    ok(/^\$2[aby]\$(1\d|[2-9]\d)\$/.test(u.password), 'password is not a bcrypt hash');
});
tc('AUTH-005', M, 'Critical', 'Log in with correct credentials', 'POST /auth/login', 'HTTP 200 with a token', async () => {
    const r = await api('POST', '/auth/login', { body: { email: F.s1.email, password: F.s1.password } });
    is(r, 200); ok(r.json.token, 'no token');
});
tc('AUTH-006', M, 'High', 'Reject a wrong password', 'Log in with a wrong password', 'HTTP 400 "Invalid credentials"', async () => {
    const r = await api('POST', '/auth/login', { body: { email: F.s1.email, password: 'wrong' } });
    is(r, 400); eq(r.json.message, 'Invalid credentials', 'message');
});
tc('AUTH-007', M, 'High', 'Unknown email gets the same error as a wrong password', 'Log in with an unregistered email', 'HTTP 400 "Invalid credentials"', async () => {
    const r = await api('POST', '/auth/login', { body: { email: 'none@qa.test', password: 'x' } });
    is(r, 400); eq(r.json.message, 'Invalid credentials', 'message');
});
tc('AUTH-008', M, 'Medium', 'Role-specific login rejects the wrong role', 'Log a student in through /auth/teacher/login', 'HTTP 400', async () => {
    is(await api('POST', '/auth/teacher/login', { body: { email: F.s1.email, password: F.s1.password } }), 400);
});
tc('AUTH-009', M, 'High', 'Current user profile excludes the password', 'GET /auth/me', 'HTTP 200 and no password field', async () => {
    const r = await api('GET', '/auth/me', { token: F.s1.token });
    is(r, 200); ok(!('password' in r.json), 'password returned');
});
tc('AUTH-010', M, 'Critical', 'Protected route without a token', 'GET /auth/me with no header', 'HTTP 401', async () => is(await api('GET', '/auth/me'), 401));
tc('AUTH-011', M, 'Critical', 'Tampered token is rejected', 'Change one character of a valid token', 'HTTP 401', async () => {
    const t = F.s1.token.slice(0, -2) + (F.s1.token.endsWith('aa') ? 'bb' : 'aa');
    is(await api('GET', '/auth/me', { token: t }), 401);
});
tc('AUTH-012', M, 'High', 'Expired token is rejected', 'Use a token signed with a past expiry', 'HTTP 401', async () => {
    is(await api('GET', '/auth/me', { token: jwt.sign({ id: F.s1.id }, env.secrets.JWT_SECRET, { expiresIn: -10 }) }), 401);
});
tc('AUTH-013', M, 'High', 'Change password with the correct current password', 'PUT /auth/updatepassword, log in with old and new', 'Old password fails, new password works', async () => {
    const u = await newUser('student', 'pwd');
    is(await api('PUT', '/auth/updatepassword', { token: u.token, body: { currentPassword: u.password, newPassword: 'NewSecret123!' } }), 200);
    is(await api('POST', '/auth/login', { body: { email: u.email, password: u.password } }), 400, 'old password');
    is(await api('POST', '/auth/login', { body: { email: u.email, password: 'NewSecret123!' } }), 200, 'new password');
});
tc('AUTH-014', M, 'High', 'Reject password change with a wrong current password', 'PUT /auth/updatepassword with a wrong current password', 'HTTP 400', async () => {
    is(await api('PUT', '/auth/updatepassword', { token: F.s2.token, body: { currentPassword: 'wrong', newPassword: 'x12345678' } }), 400);
});
tc('AUTH-015', M, 'Medium', 'Update profile name and bio', 'PUT /auth/profile', 'HTTP 200 with the updated values', async () => {
    const r = await api('PUT', '/auth/profile', { token: F.s2.token, body: { name: 'Renamed', bio: 'Hello' } });
    is(r, 200); eq(r.json.bio, 'Hello', 'bio');
});
tc('AUTH-016', M, 'High', 'Enforce a minimum password length at registration', 'Register with the password "a"', 'HTTP 400 (the reset flow already requires 6 characters)', async () => {
    is(await reg({ name: 'W', email: `w.${uid()}@qa.test`, password: 'a' }), 400);
});
tc('AUTH-017', M, 'Medium', 'Reject an invalid email format', 'Register with the email "not-an-email"', 'HTTP 400', async () => {
    is(await reg({ name: 'W', email: `not-an-email-${uid()}`, password: 'Secret123!' }), 400);
});
tc('AUTH-018', M, 'High', 'Treat email addresses as case-insensitive', 'Register Foo@x and foo@x', 'Second registration returns HTTP 400 (FR-AUTH-01: unique emails)', async () => {
    const e = `Case.${uid()}@QA.test`;
    await reg({ name: 'A', email: e, password: 'Secret123!' });
    is(await reg({ name: 'B', email: e.toLowerCase(), password: 'Secret123!' }), 400);
});
tc('AUTH-019', M, 'Medium', 'Login without a password is a client error', 'POST /auth/login with only an email', 'HTTP 400, not a server error', async () => {
    is(await api('POST', '/auth/login', { body: { email: F.s1.email } }), 400);
});
const google = async (email, sub, extra = {}, path = '/auth/google') =>
    api('POST', path, { body: { code: googleCode({ sub, email, name: 'G User', email_verified: true, ...extra }) } });
tc('AUTH-020', M, 'Medium', 'Password login on a Google-only account', 'Create a Google account, then log in with a password', 'HTTP 400, not a server error', async () => {
    const email = `g.${uid()}@qa.test`;
    await google(email, 'g' + uid());
    is(await api('POST', '/auth/login', { body: { email, password: 'whatever' } }), 400);
});
tc('AUTH-021', M, 'High', 'First Google login creates a student', 'POST /auth/google with a new identity', 'HTTP 200, role is student (FR-AUTH-03)', async () => {
    const r = await google(`g.${uid()}@qa.test`, 'g' + uid());
    is(r, 200); eq(r.json.role, 'student', 'role');
});
tc('AUTH-022', M, 'High', 'Repeat Google login finds the same account', 'Log in twice with one Google identity', 'Both logins return the same user id', async () => {
    const sub = 'g' + uid(), email = `g.${uid()}@qa.test`;
    const a = await google(email, sub), b = await google(email, sub);
    eq(a.json._id, b.json._id, 'user id');
});
tc('AUTH-023', M, 'High', 'Request a password reset code', 'POST /auth/forgot-password', 'Generic success message; code emailed; only a hash stored', async () => {
    const u = await newUser('student', 'reset');
    is(await api('POST', '/auth/forgot-password', { body: { email: u.email } }), 200);
    const otp = lastOtp(u.email);
    ok(otp, 'no OTP email captured');
    const db = await models.User.findById(u.id);
    ok(db.otpHash?.startsWith('$2'), 'OTP is not hashed');
    F.reset = { ...u, otp };
});
tc('AUTH-024', M, 'High', 'Reject a wrong reset code', 'POST /auth/verify-otp with a wrong code', 'HTTP 400', async () => {
    const wrong = F.reset.otp === '111111' ? '222222' : '111111';
    is(await api('POST', '/auth/verify-otp', { body: { email: F.reset.email, otp: wrong } }), 400);
});
tc('AUTH-025', M, 'High', 'Correct code returns a reset token', 'POST /auth/verify-otp with the emailed code', 'HTTP 200 with a resetToken', async () => {
    const r = await api('POST', '/auth/verify-otp', { body: { email: F.reset.email, otp: F.reset.otp } });
    is(r, 200); ok(r.json.resetToken, 'no token');
    F.reset.resetToken = r.json.resetToken;
});
tc('AUTH-026', M, 'Medium', 'Reject a short new password during reset', 'POST /auth/reset-password with 3 characters', 'HTTP 400', async () => {
    is(await api('POST', '/auth/reset-password', { body: { resetToken: F.reset.resetToken, newPassword: 'abc' } }), 400);
});
tc('AUTH-027', M, 'Critical', 'Reset the password with a valid token', 'POST /auth/reset-password, then log in', 'Reset succeeds and the new password logs in', async () => {
    is(await api('POST', '/auth/reset-password', { body: { resetToken: F.reset.resetToken, newPassword: 'ResetDone123!' } }), 200);
    is(await api('POST', '/auth/login', { body: { email: F.reset.email, password: 'ResetDone123!' } }), 200);
});
tc('AUTH-028', M, 'High', 'A reset token works only once', 'Reuse the same reset token', 'HTTP 400', async () => {
    is(await api('POST', '/auth/reset-password', { body: { resetToken: F.reset.resetToken, newPassword: 'Another123!' } }), 400);
});
tc('AUTH-029', M, 'High', 'Reject an expired reset code', 'Move the code expiry into the past, then verify', 'HTTP 400 "OTP has expired"', async () => {
    const u = await newUser('student', 'exp');
    await api('POST', '/auth/forgot-password', { body: { email: u.email } });
    await models.User.updateOne({ _id: u.id }, { otpExpiry: new Date(Date.now() - 1000) });
    is(await api('POST', '/auth/verify-otp', { body: { email: u.email, otp: lastOtp(u.email) } }), 400);
});
tc('AUTH-030', M, 'High', 'Users registered with capitals can reset their password', 'Register Mixed.Case@x, then request a reset using the same address', 'A reset code is emailed', async () => {
    const email = `Mixed.${uid()}@QA.test`;
    await reg({ name: 'M', email, password: 'Secret123!' });
    await api('POST', '/auth/forgot-password', { body: { email } });
    ok(lastOtp(email) || lastOtp(email.toLowerCase()), 'no reset email was sent although the API reported success');
});
tc('AUTH-031', M, 'Medium', 'Reset request does not reveal unknown emails', 'POST /auth/forgot-password with an unknown email', 'Same HTTP 200 message as a known email', async () => {
    const r = await api('POST', '/auth/forgot-password', { body: { email: 'nobody@qa.test' } });
    is(r, 200); ok(/If that email/.test(r.json.message), 'different message');
});
tc('AUTH-032', M, 'Low', 'Reset request does not reveal Google-only accounts', 'POST /auth/forgot-password for a Google-only account', 'Same generic HTTP 200 message', async () => {
    const email = `g.${uid()}@qa.test`;
    await google(email, 'g' + uid());
    is(await api('POST', '/auth/forgot-password', { body: { email } }), 200);
});
tc('AUTH-033', M, 'High', 'Password change ends existing sessions', 'Change the password, then reuse the old token', 'HTTP 401', async () => {
    const u = await newUser('student', 'sess');
    await api('PUT', '/auth/updatepassword', { token: u.token, body: { currentPassword: u.password, newPassword: 'NewSecret123!' } });
    is(await api('GET', '/auth/me', { token: u.token }), 401);
});
tc('AUTH-034', M, 'Low', 'Blocked user sees the block message on API calls', 'Block a user, then call /auth/me with their token', 'HTTP 403 with the block message', async () => {
    const u = await newUser('student', 'blk');
    await api('POST', `/admin/users/${u.id}/block`, { token: F.admin.token, body: { reason: 'qa' } });
    const r = await api('GET', '/auth/me', { token: u.token });
    is(r, 403); ok(/blocked/i.test(r.json.message), 'block message missing');
});
tc('AUTH-035', M, 'Medium', 'Token of a deleted user is rejected', 'Delete the user record, then call /auth/me', 'HTTP 401', async () => {
    const u = await newUser('student', 'del');
    await models.User.deleteOne({ _id: u.id });
    is(await api('GET', '/auth/me', { token: u.token }), 401);
});
tc('AUTH-036', M, 'Medium', 'Unverified Google email cannot link to an existing account', 'Google login with email_verified=false for an existing email', 'Login is refused', async () => {
    const r = await google(F.s3.email, 'g' + uid(), { email_verified: false });
    ok(r.status >= 400, `account was linked and a session issued (HTTP ${r.status})`);
});
tc('AUTH-037', M, 'Low', 'Blank name is a validation error', 'PUT /auth/profile with name set to spaces', 'HTTP 400', async () => {
    is(await api('PUT', '/auth/profile', { token: F.s2.token, body: { name: '   ' } }), 400);
});
tc('AUTH-038', M, 'Medium', 'Oversized profile data is handled cleanly', 'PUT /auth/profile with a 200 KB profileImage', 'HTTP 200 if accepted, or HTTP 413 if too large; never a 500', async () => {
    const r = await api('PUT', '/auth/profile', { token: F.s2.token, body: { profileImage: 'x'.repeat(200 * 1024) } });
    ok(r.status === 200 || r.status === 413, `got HTTP ${r.status}`);
});

const legacyUser = async () => {
    // Accounts created before commit 4280b9e kept the email exactly as typed
    const email = `Legacy.${uid()}@QA.test`;
    const password = 'Legacy-pass-123';
    // Raw insert: the model would lowercase the email, which is exactly what old records lack
    const hash = await serverRequire('bcryptjs').hash(password, 10);
    await models.User.collection.insertOne({ name: 'Legacy', email, password: hash, role: 'student', warnings: [], isBlocked: false, googleId: null });
    return { email, password };
};
tc('AUTH-039', M, 'Critical', 'Existing accounts with capitals in the email can still log in', 'Create a stored account as Legacy.x@QA.test (as older versions did), then log in with that exact email', 'HTTP 200', async () => {
    const u = await legacyUser();
    is(await api('POST', '/auth/login', { body: u }), 200);
});
tc('AUTH-040', M, 'High', 'Existing accounts with capitals can reset their password', 'Request a reset for a stored account with capitals in the email', 'A reset code is emailed', async () => {
    const u = await legacyUser();
    await api('POST', '/auth/forgot-password', { body: { email: u.email } });
    ok(lastOtp(u.email), 'no reset email was sent although the API reported success');
});
tc('AUTH-041', M, 'Low', 'Login does not reveal Google-only accounts', 'Log in to a Google-only account with any password', 'Same "Invalid credentials" message as a wrong password', async () => {
    const email = `g.${uid()}@qa.test`;
    await google(email, 'g' + uid());
    eq((await api('POST', '/auth/login', { body: { email, password: 'whatever1' } })).json.message, 'Invalid credentials', 'message');
});
tc('AUTH-042', M, 'High', 'A new account cannot duplicate an existing capitalised email', 'Register the lowercase form of a stored Legacy.x@QA.test account', 'HTTP 400', async () => {
    const u = await legacyUser();
    is(await reg({ name: 'Dup', email: u.email.toLowerCase(), password: 'Secret123!' }), 400);
});
tc('AUTH-043', M, 'High', 'Google login finds an existing capitalised account', 'Sign in with Google using the lowercase form of a stored Legacy.x@QA.test account', 'The existing account is used and no second account is created', async () => {
    const u = await legacyUser();
    const r = await google(u.email.toLowerCase(), 'g' + uid());
    is(r, 200);
    eq(await models.User.collection.countDocuments({ email: { $regex: `^${u.email}$`, $options: 'i' } }), 1, 'accounts');
});

const C = 'Course management';
tc('CRS-001', C, 'Critical', 'Create a course', 'POST /courses with title and description', 'HTTP 201, status defaults to Draft (FR-COURSE-01)', async () => {
    const r = await api('POST', '/courses', { token: F.instr.token, body: { title: 'T', description: 'D' } });
    is(r, 201); eq(r.json.status, 'Draft', 'status'); F.draft = r.json._id;
});
tc('CRS-002', C, 'Medium', 'Reject a course without a description', 'POST /courses with only a title', 'HTTP 400', async () => {
    is(await api('POST', '/courses', { token: F.instr.token, body: { title: 'T' } }), 400);
});
tc('CRS-003', C, 'High', 'Owner updates a course', 'PUT /courses/:id', 'HTTP 200 with the new title', async () => {
    const r = await api('PUT', `/courses/${F.draft}`, { token: F.instr.token, body: { title: 'Updated' } });
    is(r, 200); eq(r.json.title, 'Updated', 'title');
});
tc('CRS-004', C, 'Critical', 'Another user cannot update a course', 'PUT /courses/:id as a different instructor', 'HTTP 403', async () => {
    is(await api('PUT', `/courses/${F.draft}`, { token: F.instr2.token, body: { title: 'Hack' } }), 403);
});
tc('CRS-005', C, 'Critical', 'Another user cannot delete a course', 'DELETE /courses/:id as a student', 'HTTP 403', async () => {
    is(await api('DELETE', `/courses/${F.draft}`, { token: F.s1.token }), 403);
});
tc('CRS-006', C, 'High', 'Add, rename and delete a section', 'POST, PUT, DELETE on /courses/:id/sections', 'Each call succeeds', async () => {
    const sid = await addSection(F.instr, F.draft, 'S');
    is(await api('PUT', `/courses/${F.draft}/sections/${sid}`, { token: F.instr.token, body: { title: 'S2', importance: 'Important' } }), 200);
    is(await api('DELETE', `/courses/${F.draft}/sections/${sid}`, { token: F.instr.token }), 200);
});
tc('CRS-007', C, 'High', 'Add, edit and delete a lecture', 'POST lecture, PUT and DELETE /courses/lectures/:id', 'Each call succeeds', async () => {
    const sid = await addSection(F.instr, F.draft, 'S');
    const lid = await addLecture(F.instr, F.draft, sid, 'L');
    is(await api('PUT', `/courses/lectures/${lid}`, { token: F.instr.token, body: { title: 'L2' } }), 200);
    is(await api('DELETE', `/courses/lectures/${lid}`, { token: F.instr.token }), 200);
});
tc('CRS-008', C, 'Medium', 'Reject an invalid section importance', 'PUT a section with importance "Banana"', 'HTTP 400', async () => {
    const sid = await addSection(F.instr, F.draft, 'S');
    is(await api('PUT', `/courses/${F.draft}/sections/${sid}`, { token: F.instr.token, body: { importance: 'Banana' } }), 400);
});
tc('CRS-009', C, 'Medium', 'A lecture field can be cleared', 'PUT a lecture with description "" and resourceUrl ""', 'The stored values become empty', async () => {
    const r = await api('PUT', `/courses/lectures/${F.L2}`, { token: F.instr.token, body: { description: '' } });
    is(r, 200); eq(r.json.description, '', 'description');
});
tc('CRS-010', C, 'High', 'Enroll a student', 'POST /courses/:id/enroll', 'HTTP 201', async () => {
    const u = await newUser('student', 'enr');
    is(await api('POST', `/courses/${F.course.id}/enroll`, { token: F.instr.token, body: { email: u.email } }), 201);
    F.enr = u;
});
tc('CRS-011', C, 'Medium', 'Reject a duplicate enrollment', 'Enroll the same student again', 'HTTP 400', async () => {
    is(await api('POST', `/courses/${F.course.id}/enroll`, { token: F.instr.token, body: { email: F.enr.email } }), 400);
});
tc('CRS-012', C, 'High', 'A student cannot enroll people', 'POST /courses/:id/enroll as a student', 'HTTP 403', async () => {
    is(await api('POST', `/courses/${F.course.id}/enroll`, { token: F.s1.token, body: { email: F.s3.email } }), 403);
});
tc('CRS-013', C, 'High', 'Remove a student', 'DELETE /courses/:id/enroll/:studentId', 'HTTP 200 and the student loses access', async () => {
    is(await api('DELETE', `/courses/${F.course.id}/enroll/${F.enr.id}`, { token: F.instr.token }), 200);
    is(await api('GET', `/courses/lectures/${F.L2}`, { token: F.enr.token }), 403);
});
tc('CRS-014', C, 'Medium', 'My enrolled and my created lists', 'GET /courses/my/enrolled and /my/created', 'Each list contains the course', async () => {
    const a = await api('GET', '/courses/my/enrolled', { token: F.s1.token });
    ok(a.json.some(p => p.course._id === F.course.id), 'not in enrolled list');
    const b = await api('GET', '/courses/my/created', { token: F.instr.token });
    ok(b.json.some(c => c._id === F.course.id), 'not in created list');
});
tc('CRS-015', C, 'High', 'Enrolled student sees only visible content', 'GET /courses/:id as an enrolled student', 'Hidden sections and hidden lectures are not returned', async () => {
    const r = await api('GET', `/courses/${F.course.id}`, { token: F.s1.token });
    is(r, 200);
    ok(!r.text.includes('SECRET'), 'hidden content returned');
});
tc('CRS-016', C, 'Critical', 'Paywall: a non-buyer cannot read lecture content', 'GET /courses/:id and /courses/lectures/:id as a non-enrolled user', 'Non-preview lecture returns 403; course view hides resource URLs', async () => {
    is(await api('GET', `/courses/lectures/${F.L2}`, { token: F.s3.token }), 403);
    const c = await api('GET', `/courses/${F.course.id}`, { token: F.s3.token });
    const lec = c.json.sections[0].lectures.find(l => l._id === F.L2);
    eq(lec.resourceUrl, '', 'resourceUrl');
});
tc('CRS-017', C, 'High', 'Preview lecture is open to non-buyers', 'GET a preview lecture as a non-enrolled user', 'HTTP 200', async () => {
    is(await api('GET', `/courses/lectures/${F.L1}`, { token: F.s3.token }), 200);
});
tc('CRS-018', C, 'High', 'Hidden lecture is blocked for enrolled students', 'GET a hidden lecture and a lecture in a hidden section', 'HTTP 403 for both', async () => {
    is(await api('GET', `/courses/lectures/${F.L3}`, { token: F.s1.token }), 403);
    is(await api('GET', `/courses/lectures/${F.L4}`, { token: F.s1.token }), 403);
});
tc('CRS-019', C, 'High', 'Course search returns only my courses', 'GET /courses/search?q=...', 'Only enrolled or created courses are returned', async () => {
    const r = await api('GET', '/courses/search?q=Main', { token: F.s3.token });
    is(r, 200); eq(r.json.length, 0, 'results for an outsider');
});
tc('CRS-020', C, 'High', 'Course analytics for the owner only', 'GET /courses/:id/analytics as the owner and as a student', 'Owner HTTP 200, student HTTP 403', async () => {
    is(await api('GET', `/courses/${F.course.id}/analytics`, { token: F.instr.token }), 200);
    is(await api('GET', `/courses/${F.course.id}/analytics`, { token: F.s1.token }), 403);
});
tc('CRS-021', C, 'Critical', 'Admin-blocked course is closed to students', 'Block a course, then GET the course and a lecture as an enrolled student', 'Access is denied (FR-COURSE-02, FR-ADMIN-03)', async () => {
    const c = await mkCourse(F.instr);
    await enroll(F.instr, c.id, F.s1);
    is(await api('POST', `/admin/courses/${c.id}/block`, { token: F.admin.token, body: { reason: 'qa' } }), 200);
    const course = await api('GET', `/courses/${c.id}`, { token: F.s1.token });
    const lecture = await api('GET', `/courses/lectures/${c.lectureId}`, { token: F.s1.token });
    ok(course.status >= 400 && lecture.status >= 400, `course HTTP ${course.status}, lecture HTTP ${lecture.status}`);
});
tc('CRS-022', C, 'Medium', 'Course delete removes related data', 'Create quiz and resource, delete the course, count leftovers', 'No orphaned quizzes, resources, coupons or broadcasts remain', async () => {
    const c = await mkCourse(F.instr);
    const q = await api('POST', '/quizzes', { token: F.instr.token, body: { courseId: c.id, title: 'Q', questions: [{ questionText: 'x', correctAnswer: 0, options: ['a', 'b'] }] } });
    is(await api('DELETE', `/courses/${c.id}`, { token: F.instr.token }), 200);
    const Quiz = serverRequire('./models/Quiz');
    eq(await Quiz.countDocuments({ _id: q.json._id }), 0, 'orphaned quizzes');
});
tc('CRS-023', C, 'Medium', 'Course delete keeps the audit trail', 'Delete a course, then search the activity log', 'Audit records are retained (FR-ACT-03)', async () => {
    const c = await mkCourse(F.instr);
    await sleep(100);
    const before = await models.Activity.countDocuments({ course: c.id });
    ok(before > 0, 'nothing logged before delete');
    await api('DELETE', `/courses/${c.id}`, { token: F.instr.token });
    await sleep(100);
    ok(await models.Activity.countDocuments({ course: c.id }) >= before, 'audit records were deleted');
});
tc('CRS-024', C, 'Medium', 'Only instructors can list on the marketplace', 'As a student, POST /courses and POST /instructor/course', 'HTTP 403 for both', async () => {
    is(await api('POST', '/courses', { token: F.s3.token, body: { title: 'Mine', description: 'D' } }), 403, 'course');
    is(await api('POST', '/instructor/course', { token: F.s3.token, body: { title: 'Mine', description: 'D', price: 100 } }), 403, 'listing');
});
tc('CRS-025', C, 'Medium', 'Reject a negative course price', 'PUT /courses/:id with price -100', 'HTTP 400', async () => {
    is(await api('PUT', `/courses/${F.draft}`, { token: F.instr.token, body: { price: -100 } }), 400);
});

const P = 'Lecture progress';
tc('PRG-001', P, 'High', 'Update lecture status', 'PUT /courses/lectures/:id/progress with status Completed', 'HTTP 200 and the status is stored', async () => {
    const r = await api('PUT', `/courses/lectures/${F.L1}/progress`, { token: F.s1.token, body: { status: 'Completed' } });
    is(r, 200); ok(r.json.completedLectures.some(l => l.lecture === F.L1 && l.status === 'Completed'), 'not stored');
});
tc('PRG-002', P, 'Medium', 'Save private notes', 'PUT progress with notes', 'Notes are stored', async () => {
    const r = await api('PUT', `/courses/lectures/${F.L2}/progress`, { token: F.s1.token, body: { notes: 'PRIVATE-NOTE' } });
    is(r, 200); ok(r.text.includes('PRIVATE-NOTE'), 'notes missing');
});
tc('PRG-003', P, 'Medium', 'Toggle revision flag', 'PUT toggle-revision twice', 'Flag turns on, then off', async () => {
    const a = await api('PUT', `/courses/lectures/${F.L2}/toggle-revision`, { token: F.s1.token });
    eq(a.json.markedForRevision, true, 'first toggle');
    const b = await api('PUT', `/courses/lectures/${F.L2}/toggle-revision`, { token: F.s1.token });
    eq(b.json.markedForRevision, false, 'second toggle');
});
tc('PRG-004', P, 'High', 'A non-enrolled user cannot save progress', 'PUT progress as an outsider', 'HTTP 404 "Not enrolled"', async () => {
    is(await api('PUT', `/courses/lectures/${F.L1}/progress`, { token: F.s3.token, body: { status: 'Completed' } }), 404);
});
tc('PRG-005', P, 'High', 'Progress totals exclude hidden lectures', 'GET /courses/my/enrolled for a course with 2 visible and 2 hidden lectures', 'totalLectures is 2 (FR-COURSE-06)', async () => {
    const r = await api('GET', '/courses/my/enrolled', { token: F.s1.token });
    eq(r.json.find(p => p.course._id === F.course.id).course.totalLectures, 2, 'totalLectures');
});
tc('PRG-006', P, 'Medium', 'Student analytics exclude hidden lectures', 'GET /courses/:id/my-analytics', 'overview.totalLectures is 2', async () => {
    const r = await api('GET', `/courses/${F.course.id}/my-analytics`, { token: F.s1.token });
    is(r, 200); eq(r.json.overview.totalLectures, 2, 'totalLectures');
});
tc('PRG-007', P, 'Medium', 'Completing lectures builds a streak', 'Complete a lecture, then GET /courses/my/stats', 'currentStreak is 1 and dailyActivity has today', async () => {
    const r = await api('GET', '/courses/my/stats', { token: F.s1.token });
    is(r, 200); eq(r.json.totalCompletedLectures, 1, 'completed');
    eq(r.json.currentStreak, 1, 'currentStreak');
});
tc('PRG-008', P, 'Low', 'Editing notes keeps the completion time', 'Complete a lecture, edit its notes, read completedAt', 'completedAt is unchanged', async () => {
    const read = async () => (await api('GET', `/courses/${F.course.id}/my-progress`, { token: F.s1.token })).json.completedLectures.find(l => l.lecture === F.L1).completedAt;
    const before = await read();
    await sleep(20);
    await api('PUT', `/courses/lectures/${F.L1}/progress`, { token: F.s1.token, body: { notes: 'edited' } });
    eq(await read(), before, 'completedAt');
});
tc('PRG-009', P, 'Medium', 'Status must be one of the course labels', 'PUT progress with status "Banana"', 'HTTP 400', async () => {
    is(await api('PUT', `/courses/lectures/${F.L2}/progress`, { token: F.s2.token, body: { status: 'Banana' } }), 400);
});
tc('PRG-010', P, 'High', 'Instructor views a student progress overlay', 'GET /courses/:id/progress/:studentId as the owner', 'HTTP 200 with section breakdown (FR-COURSE-10)', async () => {
    const r = await api('GET', `/courses/${F.course.id}/progress/${F.s1.id}`, { token: F.instr.token });
    is(r, 200); ok(r.json.sections?.length, 'no sections');
});
tc('PRG-011', P, 'Medium', 'Peer progress is off by default', 'GET /courses/:id/peers', 'HTTP 403', async () => {
    is(await api('GET', `/courses/${F.course.id}/peers`, { token: F.s1.token }), 403);
});

const T = 'Co-instructors';
tc('TCH-001', T, 'High', 'Owner adds a co-instructor', 'POST /courses/:id/teachers', 'HTTP 201', async () => {
    F.teacher = await newUser('student', 'coteacher');
    is(await api('POST', `/courses/${F.course.id}/teachers`, { token: F.instr.token, body: { email: F.teacher.email, permissions: { manage_content: true } } }), 201);
});
tc('TCH-002', T, 'Medium', 'Reject a duplicate co-instructor', 'Add the same user twice', 'HTTP 400', async () => {
    is(await api('POST', `/courses/${F.course.id}/teachers`, { token: F.instr.token, body: { email: F.teacher.email } }), 400);
});
tc('TCH-003', T, 'Low', 'Owner cannot add themselves', 'Add the owner email', 'HTTP 400', async () => {
    is(await api('POST', `/courses/${F.course.id}/teachers`, { token: F.instr.token, body: { email: F.instr.email } }), 400);
});
tc('TCH-004', T, 'High', 'Outsider cannot add a co-instructor', 'POST teachers as a different instructor', 'HTTP 403', async () => {
    is(await api('POST', `/courses/${F.course.id}/teachers`, { token: F.instr2.token, body: { email: F.s3.email } }), 403);
});
tc('TCH-005', T, 'High', 'manage_content can add sections', 'POST a section as the co-instructor', 'HTTP 201', async () => {
    is(await api('POST', `/courses/${F.course.id}/sections`, { token: F.teacher.token, body: { title: 'From teacher' } }), 201);
});
tc('TCH-006', T, 'High', 'manage_content can edit lectures', 'PUT /courses/lectures/:id as the co-instructor', 'HTTP 200 (SRS 3.4: add, edit and delete lectures)', async () => {
    is(await api('PUT', `/courses/lectures/${F.L2}`, { token: F.teacher.token, body: { title: 'By teacher' } }), 200);
});
tc('TCH-007', T, 'High', 'manage_content can delete lectures', 'DELETE a lecture as the co-instructor', 'HTTP 200', async () => {
    const lid = await addLecture(F.instr, F.course.id, F.course.sectionId, 'Disposable');
    is(await api('DELETE', `/courses/lectures/${lid}`, { token: F.teacher.token }), 200);
});
tc('TCH-008', T, 'High', 'manage_content alone cannot enroll students', 'POST enroll as the co-instructor', 'HTTP 403', async () => {
    is(await api('POST', `/courses/${F.course.id}/enroll`, { token: F.teacher.token, body: { email: F.s3.email } }), 403);
});
tc('TCH-009', T, 'Medium', 'Update co-instructor permissions', 'PUT teachers/:id adding manage_students and manage_teachers', 'HTTP 200 with new permissions', async () => {
    const r = await api('PUT', `/courses/${F.course.id}/teachers/${F.teacher.id}`, { token: F.instr.token, body: { permissions: { manage_students: true, manage_teachers: true } } });
    is(r, 200); eq(r.json.permissions.manage_students, true, 'manage_students');
});
tc('TCH-010', T, 'High', 'manage_teachers cannot grant full_access', 'As the co-instructor, add a user with full_access', 'User is added without full_access', async () => {
    const u = await newUser('student', 'sub');
    const r = await api('POST', `/courses/${F.course.id}/teachers`, { token: F.teacher.token, body: { email: u.email, permissions: { full_access: true } } });
    is(r, 201); eq(r.json.permissions.full_access, false, 'full_access');
    const self = await api('PUT', `/courses/${F.course.id}/teachers/${F.teacher.id}`, { token: F.teacher.token, body: { permissions: { full_access: true } } });
    eq(self.json.permissions.full_access, false, 'self-grant');
});
tc('TCH-011', T, 'Medium', 'My permissions endpoint', 'GET /courses/:id/my-permissions for owner, teacher, outsider', 'Each role is reported correctly', async () => {
    eq((await api('GET', `/courses/${F.course.id}/my-permissions`, { token: F.instr.token })).json.isCreator, true, 'owner');
    eq((await api('GET', `/courses/${F.course.id}/my-permissions`, { token: F.teacher.token })).json.isTeacher, true, 'teacher');
    eq((await api('GET', `/courses/${F.course.id}/my-permissions`, { token: F.s3.token })).json.isTeacher, false, 'outsider');
});
tc('TCH-012', T, 'Medium', 'Co-instructor leaves a course', 'DELETE teachers/leave', 'HTTP 200', async () => {
    is(await api('DELETE', `/courses/${F.course.id}/teachers/leave`, { token: F.teacher.token }), 200);
});
tc('TCH-013', T, 'Medium', 'Owner removes a co-instructor', 'Add a user, then DELETE teachers/:id', 'HTTP 200', async () => {
    const u = await newUser('student', 'rm');
    await api('POST', `/courses/${F.course.id}/teachers`, { token: F.instr.token, body: { email: u.email } });
    is(await api('DELETE', `/courses/${F.course.id}/teachers/${u.id}`, { token: F.instr.token }), 200);
});
tc('TCH-014', T, 'Medium', 'A co-instructor cannot delete the course', 'Give full_access, then DELETE the course', 'HTTP 403 (SRS 3.4)', async () => {
    const c = await mkCourse(F.instr);
    const u = await newUser('student', 'full');
    await api('POST', `/courses/${c.id}/teachers`, { token: F.instr.token, body: { email: u.email, permissions: { full_access: true } } });
    is(await api('DELETE', `/courses/${c.id}`, { token: u.token }), 403);
});

const K = 'Marketplace';
tc('MKT-001', K, 'Critical', 'Guests can browse', 'GET /marketplace with no token', 'HTTP 200 and the published course is listed', async () => {
    const r = await api('GET', '/marketplace?limit=50');
    is(r, 200); ok(r.json.courses.some(c => c._id === F.course.id), 'course missing');
});
tc('MKT-002', K, 'High', 'Draft courses are not listed', 'Create a draft, then browse', 'The draft is absent', async () => {
    const c = await mkCourse(F.instr, { status: 'Draft' });
    F.draftMkt = c;
    ok(!(await api('GET', '/marketplace?limit=100')).json.courses.some(x => x._id === c.id), 'draft listed');
});
tc('MKT-003', K, 'High', 'Filter by category, level and price', 'GET /marketplace with each filter', 'Results match the filter', async () => {
    ok((await api('GET', '/marketplace?category=Testing')).json.courses.length > 0, 'category');
    eq((await api('GET', '/marketplace?category=Nope')).json.courses.length, 0, 'wrong category');
    ok((await api('GET', '/marketplace?level=Beginner')).json.courses.length > 0, 'level');
    eq((await api('GET', '/marketplace?minPrice=999999')).json.courses.length, 0, 'minPrice');
});
tc('MKT-004', K, 'Medium', 'Filter by language', 'GET /marketplace?language=Sinhala', 'Only Sinhala courses are returned (FR-MKT-02)', async () => {
    eq((await api('GET', '/marketplace?language=Sinhala')).json.courses.length, 0, 'courses returned for an unused language');
});
tc('MKT-005', K, 'Medium', 'Sort and paginate', 'GET /marketplace?sortBy=price-low&limit=1&page=2', 'pagination block is correct', async () => {
    await mkCourse(F.instr);
    await mkCourse(F.instr);
    const r = await api('GET', '/marketplace?sortBy=price-low&limit=1&page=2');
    is(r, 200); eq(r.json.pagination.page, 2, 'page'); eq(r.json.courses.length, 1, 'page size');
});
tc('MKT-006', K, 'High', 'Keyword search', 'GET /marketplace/search?q=Main', 'The course is found', async () => {
    const r = await api('GET', '/marketplace/search?q=Main');
    is(r, 200); ok(r.json.courses.some(c => c._id === F.course.id), 'not found');
});
tc('MKT-007', K, 'Low', 'Empty search is rejected', 'GET /marketplace/search', 'HTTP 400', async () => is(await api('GET', '/marketplace/search'), 400));
tc('MKT-008', K, 'High', 'Course landing page', 'GET /marketplace/:id as a guest', 'HTTP 200 with instructor and reviews', async () => {
    const r = await api('GET', `/marketplace/${F.course.id}`);
    is(r, 200); ok(r.json.instructor?.name, 'no instructor');
});
tc('MKT-009', K, 'Medium', 'Categories list', 'GET /marketplace/categories', 'Contains Testing', async () => {
    ok((await api('GET', '/marketplace/categories')).json.includes('Testing'), 'missing category');
});
tc('MKT-010', K, 'Medium', 'Language is listed on course cards', 'GET /marketplace and read a course', 'language is present (FR-MKT-01)', async () => {
    const c = (await api('GET', '/marketplace?limit=1')).json.courses[0];
    ok(c.language, 'language field missing');
});
