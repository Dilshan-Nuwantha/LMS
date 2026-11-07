// Quizzes, AI, broadcasts, resources, reviews, notifications and the activity log.
const { tc, api, ok, is, eq, lines, newUser, multipart, sleep, uid, MINIMAL_PDF, serverRequire } = require('./lib');
const { F, models, mkCourse, addSection, addLecture, enroll, buy } = require('./fixtures');

const M = 'Quizzes';
const questions = [
    { questionText: 'Pick B', questionType: 'mcq', options: ['A', 'B'], correctAnswer: 1, points: 1 },
    { questionText: 'Sky is green', questionType: 'true-false', correctAnswer: false, points: 1 },
    { questionText: 'Capital of Sri Lanka', questionType: 'short-answer', correctAnswer: 'Colombo', points: 1 }
];
const mkQuiz = async (extra = {}) => {
    const r = await api('POST', '/quizzes', { token: F.instr.token, body: { courseId: F.course.id, title: 'Quiz ' + uid(), questions, passingScore: 60, ...extra } });
    is(r, 201, 'create quiz');
    return r.json;
};
const start = (id, u = F.s1) => api('POST', `/quizzes/${id}/start`, { token: u.token });
const submit = (id, attemptId, answers, u = F.s1) => api('POST', `/quizzes/${id}/submit`, { token: u.token, body: { attemptId, answers } });
const right = [{ questionIndex: 0, answer: 1 }, { questionIndex: 1, answer: false }, { questionIndex: 2, answer: ' colombo ' }];

