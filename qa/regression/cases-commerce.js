// Payments, coupons, instructor tools and the admin panel.
const { tc, api, ok, is, eq, lines, newUser, webhook, paidSession, putSession, uid, sleep, serverRequire } = require('./lib');
const { F, models, mkCourse, enroll, buy } = require('./fixtures');

const M = 'Payments';
const checkout = (user, courseId, couponCode) => api('POST', '/purchase/checkout', { token: user.token, body: { courseId, couponCode } });
const enrolled = (u, courseId) => models.Progress.exists({ student: u.id, course: courseId });

tc('PAY-001', M, 'Critical', 'Checkout creates a Stripe session', 'POST /purchase/checkout for a paid course', 'Session URL returned; price, currency and metadata correct; pending purchase saved (FR-PAY-01)', async () => {
    F.buyer = await newUser('student', 'buyer');
    F.payCourse = await mkCourse(F.instr, { price: 5000 });
    const r = await checkout(F.buyer, F.payCourse.id);
    is(r, 200); ok(r.json.url, 'no url');
    const { id, params } = lines('stripe.jsonl').pop();
    const line = params.line_items[0].price_data;
    eq(line.unit_amount, 500000, 'unit_amount'); eq(line.currency, 'lkr', 'currency');
    eq(params.metadata.userId, F.buyer.id, 'metadata.userId');
    eq((await models.Purchase.findOne({ stripeSessionId: id })).status, 'pending', 'purchase status');
    F.paySession = paidSession(id, { courseId: F.payCourse.id, userId: F.buyer.id, instructorId: F.instr.id, amount: 5000 });
});
tc('PAY-002', M, 'Critical', 'Payment webhook completes the purchase', 'Send a signed checkout.session.completed event', 'Purchase completed, student enrolled, enrollment count 1, invoice paid (FR-PAY-02)', async () => {
    is(await webhook('checkout.session.completed', F.paySession), 200);
    const p = await models.Purchase.findOne({ user: F.buyer.id, course: F.payCourse.id });
    eq(p.status, 'completed', 'status'); eq(p.invoiceStatus, 'paid', 'invoiceStatus'); eq(p.amount, 5000, 'amount');
    ok(p.invoiceNumber, 'no invoice number');
    ok(await enrolled(F.buyer, F.payCourse.id), 'not enrolled');
    eq((await models.Course.findById(F.payCourse.id)).enrollmentCount, 1, 'enrollmentCount');
    F.invoice = p.invoiceNumber;
});
tc('PAY-003', M, 'Critical', 'Replayed webhook is idempotent', 'Send the same event again', 'Enrollment count stays 1 (NFR-REL-04)', async () => {
    is(await webhook('checkout.session.completed', F.paySession), 200);
    eq((await models.Course.findById(F.payCourse.id)).enrollmentCount, 1, 'enrollmentCount');
});
tc('PAY-004', M, 'Critical', 'Webhook rejects a bad signature', 'POST the webhook with a forged signature', 'HTTP 400 and nothing changes (NFR-SEC-05)', async () => {
    is(await api('POST', '/purchase/webhook', { raw: '{"type":"checkout.session.completed"}', headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=forged' } }), 400);
});
tc('PAY-005', M, 'High', 'Webhook rejects a missing signature', 'POST the webhook with no signature', 'HTTP 400', async () => {
    is(await api('POST', '/purchase/webhook', { raw: '{}', headers: { 'Content-Type': 'application/json' } }), 400);
});
tc('PAY-006', M, 'High', 'Cannot buy a course twice', 'Check out an owned course', 'HTTP 400', async () => is(await checkout(F.buyer, F.payCourse.id), 400));
tc('PAY-007', M, 'High', 'Cannot buy your own course', 'Check out as the owner', 'HTTP 400', async () => is(await checkout(F.instr, F.payCourse.id), 400));
tc('PAY-008', M, 'High', 'Cannot buy an unpublished course', 'Check out a draft', 'HTTP 404', async () => is(await checkout(F.s3, F.draftMkt.id), 404));
tc('PAY-009', M, 'High', 'Free course enrolls directly', 'Check out a price 0 course', 'enrolled: true, invoice issued, Stripe not called', async () => {
    const c = await mkCourse(F.instr, { price: 0 });
    const before = lines('stripe.jsonl').length;
    const r = await checkout(F.s3, c.id);
    is(r, 200); eq(r.json.enrolled, true, 'enrolled'); ok(r.json.invoiceNumber, 'no invoice');
    eq(lines('stripe.jsonl').length, before, 'Stripe calls');
    ok(await enrolled(F.s3, c.id), 'not enrolled');
});
tc('PAY-010', M, 'High', 'Success page recovers a missed webhook', 'GET /purchase/session/:id while Stripe reports paid but no webhook arrived', 'Purchase becomes completed', async () => {
    const u = await newUser('student', 'nohook');
    const c = await mkCourse(F.instr, { price: 700 });
    await checkout(u, c.id);
    const { id } = lines('stripe.jsonl').pop();
    putSession(paidSession(id, { courseId: c.id, userId: u.id, instructorId: F.instr.id, amount: 700 }));
    const r = await api('GET', `/purchase/session/${id}`, { token: u.token });
    is(r, 200); eq(r.json.status, 'completed', 'status');
    F.sessionCheck = { id, user: u };
});
tc('PAY-011', M, 'High', "Another user cannot read a checkout session", 'GET /purchase/session/:id as someone else', 'HTTP 404', async () => {
    is(await api('GET', `/purchase/session/${F.sessionCheck.id}`, { token: F.s3.token }), 404);
});
tc('PAY-012', M, 'Medium', 'Expired session marks the purchase failed', 'Send checkout.session.expired', 'Status becomes failed; the user can retry', async () => {
    const u = await newUser('student', 'expired');
    const c = await mkCourse(F.instr);
    await checkout(u, c.id);
    const { id } = lines('stripe.jsonl').pop();
    is(await webhook('checkout.session.expired', { id, object: 'checkout.session' }), 200);
    eq((await models.Purchase.findOne({ user: u.id, course: c.id })).status, 'failed', 'status');
    is(await checkout(u, c.id), 200, 'retry');
});
tc('PAY-013', M, 'Medium', 'Unpaid completed session grants nothing', 'Send checkout.session.completed with payment_status unpaid', 'Student is not enrolled', async () => {
    const u = await newUser('student', 'unpaid');
    const c = await mkCourse(F.instr);
    await checkout(u, c.id);
    const { id } = lines('stripe.jsonl').pop();
    await webhook('checkout.session.completed', { ...paidSession(id, { courseId: c.id, userId: u.id, instructorId: F.instr.id, amount: 1000 }), payment_status: 'unpaid' });
    ok(!(await enrolled(u, c.id)), 'enrolled without payment');
});
tc('PAY-014', M, 'Medium', 'Webhook without metadata is ignored safely', 'Send a completed event with no metadata', 'HTTP 200 and no crash', async () => {
    is(await webhook('checkout.session.completed', { id: 'cs_none', payment_status: 'paid', currency: 'lkr', amount_total: 1 }), 200);
});
tc('PAY-015', M, 'High', 'Parallel confirmations count once', 'Send the webhook twice at the same moment', 'Enrollment count is 1', async () => {
    const u = await newUser('student', 'race');
    const c = await mkCourse(F.instr);
    await checkout(u, c.id);
    const { id } = lines('stripe.jsonl').pop();
    const s = paidSession(id, { courseId: c.id, userId: u.id, instructorId: F.instr.id, amount: 1000 });
    await Promise.all([webhook('checkout.session.completed', s), webhook('checkout.session.completed', s)]);
    eq((await models.Course.findById(c.id)).enrollmentCount, 1, 'enrollmentCount');
});
tc('PAY-016', M, 'High', 'Parallel purchases get unique invoices', 'Five students enroll in a free course together', 'All succeed with five different invoice numbers', async () => {
    const c = await mkCourse(F.instr, { price: 0 });
    const users = await Promise.all([1, 2, 3, 4, 5].map(i => newUser('student', 'par' + i)));
    const rs = await Promise.all(users.map(u => checkout(u, c.id)));
    rs.forEach(r => is(r, 200));
    eq(new Set(rs.map(r => r.json.invoiceNumber)).size, 5, 'unique invoices');
});
tc('PAY-017', M, 'High', 'USD amounts convert to cents', 'Check out a USD 19.99 course', 'unit_amount 1999, currency usd', async () => {
    const c = await mkCourse(F.instr, { price: 19.99, currency: 'USD' });
    await checkout(F.s3, c.id);
    const line = lines('stripe.jsonl').pop().params.line_items[0].price_data;
    eq(line.unit_amount, 1999, 'unit_amount'); eq(line.currency, 'usd', 'currency');
});
tc('PAY-018', M, 'Critical', 'Full refund removes access', 'Buy a course, send charge.refunded with refunded true', 'Purchase refunded, access removed, count reduced', async () => {
    const u = await newUser('student', 'refund');
    const c = await mkCourse(F.instr);
    const s = await buy(u, c, F.instr);
    is(await webhook('charge.refunded', { refunded: true, payment_intent: s.payment_intent }), 200);
    eq((await models.Purchase.findOne({ user: u.id, course: c.id })).status, 'refunded', 'status');
    ok(!(await enrolled(u, c.id)), 'still enrolled');
    eq((await models.Course.findById(c.id)).enrollmentCount, 0, 'enrollmentCount');
    F.refund = { u, c, s };
});
tc('PAY-019', M, 'High', 'Replay after refund does not restore access', 'Resend the original completed event', 'Student stays unenrolled', async () => {
    await webhook('checkout.session.completed', F.refund.s);
    ok(!(await enrolled(F.refund.u, F.refund.c.id)), 'access restored by a replay');
});
tc('PAY-020', M, 'High', 'Student can buy again after a refund', 'Check out and pay again', 'Purchase completed and access granted', async () => {
    await buy(F.refund.u, F.refund.c, F.instr);
    eq((await models.Purchase.findOne({ user: F.refund.u.id, course: F.refund.c.id })).status, 'completed', 'status');
    ok(await enrolled(F.refund.u, F.refund.c.id), 'not enrolled');
});
tc('PAY-021', M, 'High', 'Partial refund keeps access', 'Send charge.refunded with refunded false', 'Purchase stays completed', async () => {
    const u = await newUser('student', 'partial');
    const c = await mkCourse(F.instr);
    const s = await buy(u, c, F.instr);
    await webhook('charge.refunded', { refunded: false, payment_intent: s.payment_intent });
    eq((await models.Purchase.findOne({ user: u.id, course: c.id })).status, 'completed', 'status');
});
tc('PAY-022', M, 'High', 'Purchase history and verification', 'GET /purchase/my-purchases and /purchase/verify/:id', 'The purchase is listed and hasPurchased is true', async () => {
    ok((await api('GET', '/purchase/my-purchases', { token: F.buyer.token })).json.some(p => p.invoiceNumber === F.invoice), 'not listed');
    eq((await api('GET', `/purchase/verify/${F.payCourse.id}`, { token: F.buyer.token })).json.hasPurchased, true, 'hasPurchased');
    eq((await api('GET', `/purchase/verify/${F.payCourse.id}`, { token: F.s3.token })).json.hasPurchased, false, 'outsider');
});
tc('PAY-023', M, 'Critical', 'Invoice visible only to buyer, instructor and admin', 'GET /purchase/invoice/:n as each role and as a stranger', 'Allowed roles get 200; a stranger gets 404; a guest gets 401', async () => {
    const url = `/purchase/invoice/${F.invoice}`;
    for (const u of [F.buyer, F.instr, F.admin]) is(await api('GET', url, { token: u.token }), 200);
    is(await api('GET', url, { token: F.s3.token }), 404, 'stranger');
    is(await api('GET', url), 401, 'guest');
});
tc('PAY-024', M, 'High', 'Invoice PDF downloads', 'GET /purchase/invoice/:n/pdf', 'A valid PDF is returned', async () => {
    const r = await api('GET', `/purchase/invoice/${F.invoice}/pdf`, { token: F.buyer.token });
    is(r, 200); eq(r.headers.get('content-type'), 'application/pdf', 'content-type');
    ok(r.buffer.subarray(0, 4).toString() === '%PDF', 'not a PDF');
    F.invoicePdf = r.buffer;
});
tc('PAY-025', M, 'Medium', 'Invoice shows the product name', 'Read the text of the invoice PDF', 'It says Tenz Learn', async () => {
    const { PDFParse } = serverRequire('pdf-parse');
    const parser = new PDFParse({ data: F.invoicePdf });
    const { text } = await parser.getText();
    await parser.destroy();
    ok(/Tenz Learn/i.test(text), `invoice header reads "${text.trim().split('\n')[0]}"`);
});
tc('PAY-026', M, 'Critical', 'Blocked course cannot be sold', 'Block a course, then check out', 'Checkout is refused', async () => {
    const c = await mkCourse(F.instr);
    await api('POST', `/admin/courses/${c.id}/block`, { token: F.admin.token, body: { reason: 'qa' } });
    const r = await checkout(F.s3, c.id);
    ok(r.status >= 400, 'a Stripe payment session was created for a blocked course');
});
tc('PAY-027', M, 'High', 'Already enrolled student is not charged', 'Enroll a student manually, then check out', 'Checkout is refused', async () => {
    const c = await mkCourse(F.instr);
    await enroll(F.instr, c.id, F.s3);
    const r = await checkout(F.s3, c.id);
    ok(r.status >= 400, 'student who already has access can still be charged');
});
tc('PAY-028', M, 'High', 'A removed buyer can regain access', 'Buy, get removed by the instructor, then try to buy again', 'Checkout works, or access can otherwise be restored', async () => {
    const u = await newUser('student', 'locked');
    const c = await mkCourse(F.instr);
    await buy(u, c, F.instr);
    await api('DELETE', `/courses/${c.id}/enroll/${u.id}`, { token: F.instr.token });
    const r = await checkout(u, c.id);
    ok(r.status === 200, `student paid, has no access and cannot rebuy: HTTP ${r.status} ${r.json?.message}`);
});
tc('PAY-029', M, 'Medium', 'Removing a student updates the enrollment count', 'Buy, remove the student, read enrollmentCount', 'Count goes back to 0', async () => {
    const u = await newUser('student', 'cnt');
    const c = await mkCourse(F.instr);
    await buy(u, c, F.instr);
    await api('DELETE', `/courses/${c.id}/enroll/${u.id}`, { token: F.instr.token });
    eq((await models.Course.findById(c.id)).enrollmentCount, 0, 'enrollmentCount');
});
tc('PAY-030', M, 'High', 'A sold course cannot be deleted', 'Buy a course, then DELETE it as the owner', 'The delete is refused, so buyers keep their course', async () => {
    const u = await newUser('student', 'sold');
    const c = await mkCourse(F.instr);
    await buy(u, c, F.instr);
    const r = await api('DELETE', `/courses/${c.id}`, { token: F.instr.token });
    ok(r.status >= 400, 'course with paying students was deleted');
});
tc('PAY-031', M, 'Medium', 'Bought course stays available after archiving', 'Buy a course, archive it, read /courses/my/enrolled', 'The buyer still sees the course', async () => {
    const u = await newUser('student', 'arch');
    const c = await mkCourse(F.instr);
    await buy(u, c, F.instr);
    await api('PUT', `/instructor/course/${c.id}`, { token: F.instr.token, body: { status: 'Archived' } });
    ok((await api('GET', '/courses/my/enrolled', { token: u.token })).json.some(p => p.course._id === c.id), 'paid course disappeared');
});

const C = 'Coupons';
const coupon = (over = {}, owner = F.instr, courseId = F.couponCourse.id) => api('POST', '/coupons', {
    token: owner.token,
    body: { code: 'QA' + uid(), courseId, discountType: 'percentage', discountValue: 10, validUntil: new Date(Date.now() + 864e5).toISOString(), ...over }
});
const validate = (code, courseId = F.couponCourse.id) => api('POST', '/coupons/validate', { token: F.s3.token, body: { code, courseId } });

tc('CPN-001', C, 'High', 'Create a coupon', 'POST /coupons', 'HTTP 201 and the code is uppercased', async () => {
    F.couponCourse = await mkCourse(F.instr, { price: 1000 });
    const r = await coupon({ code: 'save10' });
    is(r, 201); eq(r.json.code, 'SAVE10', 'code');
    F.coupon = r.json;
});
tc('CPN-002', C, 'Medium', 'Reject a duplicate code', 'Create the same code again', 'HTTP 400', async () => is(await coupon({ code: 'SAVE10' }), 400));
tc('CPN-003', C, 'High', 'Non-owner cannot create a coupon', 'POST /coupons as another instructor', 'HTTP 403', async () => is(await coupon({}, F.instr2), 403));
tc('CPN-004', C, 'High', 'Students cannot create coupons', 'POST /coupons as a student', 'Denied', async () => ok((await coupon({}, F.s1)).status >= 400, 'allowed'));
tc('CPN-005', C, 'Medium', 'Reject a percentage above 100', 'discountValue 150', 'HTTP 400', async () => is(await coupon({ discountValue: 150 }), 400));
tc('CPN-006', C, 'Medium', 'Reject a fixed discount at or above the price', 'Fixed discount 1000 on a 1000 course', 'HTTP 400', async () => is(await coupon({ discountType: 'fixed', discountValue: 1000 }), 400));
tc('CPN-007', C, 'High', 'Validate a coupon', 'POST /coupons/validate in lowercase', 'discountAmount 100, finalPrice 900', async () => {
    const r = await validate('save10');
    is(r, 200); eq(r.json.discountAmount, 100, 'discount'); eq(r.json.finalPrice, 900, 'final');
});
tc('CPN-008', C, 'High', 'Unknown code is rejected', 'Validate a random code', 'HTTP 404', async () => is(await validate('NOPE'), 404));
tc('CPN-009', C, 'High', 'Coupon only works on its own course', 'Validate SAVE10 on another course', 'HTTP 404', async () => is(await validate('SAVE10', F.payCourse.id), 404));
tc('CPN-010', C, 'High', 'Expired coupon is rejected', 'Set validUntil to the past, then validate', 'HTTP 400', async () => {
    const r = await coupon();
    await api('PUT', `/coupons/${r.json._id}`, { token: F.instr.token, body: { validUntil: new Date(Date.now() - 1000).toISOString() } });
    is(await validate(r.json.code), 400);
});
tc('CPN-011', C, 'High', 'Inactive coupon is rejected', 'Set isActive false, then validate', 'HTTP 400', async () => {
    const r = await coupon();
    await api('PUT', `/coupons/${r.json._id}`, { token: F.instr.token, body: { isActive: false } });
    is(await validate(r.json.code), 400);
});
tc('CPN-012', C, 'High', 'Usage limit is enforced', 'Use a maxUses 1 coupon twice', 'Second use is refused (FR-MKT-05)', async () => {
    const c = await mkCourse(F.instr, { price: 1000 });
    const r = await coupon({ maxUses: 1, discountValue: 100 }, F.instr, c.id);
    const a = await newUser('student', 'cu1'), b = await newUser('student', 'cu2');
    is(await checkout(a, c.id, r.json.code), 200);
    is(await checkout(b, c.id, r.json.code), 400);
});
tc('CPN-013', C, 'High', 'Discount reaches Stripe', 'Check out with SAVE10', 'unit_amount 90000', async () => {
    const u = await newUser('student', 'cu3');
    await checkout(u, F.couponCourse.id, 'SAVE10');
    eq(lines('stripe.jsonl').pop().params.line_items[0].price_data.unit_amount, 90000, 'unit_amount');
});
tc('CPN-014', C, 'High', 'Invalid coupon stops checkout', 'Check out with a bad code', 'HTTP 400 and no charge at full price', async () => {
    is(await checkout(F.s3, F.couponCourse.id, 'BAD'), 400);
});
tc('CPN-015', C, 'High', 'Usage count rises only after payment', 'Check out without paying, then pay', 'usedCount goes 0 then 1', async () => {
    const r = await coupon();
    const u = await newUser('student', 'cu4');
    await checkout(u, F.couponCourse.id, r.json.code);
    eq((await models.Coupon.findById(r.json._id)).usedCount, 0, 'before payment');
    const { id } = lines('stripe.jsonl').pop();
    await webhook('checkout.session.completed', paidSession(id, { courseId: F.couponCourse.id, userId: u.id, instructorId: F.instr.id, amount: 900, couponId: r.json._id, discount: 100, original: 1000 }));
    eq((await models.Coupon.findById(r.json._id)).usedCount, 1, 'after payment');
});
tc('CPN-016', C, 'Medium', 'List, update and delete', 'GET course coupons, PUT, DELETE', 'All succeed for the owner; others get 403', async () => {
    is(await api('GET', `/coupons/course/${F.couponCourse.id}`, { token: F.instr.token }), 200);
    is(await api('GET', `/coupons/course/${F.couponCourse.id}`, { token: F.instr2.token }), 403, 'other instructor');
    const r = await coupon();
    is(await api('PUT', `/coupons/${r.json._id}`, { token: F.instr2.token, body: { discountValue: 90 } }), 403, 'other instructor update');
    is(await api('DELETE', `/coupons/${r.json._id}`, { token: F.instr.token }), 200);
});
tc('CPN-017', C, 'High', 'Reject a negative fixed discount', 'Create a fixed coupon of -500', 'HTTP 400', async () => is(await coupon({ discountType: 'fixed', discountValue: -500 }), 400));
tc('CPN-018', C, 'High', 'Update applies the same limits as create', 'PUT a coupon to discountValue 500 percent', 'HTTP 400', async () => {
    const r = await coupon();
    is(await api('PUT', `/coupons/${r.json._id}`, { token: F.instr.token, body: { discountValue: 500 } }), 400);
});
tc('CPN-019', C, 'Medium', 'maxUses 0 does not mean unlimited', 'Create a coupon with maxUses 0', 'Rejected, or stored as 0 and unusable', async () => {
    const r = await coupon({ maxUses: 0 });
    ok(r.status === 400 || r.json.maxUses === 0, `stored maxUses is ${r.json.maxUses} (unlimited)`);
});
tc('CPN-020', C, 'Low', 'Reject a coupon that is already expired', 'Create with validUntil in the past', 'HTTP 400', async () => {
    is(await coupon({ validUntil: new Date(Date.now() - 864e5).toISOString() }), 400);
});
tc('CPN-021', C, 'High', 'Usage limit holds under parallel use', 'Two students use a maxUses 1 free coupon together', 'Only one succeeds', async () => {
    const c = await mkCourse(F.instr, { price: 1000 });
    const r = await coupon({ maxUses: 1, discountValue: 100 }, F.instr, c.id);
    const users = await Promise.all([1, 2, 3, 4].map(i => newUser('student', 'cr' + i)));
    await Promise.all(users.map(u => checkout(u, c.id, r.json.code)));
    const used = (await models.Coupon.findById(r.json._id)).usedCount;
    ok(used <= 1, `maxUses 1 was redeemed ${used} times`);
});
tc('CPN-022', C, 'Medium', 'Percentage discount keeps cents on USD courses', 'Validate a 1 percent coupon on a USD 19.99 course', 'discountAmount is 0.20, not 0', async () => {
    const c = await mkCourse(F.instr, { price: 19.99, currency: 'USD' });
    const r = await coupon({ discountValue: 1 }, F.instr, c.id);
    const v = await validate(r.json.code, c.id);
    eq(v.json.discountAmount, 0.2, 'discountAmount');
});
tc('CPN-023', C, 'Low', 'Non-text coupon code is a client error', 'POST /coupons/validate with code as an object', 'HTTP 400', async () => {
    is(await api('POST', '/coupons/validate', { token: F.s3.token, body: { code: { a: 1 }, courseId: F.couponCourse.id } }), 400);
});

const I = 'Instructor tools';
tc('INS-001', I, 'High', 'Student becomes an instructor', 'POST /instructor/become', 'Role is instructor', async () => {
    const u = await newUser('student', 'become');
    const r = await api('POST', '/instructor/become', { token: u.token, body: { bio: 'Hi' } });
    is(r, 200); eq(r.json.user.role, 'instructor', 'role');
});
tc('INS-002', I, 'High', 'Instructor dashboard and earnings totals', 'GET /instructor/dashboard and /earnings', 'Revenue equals completed sales', async () => {
    const u = await newUser('teacher', 'earn');
    const c = await mkCourse(u, { price: 2500 });
    await buy(F.s3, c, u);
    const d = await api('GET', '/instructor/dashboard', { token: u.token });
    is(d, 200); eq(d.json.totalRevenue, 2500, 'totalRevenue');
    const e = await api('GET', '/instructor/earnings', { token: u.token });
    eq(e.json.pendingAmount, 2500, 'pendingAmount');
    F.earner = { u, c };
});
tc('INS-003', I, 'High', 'LKR and USD earnings stay separate', 'Sell in USD too, then read earnings', 'USD total is separate and not added to LKR', async () => {
    const c = await mkCourse(F.earner.u, { price: 10, currency: 'USD' });
    await buy(F.s3, c, F.earner.u);
    const e = await api('GET', '/instructor/earnings', { token: F.earner.u.token });
    eq(e.json.byCurrency.USD.earned, 10, 'USD'); eq(e.json.byCurrency.LKR.earned, 2500, 'LKR');
});
tc('INS-004', I, 'High', 'Course sales are private', 'GET /instructor/course/:id/sales as another instructor', 'HTTP 403', async () => {
    is(await api('GET', `/instructor/course/${F.earner.c.id}/sales`, { token: F.earner.u.token }), 200);
    is(await api('GET', `/instructor/course/${F.earner.c.id}/sales`, { token: F.instr2.token }), 403);
});
tc('INS-005', I, 'High', 'Save and read bank details', 'POST then GET /instructor/bank-details', 'Saved values are returned', async () => {
    is(await api('POST', '/instructor/bank-details', { token: F.instr2.token, body: { accountHolderName: 'QA', accountNumber: '1234567890', bankName: 'Test' } }), 200);
    eq((await api('GET', '/instructor/bank-details', { token: F.instr2.token })).json.accountNumber, '1234567890', 'accountNumber');
});
tc('INS-006', I, 'Medium', 'Bank details need a holder name', 'POST without accountHolderName', 'HTTP 400', async () => {
    is(await api('POST', '/instructor/bank-details', { token: F.instr2.token, body: {} }), 400);
});
tc('INS-007', I, 'High', 'Instructor routes reject students', 'GET /instructor/dashboard as a student', 'Denied', async () => {
    ok((await api('GET', '/instructor/dashboard', { token: F.s1.token })).status >= 400, 'allowed');
});
tc('INS-008', I, 'Medium', 'Instructor profile update', 'PUT /instructor/profile', 'HTTP 200', async () => {
    is(await api('PUT', '/instructor/profile', { token: F.instr.token, body: { bio: 'Instructor bio' } }), 200);
});

const A = 'Admin';
const adm = (m, url, body) => api(m, `/admin${url}`, { token: F.admin.token, body });

tc('ADM-001', A, 'High', 'Dashboard statistics', 'GET /admin/dashboard', 'HTTP 200 with user and revenue totals', async () => {
    const r = await adm('GET', '/dashboard');
    is(r, 200); ok(r.json.stats.totalUsers > 0, 'no users');
});
tc('ADM-002', A, 'Critical', 'Users list excludes passwords', 'GET /admin/users', 'Users are listed and no password field is present', async () => {
    const r = await adm('GET', '/users');
    is(r, 200); ok(r.json.length > 0 && !r.json.some(u => 'password' in u), 'password returned');
});
tc('ADM-003', A, 'High', 'Warn a user', 'POST /admin/users/:id/warn', 'Warning is recorded', async () => {
    F.warned = await newUser('student', 'warned');
    const r = await adm('POST', `/users/${F.warned.id}/warn`, { reason: 'First' });
    is(r, 200); eq(r.json.warnings.length, 1, 'warnings');
});
tc('ADM-004', A, 'Medium', 'Warning needs a reason', 'POST warn with no reason', 'HTTP 400', async () => is(await adm('POST', `/users/${F.warned.id}/warn`, {}), 400));
tc('ADM-005', A, 'High', 'Reaching the warning limit blocks the user', 'Issue a second warning', 'isBlocked is true', async () => {
    eq((await adm('POST', `/users/${F.warned.id}/warn`, { reason: 'Second' })).json.isBlocked, true, 'isBlocked');
});
tc('ADM-006', A, 'High', 'Removing a warning lifts the auto-block', 'DELETE warnings/0', 'isBlocked is false', async () => {
    eq((await adm('DELETE', `/users/${F.warned.id}/warnings/0`)).json.isBlocked, false, 'isBlocked');
});
tc('ADM-007', A, 'Medium', 'Invalid warning index changes nothing', 'DELETE warnings/abc', 'HTTP 400 and the warning stays', async () => {
    const r = await adm('DELETE', `/users/${F.warned.id}/warnings/abc`);
    const left = (await models.User.findById(F.warned.id)).warnings.length;
    ok(r.status === 400 && left === 1, `HTTP ${r.status}, ${left} warning(s) left`);
});
tc('ADM-008', A, 'Medium', 'Set the warning limit', 'POST max-warnings 5', 'HTTP 200', async () => {
    eq((await adm('POST', `/users/${F.warned.id}/max-warnings`, { maxWarnings: 5 })).json.maxWarnings, 5, 'maxWarnings');
});
tc('ADM-009', A, 'Low', 'Non-numeric warning limit is rejected', 'POST max-warnings "abc"', 'HTTP 400', async () => is(await adm('POST', `/users/${F.warned.id}/max-warnings`, { maxWarnings: 'abc' }), 400));
tc('ADM-010', A, 'Critical', 'Blocked user cannot log in', 'Block a user, then log in', 'HTTP 403 (FR-ADMIN-02)', async () => {
    F.blocked = await newUser('teacher', 'blocked');
    F.blockedCourse = await mkCourse(F.blocked);
    is(await adm('POST', `/users/${F.blocked.id}/block`, { reason: 'qa', hideCourses: true }), 200);
    is(await api('POST', '/auth/login', { body: { email: F.blocked.email, password: F.blocked.password } }), 403);
});
tc('ADM-011', A, 'High', 'Blocking with hideCourses hides their courses', 'GET the marketplace landing page', 'HTTP 404', async () => is(await api('GET', `/marketplace/${F.blockedCourse.id}`), 404));
tc('ADM-012', A, 'High', 'Unblock restores login and courses', 'POST unblock', 'Login works and the course is visible', async () => {
    is(await adm('POST', `/users/${F.blocked.id}/unblock`), 200);
    is(await api('POST', '/auth/login', { body: { email: F.blocked.email, password: F.blocked.password } }), 200);
    is(await api('GET', `/marketplace/${F.blockedCourse.id}`), 200);
});
tc('ADM-013', A, 'High', 'Change a user role', 'POST role instructor', 'HTTP 200', async () => {
    eq((await adm('POST', `/users/${F.warned.id}/role`, { role: 'instructor' })).json.role, 'instructor', 'role');
});
tc('ADM-014', A, 'Critical', 'Role change cannot create an admin', 'POST role admin', 'HTTP 400', async () => is(await adm('POST', `/users/${F.warned.id}/role`, { role: 'admin' }), 400));
tc('ADM-015', A, 'High', 'Block and unblock a course', 'POST courses/:id/block and unblock', 'Marketplace hides, then shows it', async () => {
    const c = await mkCourse(F.instr);
    is(await adm('POST', `/courses/${c.id}/block`, { reason: 'qa' }), 200);
    is(await api('GET', `/marketplace/${c.id}`), 404, 'blocked');
    is(await adm('POST', `/courses/${c.id}/unblock`), 200);
    is(await api('GET', `/marketplace/${c.id}`), 200, 'unblocked');
});
tc('ADM-016', A, 'High', 'Instructor list and detail', 'GET /admin/instructors and /instructors/:id', 'HTTP 200 with earnings and bank details', async () => {
    is(await adm('GET', '/instructors'), 200);
    is(await adm('GET', `/instructors/${F.earner.u.id}`), 200);
});
tc('ADM-017', A, 'Critical', 'Create a payout within the balance', 'POST /admin/payouts for 1000', 'HTTP 201; pending falls by 1000', async () => {
    is(await adm('POST', '/payouts', { instructorId: F.earner.u.id, amount: 1000, method: 'bank_transfer' }), 201);
    eq((await api('GET', '/instructor/earnings', { token: F.earner.u.token })).json.pendingAmount, 1500, 'pendingAmount');
});
tc('ADM-018', A, 'Critical', 'Payout cannot exceed the balance', 'POST a payout for 999999', 'HTTP 400', async () => {
    is(await adm('POST', '/payouts', { instructorId: F.earner.u.id, amount: 999999, method: 'bank_transfer' }), 400);
});
tc('ADM-019', A, 'High', 'Payout amount must be positive', 'POST a payout for -500', 'HTTP 400', async () => {
    is(await adm('POST', '/payouts', { instructorId: F.earner.u.id, amount: -500, method: 'bank_transfer' }), 400);
});
tc('ADM-020', A, 'Medium', 'Payout history', 'GET /admin/payouts', 'HTTP 200 with records', async () => {
    ok((await adm('GET', '/payouts')).json.total >= 1, 'no payouts');
});
tc('ADM-021', A, 'High', 'Impersonate a user', 'POST /admin/impersonate with an email', 'The returned token acts as that user', async () => {
    const r = await adm('POST', '/impersonate', { email: F.s2.email });
    is(r, 200);
    eq((await api('GET', '/auth/me', { token: r.json.token })).json._id, F.s2.id, 'impersonated id');
    F.impToken = r.json.token;
});
tc('ADM-022', A, 'Medium', 'Impersonating an unknown user', 'POST with an unknown email', 'HTTP 404', async () => is(await adm('POST', '/impersonate', { email: 'nobody@qa.test' }), 404));
tc('ADM-023', A, 'Medium', 'Admin cannot lock themselves out', 'Block your own admin account', 'HTTP 400', async () => {
    const email = `admin2.${uid()}@qa.test`, password = 'Qa-' + uid();
    await models.User.create({ name: 'A2', email, password, role: 'admin' });
    const t = (await api('POST', '/auth/admin/login', { body: { email, password } })).json;
    is(await api('POST', `/admin/users/${t._id}/block`, { token: t.token, body: { reason: 'self' } }), 400);
});
tc('ADM-024', A, 'High', 'Role change cannot demote an admin', 'POST role student for an admin account', 'Refused', async () => {
    const email = `admin3.${uid()}@qa.test`;
    const u = await models.User.create({ name: 'A3', email, password: 'Qa-' + uid(), role: 'admin' });
    ok((await adm('POST', `/users/${u._id}/role`, { role: 'student' })).status >= 400, 'admin was demoted');
});
