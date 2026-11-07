// Shared helpers for the regression suite.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createRequire } = require('module');
const env = require('./env');

const serverRequire = createRequire(path.join(env.SERVER_DIR, 'index.js'));

const cases = [];
const tc = (id, module, priority, title, steps, expected, fn) => {
    if (cases.some(c => c.id === id)) throw new Error(`Duplicate test id ${id}`);
    cases.push({ id, module, priority, title, steps, expected, fn });
};

const snip = (r) => (r.text || '').replace(/\s+/g, ' ').slice(0, 170);

const call = async (base, method, url, { token, body, headers = {}, raw, form } = {}) => {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    const init = { method, headers: h };
    if (form) init.body = form;
    else if (raw !== undefined) init.body = raw;
    else if (body !== undefined) {
        h['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
    }
    const res = await fetch(base + url, init);
    const buffer = Buffer.from(await res.arrayBuffer());
    const text = buffer.toString('utf8');
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, headers: res.headers, text, json, buffer };
};

const api = (method, url, opts) => call(env.DEV, method, url, opts);
const prod = (method, url, opts) => call(env.PROD, method, url, opts);

const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
const is = (r, code, note = '') => ok(r.status === code, `${note ? note + ': ' : ''}expected HTTP ${code}, got ${r.status} - ${snip(r)}`);
const eq = (a, b, label) => ok(a === b, `${label}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const lines = (file) => {
    const p = path.join(env.out, file);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const uid = () => crypto.randomBytes(4).toString('hex');
const lastOtp = (email) => {
    const mail = lines('mail.jsonl').filter(m => m.to === email).pop();
    return mail?.subject.match(/(\d{6})/)?.[1];
};
const googleCode = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');

const stripeLib = new (serverRequire('stripe'))('sk_test_qa_local_only');

// Sends a correctly signed Stripe event to the real webhook handler
const webhook = (type, object) => {
    const payload = JSON.stringify({ id: 'evt_' + uid(), object: 'event', type, data: { object } });
    const sig = stripeLib.webhooks.generateTestHeaderString({ payload, secret: env.secrets.STRIPE_WEBHOOK_SECRET });
    return api('POST', '/purchase/webhook', { raw: payload, headers: { 'Content-Type': 'application/json', 'stripe-signature': sig } });
};

const paidSession = (id, { courseId, userId, instructorId, amount, currency = 'lkr', intent, couponId = '', discount = 0, original }) => ({
    id,
    object: 'checkout.session',
    payment_status: 'paid',
    payment_intent: intent || 'pi_' + uid(),
    amount_total: Math.round(amount * 100),
    currency,
    metadata: { courseId, userId, instructorId, couponId, discountAmount: String(discount), originalPrice: String(original ?? amount) }
});

const putSession = (session) => {
    const file = path.join(env.out, 'stripe-sessions.json');
    const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    all[session.id] = session;
    fs.writeFileSync(file, JSON.stringify(all));
};

const newUser = async (kind = 'student', label = 'user') => {
    const email = `${label}.${uid()}@qa.test`;
    const password = 'Qa-' + uid() + uid();
    const r = await api('POST', `/auth/${kind}/register`, { body: { name: `QA ${label}`, email, password } });
    is(r, 201, `register ${label}`);
    // New instructors wait for an admin, which most cases don't need to repeat
    if (kind === 'instructor') await serverRequire('./models/User').updateOne({ _id: r.json._id }, { role: 'instructor', 'instructorRequest.status': 'approved' });
    return { id: r.json._id, email, password, token: r.json.token, name: r.json.name };
};

const multipart = (fields, file) => {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    if (file) form.append('file', new Blob([file.data], { type: file.type }), file.name);
    return form;
};

const MINIMAL_PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

module.exports = {
    tc, cases, api, prod, call, ok, is, eq, lines, sleep, uid, lastOtp, googleCode, webhook, paidSession,
    putSession, newUser, multipart, snip, serverRequire, MINIMAL_PDF, env
};