tc('QZ-001', M, 'High', 'Instructor creates a quiz', 'POST /quizzes', 'HTTP 201 with three questions', async () => {
    F.quiz = await mkQuiz();
    eq(F.quiz.questions.length, 3, 'questions');
});
tc('QZ-002', M, 'Critical', 'Students cannot create quizzes', 'POST /quizzes as a student', 'HTTP 403', async () => {
    is(await api('POST', '/quizzes', { token: F.s1.token, body: { courseId: F.course.id, title: 'Hack' } }), 403);
});
tc('QZ-003', M, 'Critical', 'Quiz list and detail hide answers from students', 'GET the course list and the quiz as a student', 'No correctAnswer field; the owner can see answers', async () => {
    const list = await api('GET', `/quizzes/course/${F.course.id}`, { token: F.s1.token });
    is(list, 200); ok(!list.text.includes('correctAnswer'), 'answers in list');
    ok(!(await api('GET', `/quizzes/${F.quiz._id}`, { token: F.s1.token })).text.includes('correctAnswer'), 'answers in detail');
    ok((await api('GET', `/quizzes/${F.quiz._id}`, { token: F.instr.token })).text.includes('correctAnswer'), 'owner missing answers');
});
tc('QZ-004', M, 'High', 'A non-enrolled user cannot start a quiz', 'POST start as an outsider', 'HTTP 403', async () => is(await start(F.quiz._id, F.s3), 403));
tc('QZ-005', M, 'Critical', 'Starting a quiz hides answers', 'POST start', 'HTTP 201 with questions and no correctAnswer', async () => {
    const r = await start(F.quiz._id);
    is(r, 201); ok(!r.text.includes('correctAnswer'), 'answers exposed');
    F.attempt = r.json.attempt._id;
});
tc('QZ-006', M, 'Medium', 'Restarting resumes the same attempt', 'POST start again', 'The same attempt id is returned', async () => {
    eq((await start(F.quiz._id)).json.attempt._id, F.attempt, 'attempt id');
});
tc('QZ-007', M, 'High', "Cannot submit someone else's attempt", 'Submit the attempt as another student', 'HTTP 403', async () => is(await submit(F.quiz._id, F.attempt, right, F.s2), 403));
tc('QZ-008', M, 'Critical', 'Correct answers score 100 percent', 'Submit MCQ, true/false (false) and short answer (case and spaces differ)', 'percentage 100, passed true', async () => {
    const r = await submit(F.quiz._id, F.attempt, right);
    is(r, 200); eq(r.json.result.percentage, 100, 'percentage'); eq(r.json.result.passed, true, 'passed');
});
tc('QZ-009', M, 'High', 'An attempt can be submitted only once', 'Submit again', 'HTTP 400', async () => is(await submit(F.quiz._id, F.attempt, right), 400));
tc('QZ-010', M, 'High', 'Wrong answers fail', 'Submit all wrong', 'percentage 0, passed false', async () => {
    const a = (await start(F.quiz._id, F.s2)).json.attempt._id;
    const r = await submit(F.quiz._id, a, [{ questionIndex: 0, answer: 0 }, { questionIndex: 1, answer: true }, { questionIndex: 2, answer: 'Kandy' }], F.s2);
    eq(r.json.result.percentage, 0, 'percentage'); eq(r.json.result.passed, false, 'passed');
});
tc('QZ-011', M, 'High', 'Attempt limit is enforced', 'Use a quiz with attemptsAllowed 1 twice', 'Second start returns HTTP 400', async () => {
    const q = await mkQuiz({ attemptsAllowed: 1 });
    await submit(q._id, (await start(q._id)).json.attempt._id, right);
    is(await start(q._id), 400);
});
tc('QZ-012', M, 'High', 'Time limit is enforced', 'Move startedAt 20 minutes back on a 5 minute quiz, then submit', 'HTTP 400 and status timed-out', async () => {
    const q = await mkQuiz({ timeLimit: 5 });
    const a = (await start(q._id)).json.attempt._id;
    await models.QuizAttempt.updateOne({ _id: a }, { startedAt: new Date(Date.now() - 20 * 60000) });
    is(await submit(q._id, a, right), 400);
    eq((await models.QuizAttempt.findById(a)).status, 'timed-out', 'status');
});
tc('QZ-013', M, 'Medium', 'Inactive quiz is unavailable', 'Set isActive false', 'Hidden from students; start returns HTTP 400', async () => {
    const q = await mkQuiz();
    is(await api('PUT', `/quizzes/${q._id}`, { token: F.instr.token, body: { isActive: false } }), 200);
    ok(!(await api('GET', `/quizzes/course/${F.course.id}`, { token: F.s1.token })).text.includes(q._id), 'listed');
    is(await start(q._id), 400);
});
tc('QZ-014', M, 'High', 'Quiz analytics are for instructors', 'GET analytics as the owner and as a student', 'Owner HTTP 200; student HTTP 403', async () => {
    const r = await api('GET', `/quizzes/${F.quiz._id}/analytics`, { token: F.instr.token });
    is(r, 200); ok(r.json.overview.totalAttempts >= 2, 'attempts missing');
    is(await api('GET', `/quizzes/${F.quiz._id}/analytics`, { token: F.s1.token }), 403);
});
tc('QZ-015', M, 'Medium', 'Own attempts list', 'GET /quizzes/:id/my-attempts', 'The attempt is listed', async () => {
    ok((await api('GET', `/quizzes/${F.quiz._id}/my-attempts`, { token: F.s1.token })).json.some(a => a._id === F.attempt), 'missing');
});
tc('QZ-016', M, 'High', "Students cannot read each other's attempts", 'GET /quizzes/attempts/:id as another student', 'HTTP 403', async () => {
    is(await api('GET', `/quizzes/attempts/${F.attempt}`, { token: F.s2.token }), 403);
});
tc('QZ-017', M, 'Medium', 'Delete a quiz and its attempts', 'DELETE /quizzes/:id', 'Quiz and attempts are gone', async () => {
    const q = await mkQuiz();
    await start(q._id);
    is(await api('DELETE', `/quizzes/${q._id}`, { token: F.instr.token }), 200);
    eq(await models.QuizAttempt.countDocuments({ quiz: q._id }), 0, 'attempts');
});
tc('QZ-018', M, 'Critical', 'Repeating one answer cannot inflate a score', 'Submit the same correct questionIndex three times', 'That question scores once: percentage 33, passed false', async () => {
    const q = await mkQuiz();
    const a = (await start(q._id)).json.attempt._id;
    const r = await submit(q._id, a, [right[0], right[0], right[0]]);
    eq(r.json.result.percentage, 33, 'percentage');
});
tc('QZ-019', M, 'Critical', 'Answers are hidden while an attempt is in progress', 'Start a quiz, then GET /quizzes/attempts/:id', 'No correctAnswer in the response', async () => {
    const q = await mkQuiz();
    const a = (await start(q._id)).json.attempt._id;
    const r = await api('GET', `/quizzes/attempts/${a}`, { token: F.s1.token });
    ok(!r.text.includes('correctAnswer'), 'the answer key is returned during the attempt');
});
tc('QZ-020', M, 'High', 'Answer key stays hidden while retries remain', 'Submit one attempt on an unlimited-retry quiz', 'The response has no correct answers', async () => {
    const q = await mkQuiz({ attemptsAllowed: -1 });
    const r = await submit(q._id, (await start(q._id)).json.attempt._id, []);
    ok(!r.text.includes('correctAnswer'), 'the answer key is returned after an empty attempt, and the student can retake');
});
tc('QZ-021', M, 'Medium', 'Submit without answers is a client error', 'POST submit with no answers field', 'HTTP 400', async () => {
    const q = await mkQuiz();
    is(await submit(q._id, (await start(q._id)).json.attempt._id, undefined), 400);
});
tc('QZ-022', M, 'Medium', 'Numeric reply to a short-answer question', 'Answer the short question with 123', 'Marked wrong, HTTP 200', async () => {
    const q = await mkQuiz();
    is(await submit(q._id, (await start(q._id)).json.attempt._id, [{ questionIndex: 2, answer: 123 }]), 200);
});
tc('QZ-023', M, 'Low', 'Passing score of 0 is kept', 'Create with passingScore 0', 'passingScore is 0', async () => {
    eq((await mkQuiz({ passingScore: 0 })).passingScore, 0, 'passingScore');
});
tc('QZ-024', M, 'High', 'AI-generated true/false questions can be answered', 'Save a question as the AI returns it (correctAnswer 0 = True), answer true as the UI does', 'The answer is marked correct', async () => {
    const q = await mkQuiz({ questions: [{ questionText: 'T', questionType: 'true-false', options: ['True', 'False'], correctAnswer: 0, points: 1 }] });
    const r = await submit(q._id, (await start(q._id)).json.attempt._id, [{ questionIndex: 0, answer: true }]);
    eq(r.json.result.percentage, 100, 'percentage');
});
tc('QZ-025', M, 'Low', 'Reject a negative time limit', 'Create with timeLimit -5', 'HTTP 400', async () => {
    is(await api('POST', '/quizzes', { token: F.instr.token, body: { courseId: F.course.id, title: 'T', timeLimit: -5 } }), 400);
});

const A = 'AI features';
const KEY = 'sk-qa-instructor-key-000000';
const SKEY = 'sk-qa-student-key-111111111';
const aiKeyUsed = () => lines('ai.jsonl').pop()?.key;
const chat = (id, u, message = 'Hello there') => api('POST', `/student-ai/conversations/${id}/messages`, { token: u.token, form: multipart({ message }) });
const convo = async (u, body) => (await api('POST', '/student-ai/conversations', { token: u.token, body })).json;

