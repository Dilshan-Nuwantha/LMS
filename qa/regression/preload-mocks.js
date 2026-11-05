// Loaded with `node -r` in front of server/index.js during regression runs.
// Replaces every outbound integration with a local stand-in, so a run never reaches
// Atlas, Stripe, Gmail, Google or an AI provider. Stripe signature checks stay real.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const serverDir = process.env.QA_SERVER_DIR || path.resolve(__dirname, '../../server');
const serverRequire = createRequire(path.join(serverDir, 'index.js'));
const out = process.env.QA_OUT;

if (!out || !/^mongodb:\/\/127\.0\.0\.1:/.test(process.env.MONGO_URI || '')) {
    console.error('Refusing to start: regression runs must use a local MongoDB and QA_OUT.');
    process.exit(1);
}

const record = (file, entry) => fs.appendFileSync(path.join(out, file), JSON.stringify(entry) + '\n');

// Email: capture instead of sending
const nodemailer = serverRequire('nodemailer');
nodemailer.createTransport = () => ({
    sendMail: async (mail) => record('mail.jsonl', { to: mail.to, subject: mail.subject })
});

// Google: the "authorization code" is a base64url JSON payload written by the test
const { OAuth2Client } = serverRequire('google-auth-library');
OAuth2Client.prototype.getToken = async function (code) {
    return { tokens: { id_token: code } };
};
OAuth2Client.prototype.verifyIdToken = async function ({ idToken }) {
    const payload = JSON.parse(Buffer.from(idToken, 'base64url').toString());
    return { getPayload: () => payload };
};

// Stripe: only the two network calls are stubbed, webhooks.constructEvent is the real one
const stripe = serverRequire('./config/stripe.js');
let sessionCount = 0;
stripe.checkout.sessions.create = async (params) => {
    const id = `cs_test_qa_${process.pid}_${++sessionCount}`;
    record('stripe.jsonl', { id, params });
    return { id, url: `https://checkout.stripe.test/${id}` };
};
stripe.checkout.sessions.retrieve = async (id) => {
    const file = path.join(out, 'stripe-sessions.json');
    const sessions = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    if (!sessions[id]) throw new Error('No such checkout session');
    return sessions[id];
};

// AI providers: answer locally and record which key was spent. Anything else is blocked.
const json = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
    const url = String(input?.url || input);
    const host = new URL(url).hostname;

    if (host === '127.0.0.1' || host === 'localhost') return realFetch(input, init);

    const body = init.body ? JSON.parse(init.body) : {};
    const prompt = JSON.stringify(body);
    const key = init.headers?.Authorization?.replace('Bearer ', '') || init.headers?.['x-api-key'] || new URL(url).searchParams.get('key');
    record('ai.jsonl', { host, key });

    const text = prompt.includes('quiz generator')
        ? JSON.stringify([{ questionText: 'Q?', questionType: 'true-false', options: ['True', 'False'], correctAnswer: 0, points: 1 }])
        : prompt.includes('Say \\"OK\\"') ? 'OK' : 'Mock AI answer';

    if (host === 'api.openai.com') return json({ choices: [{ message: { content: text } }] });
    if (host === 'api.anthropic.com') return json({ content: [{ text }] });
    if (host === 'generativelanguage.googleapis.com') return json({ candidates: [{ content: { parts: [{ text }] } }] });

    record('blocked.jsonl', { url });
    throw new Error(`Blocked outbound request to ${host}`);
};
