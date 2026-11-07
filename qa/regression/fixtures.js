// Accounts and courses shared by the test cases. Credentials are generated per run.
const { api, is, lines, newUser, webhook, paidSession, sleep, uid, serverRequire, env } = require('./lib');

const F = {};
const mongoose = serverRequire('mongoose');
const models = {};

const addSection = async (owner, courseId, title, isPublic = true) => {
    const r = await api('POST', `/courses/${courseId}/sections`, { token: owner.token, body: { title, isPublic } });
    is(r, 201, 'add section');
    return r.json.sections[r.json.sections.length - 1]._id;
};

const addLecture = async (owner, courseId, sectionId, title, extra = {}) => {
    const r = await api('POST', `/courses/${courseId}/sections/${sectionId}/lectures`, {
        token: owner.token,
        body: { title, number: 1, description: `${title} body`, resourceUrl: 'https://youtu.be/qa', isPublic: true, ...extra }
    });
    is(r, 201, 'add lecture');
    return r.json._id;
};

const mkCourse = async (owner, { price = 1000, currency = 'LKR', status = 'Published', title = 'QA course' } = {}) => {
    const r = await api('POST', '/instructor/course', {
        token: owner.token,
        body: { title: `${title} ${uid()}`, description: 'QA description', price, currency, category: 'Testing', level: 'Beginner' }
    });
    is(r, 201, 'create marketplace course');
    const id = r.json._id;
    if (status !== 'Draft') is(await api('PUT', `/instructor/course/${id}`, { token: owner.token, body: { status } }), 200, 'publish');
    const sectionId = await addSection(owner, id, 'Section');
    const lectureId = await addLecture(owner, id, sectionId, 'Lecture');
    return { id, sectionId, lectureId, price, currency };
};

const enroll = async (owner, courseId, student) => {
    is(await api('POST', `/courses/${courseId}/enroll`, { token: owner.token, body: { email: student.email } }), 201, 'enroll');
};

// Full paid purchase: real checkout endpoint, then a signed webhook
const buy = async (student, course, instructor) => {
    is(await api('POST', '/purchase/checkout', { token: student.token, body: { courseId: course.id } }), 200, 'checkout');
    const { id } = lines('stripe.jsonl').pop();
    const session = paidSession(id, { courseId: course.id, userId: student.id, instructorId: instructor.id, amount: course.price, currency: course.currency.toLowerCase() });
    is(await webhook('checkout.session.completed', session), 200, 'webhook');
    return session;
};

const seed = async () => {
    await mongoose.connect(env.MONGO);
    for (const name of ['User', 'Course', 'Lecture', 'Purchase', 'Progress', 'Activity', 'Coupon', 'QuizAttempt', 'Notification', 'InstructorAIConfig', 'Payout', 'Conversation', 'Resource', 'Review', 'Broadcast', 'CommissionPayment']) {
        models[name] = serverRequire(`./models/${name}`);
    }

    // The admin is inserted directly so the suite does not depend on open admin registration
    const adminEmail = `admin.${uid()}@qa.test`;
    const adminPassword = 'Qa-' + uid() + uid();
    await models.User.create({ name: 'QA admin', email: adminEmail, password: adminPassword, role: 'admin' });
    const login = await api('POST', '/auth/admin/login', { body: { email: adminEmail, password: adminPassword } });
    is(login, 200, 'admin login');
    F.admin = { id: login.json._id, email: adminEmail, password: adminPassword, token: login.json.token };

    F.instr = await newUser('instructor', 'owner');
    F.instr2 = await newUser('instructor', 'other-instructor');
    F.s1 = await newUser('student', 'student1');
    F.s2 = await newUser('student', 'student2');
    F.s3 = await newUser('student', 'outsider');

    const course = await mkCourse(F.instr, { price: 5000, title: 'Main course' });
    F.course = course;
    F.L1 = course.lectureId;
    await api('PUT', `/courses/lectures/${F.L1}`, { token: F.instr.token, body: { isPreview: true } });
    F.L2 = await addLecture(F.instr, course.id, course.sectionId, 'Public lecture');
    F.L3 = await addLecture(F.instr, course.id, course.sectionId, 'SECRET hidden lecture', { isPublic: false });
    F.hiddenSection = await addSection(F.instr, course.id, 'SECRET hidden section', false);
    F.L4 = await addLecture(F.instr, course.id, F.hiddenSection, 'Lecture in hidden section');

    await enroll(F.instr, course.id, F.s1);
    await enroll(F.instr, course.id, F.s2);
    await sleep(100);
};

module.exports = { F, models, mkCourse, addSection, addLecture, enroll, buy, seed, mongoose };