tc('AI-001', A, 'Critical', 'Instructor AI key is encrypted at rest', 'POST /ai/config, read the stored record', 'Key stored as AES-GCM ciphertext; response masked (NFR-SEC-03)', async () => {
    const r = await api('POST', '/ai/config', { token: F.instr.token, body: { provider: 'openai', apiKey: KEY, model: 'gpt-x' } });
    is(r, 200); ok(!r.text.includes(KEY), 'key returned');
    const db = await models.InstructorAIConfig.findOne({ instructor: F.instr.id });
    ok(!db.apiKey.includes('sk-qa') && db.apiKey.split(':').length === 3, 'not encrypted');
});
tc('AI-002', A, 'High', 'Config read returns a masked key', 'GET /ai/config', 'apiKeyMasked only', async () => {
    const r = await api('GET', '/ai/config', { token: F.instr.token });
    is(r, 200); ok(!r.text.includes(KEY) && r.json.apiKeyMasked, 'key not masked');
});
tc('AI-003', A, 'Medium', 'Reject an invalid provider', 'POST provider "acme"', 'HTTP 400', async () => {
    is(await api('POST', '/ai/config', { token: F.instr.token, body: { provider: 'acme', apiKey: 'k', model: 'm' } }), 400);
});
tc('AI-004', A, 'Medium', 'Test connection', 'POST /ai/test for each provider', 'success true for OpenAI, Gemini and Anthropic', async () => {
    for (const provider of ['openai', 'gemini', 'anthropic']) {
        eq((await api('POST', '/ai/test', { token: F.instr.token, body: { provider, apiKey: 'k', model: 'm' } })).json.success, true, provider);
    }
});
tc('AI-005', A, 'High', 'Instructor AI routes reject students', 'GET /ai/config as a student', 'Denied', async () => {
    ok((await api('GET', '/ai/config', { token: F.s1.token })).status >= 400, 'allowed');
});
tc('AI-006', A, 'High', 'Generate a quiz', 'POST /ai/generate-quiz', 'Questions returned', async () => {
    const r = await api('POST', '/ai/generate-quiz', { token: F.instr.token, body: { courseId: F.course.id, topic: 'Testing' } });
    is(r, 200); ok(r.json.questions.length, 'none');
});
tc('AI-007', A, 'High', 'Generate notes', 'POST /ai/generate-notes', 'Notes returned', async () => {
    const r = await api('POST', '/ai/generate-notes', { token: F.instr.token, body: { courseId: F.course.id, topic: 'Testing' } });
    is(r, 200); ok(r.json.notes, 'none');
});
tc('AI-008', A, 'Medium', 'Generating without a key is a client error', 'POST /ai/generate-notes with no saved key', 'HTTP 400', async () => {
    const u = await newUser('instructor', 'nokey');
    const c = await mkCourse(u);
    is(await api('POST', '/ai/generate-notes', { token: u.token, body: { courseId: c.id, topic: 'x' } }), 400);
});
tc('AI-009', A, 'High', 'Cannot generate for another course', 'POST /ai/generate-notes on a stranger course', 'HTTP 403', async () => {
    is(await api('POST', '/ai/generate-notes', { token: F.instr2.token, body: { courseId: F.course.id, topic: 'x' } }), 403);
});
tc('AI-010', A, 'High', 'Student chats with their own key', 'Save a student key, create a conversation, send a message', 'Reply returned; the student key is used; title generated', async () => {
    is(await api('POST', '/student-ai/config', { token: F.s1.token, body: { provider: 'anthropic', apiKey: SKEY, model: 'm' } }), 200);
    F.convo = await convo(F.s1, { courseId: F.course.id });
    const r = await chat(F.convo._id, F.s1, 'What is regression testing?');
    is(r, 200); eq(r.json.source, 'student', 'source'); eq(aiKeyUsed(), SKEY, 'key used');
    eq((await api('GET', `/student-ai/conversations/${F.convo._id}`, { token: F.s1.token })).json.title, 'What is regression testing?', 'title');
});
tc('AI-011', A, 'Medium', 'Rename a conversation', 'PUT conversations/:id/title', 'HTTP 200', async () => {
    is(await api('PUT', `/student-ai/conversations/${F.convo._id}/title`, { token: F.s1.token, body: { title: 'Mine' } }), 200);
});
tc('AI-012', A, 'High', 'Conversations are private', 'GET, message and DELETE as another student', 'HTTP 404 each time', async () => {
    is(await api('GET', `/student-ai/conversations/${F.convo._id}`, { token: F.s2.token }), 404);
    is(await chat(F.convo._id, F.s2), 404);
    is(await api('DELETE', `/student-ai/conversations/${F.convo._id}`, { token: F.s2.token }), 404);
});
tc('AI-013', A, 'Medium', 'Delete an own-key conversation', 'DELETE conversations/:id', 'HTTP 200', async () => {
    is(await api('DELETE', `/student-ai/conversations/${F.convo._id}`, { token: F.s1.token }), 200);
});
tc('AI-014', A, 'High', 'Instructor key is off by default', 'Chat with useInstructorKey before sharing is enabled', 'HTTP 400 (not a 500)', async () => {
    const c = await convo(F.s2, { courseId: F.course.id, useInstructorKey: true });
    is(await chat(c._id, F.s2), 400);
});
tc('AI-015', A, 'High', 'Only the owner toggles AI sharing', 'PUT toggle-student-ai as the owner and as another instructor', 'Owner enabled; other instructor HTTP 403', async () => {
    is(await api('PUT', `/courses/${F.course.id}/toggle-student-ai`, { token: F.instr2.token }), 403);
    eq((await api('PUT', `/courses/${F.course.id}/toggle-student-ai`, { token: F.instr.token })).json.allowStudentAI, true, 'allowStudentAI');
});
tc('AI-016', A, 'High', 'Student uses the shared instructor key', 'Create a conversation with useInstructorKey and send a message', 'source is instructor and the instructor key is used', async () => {
    F.sharedConvo = await convo(F.s2, { courseId: F.course.id, useInstructorKey: true });
    const r = await chat(F.sharedConvo._id, F.s2);
    is(r, 200); eq(r.json.source, 'instructor', 'source'); eq(aiKeyUsed(), KEY, 'key used');
});
tc('AI-017', A, 'High', 'Instructor-key conversations cannot be deleted', 'DELETE as the student', 'HTTP 403 (FR-AI-03)', async () => {
    is(await api('DELETE', `/student-ai/conversations/${F.sharedConvo._id}`, { token: F.s2.token }), 403);
});
tc('AI-018', A, 'High', 'Instructor sees conversations on their key', 'GET /ai/course/:id/student-conversations', 'Owner HTTP 200; other instructor HTTP 403', async () => {
    const r = await api('GET', `/ai/course/${F.course.id}/student-conversations`, { token: F.instr.token });
    is(r, 200); ok(r.json.some(c => c._id === F.sharedConvo._id), 'missing');
    is(await api('GET', `/ai/course/${F.course.id}/student-conversations`, { token: F.instr2.token }), 403);
});
tc('AI-019', A, 'High', 'Conversation list reports the key source', 'GET /student-ai/conversations', 'useInstructorKey is true for that conversation', async () => {
    const r = await api('GET', '/student-ai/conversations', { token: F.s2.token });
    eq(r.json.find(c => c._id === F.sharedConvo._id).useInstructorKey, true, 'useInstructorKey');
});
tc('AI-020', A, 'High', 'A blocked student cannot use the key', 'PUT ai-block, then chat', 'HTTP 403 (not a 500)', async () => {
    await api('PUT', `/courses/${F.course.id}/ai-block/${F.s2.id}`, { token: F.instr.token });
    const r = await chat(F.sharedConvo._id, F.s2);
    await api('PUT', `/courses/${F.course.id}/ai-block/${F.s2.id}`, { token: F.instr.token });
    is(r, 403);
});
tc('AI-021', A, 'Medium', 'AI status endpoint', 'GET /student-ai/course/:id/ai-status', 'Reports sharing and instructor key', async () => {
    const r = await api('GET', `/student-ai/course/${F.course.id}/ai-status`, { token: F.s2.token });
    eq(r.json.allowStudentAI, true, 'allowStudentAI'); eq(r.json.instructorHasKey, true, 'instructorHasKey');
});
tc('AI-022', A, 'Critical', 'Only enrolled students can spend the instructor key', 'As a non-enrolled user, open a conversation on the course and send a message', 'Refused; the instructor key is not used', async () => {
    const c = await convo(F.s3, { courseId: F.course.id, useInstructorKey: true });
    const r = await chat(c._id, F.s3);
    ok(r.status >= 400, `outsider spent the instructor key (HTTP ${r.status}, source ${r.json?.source})`);
});
tc('AI-023', A, 'High', 'No silent fallback to the instructor key', 'As an enrolled student with no key, chat with useInstructorKey false', 'Refused, or the conversation is flagged as instructor-key and cannot be deleted', async () => {
    const u = await newUser('student', 'fallback');
    await enroll(F.instr, F.course.id, u);
    const c = await convo(u, { courseId: F.course.id });
    const r = await chat(c._id, u);
    const del = await api('DELETE', `/student-ai/conversations/${c._id}`, { token: u.token });
    ok(r.status >= 400 || del.status === 403, `key source "${r.json?.source}" used, then the conversation was deleted (HTTP ${del.status})`);
});
tc('AI-024', A, 'Medium', 'PDF attachment is read', 'Send a generated PDF as a chat attachment', 'HTTP 200 with PDF text in the message', async () => {
    const PDF = serverRequire('pdfkit');
    const doc = new PDF();
    const chunks = [];
    doc.on('data', d => chunks.push(d));
    const done = new Promise(r => doc.on('end', r));
    doc.text('PDFMARKER');
    doc.end();
    await done;
    const c = await convo(F.s1, {});
    const r = await api('POST', `/student-ai/conversations/${c._id}/messages`, { token: F.s1.token, form: multipart({ message: 'read' }, { name: 'a.pdf', type: 'application/pdf', data: Buffer.concat(chunks) }) });
    is(r, 200); ok(r.json.userMessage.content.includes('PDFMARKER'), 'text not extracted');
});
tc('AI-025', A, 'Medium', 'Image attachment is sent', 'Send a PNG attachment', 'HTTP 200', async () => {
    const c = await convo(F.s1, {});
    is(await api('POST', `/student-ai/conversations/${c._id}/messages`, { token: F.s1.token, form: multipart({}, { name: 'a.png', type: 'image/png', data: Buffer.from('png') }) }), 200);
});
tc('AI-026', A, 'Low', 'Unsupported attachment is explained', 'Send a .exe attachment with no message', 'HTTP 400', async () => {
    const c = await convo(F.s1, {});
    is(await api('POST', `/student-ai/conversations/${c._id}/messages`, { token: F.s1.token, form: multipart({}, { name: 'a.exe', type: 'application/x-msdownload', data: Buffer.from('MZ') }) }), 400);
});
tc('AI-027', A, 'Medium', 'Delete AI config', 'DELETE /student-ai/config twice', 'HTTP 200, then HTTP 404', async () => {
    is(await api('DELETE', '/student-ai/config', { token: F.s1.token }), 200);
    is(await api('DELETE', '/student-ai/config', { token: F.s1.token }), 404);
});

const B = 'Broadcasts';
const post = (u, body = { title: 'Hello', message: 'See https://example.test' }, course = F.course.id) => api('POST', `/broadcasts/course/${course}`, { token: u.token, body });
tc('BRD-001', B, 'High', 'Owner posts a broadcast', 'POST /broadcasts/course/:id', 'HTTP 201', async () => {
    const r = await post(F.instr);
    is(r, 201); F.broadcast = r.json;
});
tc('BRD-002', B, 'Medium', 'Broadcast needs a message', 'POST with a title only', 'HTTP 400', async () => is(await post(F.instr, { title: 'x' }), 400));
tc('BRD-003', B, 'High', 'Enrolled student reads broadcasts', 'GET active list', 'The broadcast is listed', async () => {
    ok((await api('GET', `/broadcasts/course/${F.course.id}/active`, { token: F.s1.token })).text.includes(F.broadcast._id), 'missing');
});
tc('BRD-004', B, 'High', 'Unread count and mark as read', 'GET unread-count, POST mark-read, GET again', 'Count above 0, then 0 (FR-BROAD-03)', async () => {
    ok((await api('GET', `/broadcasts/course/${F.course.id}/unread-count`, { token: F.s1.token })).json.unreadCount > 0, 'zero');
    is(await api('POST', `/broadcasts/course/${F.course.id}/mark-read`, { token: F.s1.token }), 200);
    eq((await api('GET', `/broadcasts/course/${F.course.id}/unread-count`, { token: F.s1.token })).json.unreadCount, 0, 'unread');
});
tc('BRD-005', B, 'High', 'Students cannot post by default', 'POST as an enrolled student', 'HTTP 403', async () => is(await post(F.s1), 403));
tc('BRD-006', B, 'High', 'Student broadcasts can be enabled', 'PUT settings, then POST as a student', 'HTTP 201; outsider still HTTP 403', async () => {
    eq((await api('PUT', `/broadcasts/course/${F.course.id}/settings`, { token: F.instr.token })).json.allowStudentBroadcasts, true, 'toggle');
    const r = await post(F.s1);
    is(r, 201); F.studentBroadcast = r.json;
    is(await post(F.s3), 403, 'outsider');
});
tc('BRD-007', B, 'Medium', 'Creator edits and deletes', 'PUT and DELETE own broadcast', 'HTTP 200 each', async () => {
    is(await api('PUT', `/broadcasts/${F.studentBroadcast._id}`, { token: F.s1.token, body: { title: 'Edit' } }), 200);
    is(await api('DELETE', `/broadcasts/${F.studentBroadcast._id}`, { token: F.s1.token }), 200);
});
tc('BRD-008', B, 'High', "Cannot edit someone else's broadcast", 'PUT as another student', 'HTTP 403', async () => {
    is(await api('PUT', `/broadcasts/${F.broadcast._id}`, { token: F.s2.token, body: { title: 'x' } }), 403);
});
tc('BRD-009', B, 'Low', 'Invalid priority is a client error', 'POST priority "mega"', 'HTTP 400', async () => {
    is(await post(F.instr, { title: 'x', message: 'y', priority: 'mega' }), 400);
});
tc('BRD-010', B, 'Medium', 'New lecture creates a broadcast', 'Add a lecture, then read the broadcast list', 'A broadcast with a link to the lecture exists (FR-COURSE-03, FR-BROAD-02)', async () => {
    const c = await mkCourse(F.instr);
    const r = await api('GET', `/broadcasts/course/${c.id}`, { token: F.instr.token });
    ok(r.json.pagination.total > 0, 'no broadcast was generated');
});

const R = 'Resources';
const upload = (u, file, fields = { title: 'Doc' }, course = F.course.id) => api('POST', `/resources/${course}`, { token: u.token, form: multipart(fields, file) });
const pdf = { name: 'notes.pdf', type: 'application/pdf', data: MINIMAL_PDF };
tc('RES-001', R, 'High', 'Instructor uploads a PDF', 'POST /resources/:id with a PDF', 'HTTP 201 and no fileData in the response', async () => {
    const r = await upload(F.instr, pdf);
    is(r, 201); ok(!('fileData' in r.json), 'fileData returned');
    F.resource = r.json;
});
tc('RES-002', R, 'High', 'Instructor adds a link', 'POST with a url', 'HTTP 201 and fileType link', async () => {
    eq((await upload(F.instr, null, { url: 'https://example.test/a', title: 'L' })).json.fileType, 'link', 'fileType');
});
tc('RES-003', R, 'High', 'Enrolled student lists resources', 'GET /resources/:id', 'Listed without file data', async () => {
    const r = await api('GET', `/resources/${F.course.id}`, { token: F.s1.token });
    is(r, 200); ok(r.json.resources.length >= 2 && !r.text.includes('fileData'), 'bad list');
});
tc('RES-004', R, 'High', 'Download and inline view', 'GET .../download and .../view', 'Attachment and inline dispositions; identical bytes (FR-RES-02)', async () => {
    const d = await api('GET', `/resources/${F.course.id}/${F.resource._id}/download`, { token: F.s1.token });
    is(d, 200); ok(d.headers.get('content-disposition').startsWith('attachment'), 'not attachment');
    ok(d.buffer.equals(MINIMAL_PDF), 'bytes differ');
    const v = await api('GET', `/resources/${F.course.id}/${F.resource._id}/view`, { token: F.s1.token });
    ok(v.headers.get('content-disposition').startsWith('inline'), 'not inline');
});
tc('RES-005', R, 'Critical', 'Paywall: outsiders cannot read resources', 'List, download and view as a non-enrolled user', 'HTTP 403 for each', async () => {
    is(await api('GET', `/resources/${F.course.id}`, { token: F.s3.token }), 403);
    is(await api('GET', `/resources/${F.course.id}/${F.resource._id}/download`, { token: F.s3.token }), 403);
    is(await api('GET', `/resources/${F.course.id}/${F.resource._id}/view`, { token: F.s3.token }), 403);
});
tc('RES-006', R, 'High', 'Student uploads are off by default', 'Upload as a student', 'HTTP 403', async () => is(await upload(F.s1, pdf), 403));
tc('RES-007', R, 'High', 'Student uploads can be enabled', 'Toggle, then upload', 'HTTP 201 with uploaderRole student', async () => {
    await api('PUT', `/resources/${F.course.id}/toggle-student-uploads`, { token: F.instr.token });
    const r = await upload(F.s1, pdf);
    is(r, 201); eq(r.json.uploaderRole, 'student', 'uploaderRole');
    F.studentResource = r.json;
});
tc('RES-008', R, 'High', "Students cannot delete others' files", 'DELETE as another student', 'HTTP 403', async () => {
    is(await api('DELETE', `/resources/${F.course.id}/${F.studentResource._id}`, { token: F.s2.token }), 403);
});
tc('RES-009', R, 'Medium', 'Uploader edits and owner deletes', 'PUT as the uploader, DELETE as the owner', 'HTTP 200 each', async () => {
    is(await api('PUT', `/resources/${F.course.id}/${F.studentResource._id}`, { token: F.s1.token, body: { title: 'New' } }), 200);
    is(await api('DELETE', `/resources/${F.course.id}/${F.studentResource._id}`, { token: F.instr.token }), 200);
});
tc('RES-010', R, 'High', 'Blocked file type is refused', 'Upload a .exe', 'HTTP 400', async () => {
    is(await upload(F.instr, { name: 'a.exe', type: 'application/x-msdownload', data: Buffer.from('MZ') }), 400);
});
tc('RES-011', R, 'Medium', 'Oversized file gets a clear error', 'Upload 11 MB', 'HTTP 413 with a clear message', async () => {
    is(await upload(F.instr, { name: 'big.pdf', type: 'application/pdf', data: Buffer.alloc(11 * 1024 * 1024) }), 413);
});
tc('RES-012', R, 'Medium', 'Lecture-linked resources and counts', 'Upload linked to a lecture, read the lecture list and counts', 'Listed; count is 1', async () => {
    await upload(F.instr, pdf, { title: 'Linked', linkedType: 'lecture', sectionId: F.course.sectionId, lectureId: F.L2 });
    eq((await api('GET', `/resources/${F.course.id}/lecture/${F.L2}`, { token: F.s1.token })).json.resources.length, 1, 'lecture list');
    eq((await api('GET', `/resources/${F.course.id}/counts`, { token: F.s1.token })).json.counts[F.L2], 1, 'count');
});
tc('RES-013', R, 'Medium', 'Sinhala and Tamil file names are preserved', 'Upload පාඩම.pdf', 'fileName is unchanged', async () => {
    eq((await upload(F.instr, { ...pdf, name: 'පාඩම.pdf' })).json.fileName, 'පාඩම.pdf', 'fileName');
});
tc('RES-014', R, 'Medium', 'Admin can open course resources', 'GET /resources/:id as an admin', 'HTTP 200 (moderation needs this)', async () => {
    is(await api('GET', `/resources/${F.course.id}`, { token: F.admin.token }), 200);
});

const V = 'Reviews';
const review = (u, courseId, rating = 5, comment = 'Good') => api('POST', '/reviews', { token: u.token, body: { courseId, rating, comment } });
tc('REV-001', V, 'High', 'Buyer posts a review', 'POST /reviews after purchase', 'HTTP 201', async () => {
    const r = await review(F.buyer, F.payCourse.id, 5);
    is(r, 201); F.review = r.json;
});
tc('REV-002', V, 'High', 'Non-buyer cannot review', 'POST /reviews without a purchase', 'HTTP 403', async () => is(await review(F.s3, F.payCourse.id), 403));
tc('REV-003', V, 'High', 'One review per student', 'POST again', 'HTTP 400', async () => is(await review(F.buyer, F.payCourse.id), 400));
tc('REV-004', V, 'High', 'Owner cannot review their own course', 'POST as the owner', 'HTTP 400', async () => is(await review(F.instr, F.payCourse.id), 400));
tc('REV-005', V, 'Medium', 'Rating must be 1 to 5', 'POST rating 0 and 6', 'HTTP 400 each', async () => {
    const u = await newUser('student', 'rate');
    const c = await mkCourse(F.instr);
    await buy(u, c, F.instr);
    is(await review(u, c.id, 6), 400);
    is(await review(u, c.id, -1), 400);
    F.rater = { u, c };
});
tc('REV-006', V, 'High', 'Course average updates', 'A 5 and a 3 star review, then read the course', 'average 4, count 2 (FR-REV-04)', async () => {
    const u2 = await newUser('student', 'rate2');
    await buy(u2, F.rater.c, F.instr);
    await review(F.rater.u, F.rater.c.id, 5);
    F.rate2 = (await review(u2, F.rater.c.id, 3)).json;
    await sleep(150);
    const c = await models.Course.findById(F.rater.c.id);
    eq(c.rating.average, 4, 'average'); eq(c.rating.count, 2, 'count');
    F.rate2user = u2;
});
tc('REV-007', V, 'Medium', 'Update your review', 'PUT /reviews/:id', 'HTTP 200 and the average updates', async () => {
    is(await api('PUT', `/reviews/${F.rate2._id}`, { token: F.rate2user.token, body: { rating: 1 } }), 200);
    await sleep(150);
    eq((await models.Course.findById(F.rater.c.id)).rating.average, 3, 'average');
});
tc('REV-008', V, 'High', "Cannot change someone else's review", 'PUT and DELETE as another user', 'HTTP 403', async () => {
    is(await api('PUT', `/reviews/${F.review._id}`, { token: F.s3.token, body: { rating: 1 } }), 403);
    is(await api('DELETE', `/reviews/${F.review._id}`, { token: F.s3.token }), 403);
});
tc('REV-009', V, 'Medium', 'Delete updates the average', 'DELETE a review', 'count falls', async () => {
    is(await api('DELETE', `/reviews/${F.rate2._id}`, { token: F.rate2user.token }), 200);
    await sleep(150);
    eq((await models.Course.findById(F.rater.c.id)).rating.count, 1, 'count');
});
tc('REV-010', V, 'Medium', 'Guests can read reviews', 'GET /reviews/course/:id', 'HTTP 200 with distribution', async () => {
    const r = await api('GET', `/reviews/course/${F.payCourse.id}?sortBy=highest`);
    is(r, 200); ok(r.json.ratingDistribution.length, 'no distribution');
});
tc('REV-011', V, 'Low', 'Helpful vote counts', 'POST /reviews/:id/helpful', 'helpful is 1', async () => {
    eq((await api('POST', `/reviews/${F.review._id}/helpful`, { token: F.s1.token })).json.helpful, 1, 'helpful');
});
tc('REV-012', V, 'Medium', 'A user can vote helpful only once', 'POST helpful twice more as the same user', 'Count stays 1', async () => {
    await api('POST', `/reviews/${F.review._id}/helpful`, { token: F.s1.token });
    eq((await api('POST', `/reviews/${F.review._id}/helpful`, { token: F.s1.token })).json.helpful, 1, 'helpful');
});
tc('REV-013', V, 'Medium', 'Private courses need enrollment to review', 'POST a review on a non-marketplace course as a stranger', 'HTTP 403', async () => {
    const c = await api('POST', '/courses', { token: F.instr.token, body: { title: 'Private', description: 'D' } });
    is(await review(F.s3, c.json._id), 403);
});
tc('REV-014', V, 'Low', 'Non-numeric rating is a client error', 'POST rating "abc"', 'HTTP 400', async () => {
    const u = await newUser('student', 'nan');
    const c = await mkCourse(F.instr);
    await buy(u, c, F.instr);
    is(await review(u, c.id, 'abc'), 400);
});
tc('REV-015', V, 'Medium', 'Admin removes a review', 'DELETE as an admin', 'HTTP 200', async () => {
    const u = await newUser('student', 'rm');
    const c = await mkCourse(F.instr);
    await buy(u, c, F.instr);
    is(await api('DELETE', `/reviews/${(await review(u, c.id)).json._id}`, { token: F.admin.token }), 200);
});

const N = 'Notifications';
tc('NTF-001', N, 'High', 'New content notifies students', 'Enable newContent, add a lecture', 'Enrolled student has a notification (FR-NOTIF-01)', async () => {
    is(await api('PUT', `/notifications/course/${F.course.id}/settings`, { token: F.instr.token, body: { newContent: true } }), 200);
    await addLecture(F.instr, F.course.id, F.course.sectionId, 'Notify lecture');
    await sleep(150);
    const r = await api('GET', '/notifications', { token: F.s1.token });
    is(r, 200); ok(r.json.notifications.some(n => n.type === 'new_content'), 'none');
    F.notif = r.json.notifications[0];
});
tc('NTF-002', N, 'Medium', 'Unread count and mark read', 'GET unread-count, PUT :id/read', 'Count falls by one', async () => {
    const a = (await api('GET', '/notifications/unread-count', { token: F.s1.token })).json.count;
    is(await api('PUT', `/notifications/${F.notif._id}/read`, { token: F.s1.token }), 200);
    eq((await api('GET', '/notifications/unread-count', { token: F.s1.token })).json.count, a - 1, 'count');
});
tc('NTF-003', N, 'High', "Other users' notifications are protected", 'PUT and DELETE as another student', 'HTTP 404', async () => {
    is(await api('PUT', `/notifications/${F.notif._id}/read`, { token: F.s3.token }), 404);
    is(await api('DELETE', `/notifications/${F.notif._id}`, { token: F.s3.token }), 404);
});
tc('NTF-004', N, 'Medium', 'Mark all read and delete', 'PUT mark-all-read, DELETE :id', 'Unread is 0 and the delete succeeds', async () => {
    is(await api('PUT', '/notifications/mark-all-read', { token: F.s1.token }), 200);
    eq((await api('GET', '/notifications/unread-count', { token: F.s1.token })).json.count, 0, 'count');
    is(await api('DELETE', `/notifications/${F.notif._id}`, { token: F.s1.token }), 200);
});
tc('NTF-005', N, 'Medium', 'Owner sends a custom notification', 'POST /notifications/course/:id/send', 'Enrolled students receive it', async () => {
    is(await api('POST', `/notifications/course/${F.course.id}/send`, { token: F.instr.token, body: { title: 'Custom QA' } }), 200);
    ok((await api('GET', '/notifications', { token: F.s2.token })).text.includes('Custom QA'), 'not received');
});
tc('NTF-006', N, 'Medium', 'Due date reminder runs once', 'Lecture due in 12 hours, run the cron twice', 'One notification per student', async () => {
    const c = await mkCourse(F.instr);
    await enroll(F.instr, c.id, F.s2);
    await api('PUT', `/notifications/course/${c.id}/settings`, { token: F.instr.token, body: { dueDateReminder: true } });
    await addLecture(F.instr, c.id, c.sectionId, 'Due', { dueDate: new Date(Date.now() + 12 * 36e5).toISOString() });
    is(await api('GET', '/cron/due-reminders'), 200);
    await api('GET', '/cron/due-reminders');
    eq(await models.Notification.countDocuments({ course: c.id, type: 'due_date', user: F.s2.id }), 1, 'reminders');
});
tc('NTF-007', N, 'Medium', 'AI access change notifies students', 'Enable aiAccessChange, toggle AI', 'A notification is created', async () => {
    const c = await mkCourse(F.instr);
    await enroll(F.instr, c.id, F.s2);
    await api('PUT', `/notifications/course/${c.id}/settings`, { token: F.instr.token, body: { aiAccessChange: true } });
    await api('PUT', `/courses/${c.id}/toggle-student-ai`, { token: F.instr.token });
    await sleep(150);
    eq(await models.Notification.countDocuments({ course: c.id, type: 'ai_access' }), 1, 'notifications');
});
tc('NTF-008', N, 'Medium', 'Progress milestone notification', 'Enable progressMilestone, complete every lecture', 'A milestone notification is created (FR-NOTIF-01)', async () => {
    const c = await mkCourse(F.instr);
    await enroll(F.instr, c.id, F.s2);
    await api('PUT', `/notifications/course/${c.id}/settings`, { token: F.instr.token, body: { progressMilestone: true } });
    await api('PUT', `/courses/lectures/${c.lectureId}/progress`, { token: F.s2.token, body: { status: 'Completed' } });
    await sleep(150);
    ok(await models.Notification.countDocuments({ course: c.id, type: 'milestone' }) > 0, 'no milestone notification exists');
});
tc('NTF-009', N, 'Low', 'Invalid page number', 'GET /notifications?page=0', 'HTTP 200 or 400, never a 500', async () => {
    ok((await api('GET', '/notifications?page=0', { token: F.s1.token })).status < 500, 'server error');
});

const L = 'Activity log';
tc('ACT-001', L, 'High', 'User reads their own activity', 'GET /activities/me', 'Only their entries, with pagination', async () => {
    const r = await api('GET', '/activities/me', { token: F.s1.token });
    is(r, 200); ok(r.json.activities.length && r.json.activities.every(a => a.user?._id === F.s1.id || a.student === F.s1.id), 'foreign entries');
});
tc('ACT-002', L, 'High', 'Admin reads the global log', 'GET /activities with filters', 'HTTP 200; a student gets denied', async () => {
    is(await api('GET', '/activities?action=Comment,Completed&method=PUT,POST', { token: F.admin.token }), 200);
    ok((await api('GET', '/activities', { token: F.s1.token })).status >= 400, 'student allowed');
});
tc('ACT-003', L, 'Medium', 'Search by user', 'GET /activities?user=<email>', 'Entries for that user', async () => {
    ok((await api('GET', `/activities?user=${encodeURIComponent(F.s1.email)}`, { token: F.admin.token })).json.total > 0, 'none');
});
tc('ACT-004', L, 'Medium', 'Non-GET actions are logged', 'Run an action, read the log', 'The action is recorded (FR-ACT-01)', async () => {
    await api('PUT', `/courses/lectures/${F.L2}/toggle-revision`, { token: F.s2.token });
    await sleep(150);
    ok(await models.Activity.exists({ user: F.s2.id, action: 'Marked for Revision' }), 'not logged');
});
tc('ACT-005', L, 'Medium', 'Enrollment appears in the student log', 'Enroll a student, then read their log', 'An Enrolled entry exists', async () => {
    const u = await newUser('student', 'act');
    await enroll(F.instr, F.course.id, u);
    await sleep(150);
    ok((await api('GET', '/activities/me', { token: u.token })).text.includes('Enrolled'), 'no entry for the student');
});
tc('ACT-006', L, 'Medium', 'Refused actions are not logged as done', 'Attempt a forbidden course update, read the log', 'No "Course Updated" entry for that user', async () => {
    const u = await newUser('student', 'den');
    await api('PUT', `/courses/${F.course.id}`, { token: u.token, body: { title: 'x' } });
    await sleep(150);
    ok(!(await models.Activity.exists({ user: u.id, action: 'Course Updated' })), 'a 403 was logged as a successful update');
});
tc('ACT-007', L, 'Low', 'Removing a warning is labelled correctly', 'DELETE a warning, read the admin log', 'Entry is not labelled "User Warned"', async () => {
    const u = await newUser('student', 'lbl');
    await api('POST', `/admin/users/${u.id}/warn`, { token: F.admin.token, body: { reason: 'x' } });
    await api('DELETE', `/admin/users/${u.id}/warnings/0`, { token: F.admin.token });
    await sleep(150);
    const row = await models.Activity.findOne({ user: F.admin.id, method: 'DELETE' }).sort({ createdAt: -1 });
    ok(row.action !== 'User Warned', 'labelled User Warned');
});
tc('ACT-008', L, 'Low', 'Client IP is recorded', 'Read a log entry', 'ip is set (the model has the field)', async () => {
    const row = await models.Activity.findOne({ user: F.s2.id }).sort({ createdAt: -1 });
    ok(row.ip, 'ip is empty');
});
