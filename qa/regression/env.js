// Starts a throwaway MongoDB plus two API instances (development and production mode).
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SERVER_DIR = process.env.QA_SERVER_DIR || path.resolve(__dirname, '../../server');
const MONGOD = process.env.QA_MONGOD || 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
const MONGO_PORT = 27099;
const DEV_PORT = 5055;
const PROD_PORT = 5056;
const CLIENT_URL = 'http://localhost:5199';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-qa-'));
const out = path.join(root, 'out');
const dbPath = path.join(root, 'db');
fs.mkdirSync(out);
fs.mkdirSync(dbPath);

const secrets = {
    JWT_SECRET: crypto.randomBytes(48).toString('hex'),
    STRIPE_WEBHOOK_SECRET: 'whsec_' + crypto.randomBytes(24).toString('hex'),
    AI_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex')
};

const children = [];

const waitFor = async (check, label, tries = 120) => {
    for (let i = 0; i < tries; i++) {
        try {
            if (await check()) return;
        } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Timed out waiting for ${label}`);
};

const startApi = (port, nodeEnv, dbName) => {
    const log = fs.openSync(path.join(root, `server-${nodeEnv}.log`), 'a');
    const child = spawn(process.execPath, ['-r', path.join(__dirname, 'preload-mocks.js'), 'index.js'], {
        cwd: SERVER_DIR,
        stdio: ['ignore', log, log],
        env: {
            ...process.env,
            ...secrets,
            PORT: String(port),
            NODE_ENV: nodeEnv,
            MONGO_URI: `mongodb://127.0.0.1:${MONGO_PORT}/${dbName}`,
            CLIENT_URL,
            STRIPE_SECRET_KEY: 'sk_test_qa_local_only',
            GOOGLE_CLIENT_ID: 'qa-google-client',
            GOOGLE_CLIENT_SECRET: 'qa-google-secret',
            EMAIL_USER: 'qa@example.test',
            EMAIL_PASS: 'qa',
            CRON_SECRET: 'qa-cron-secret',
            QA_OUT: out
        }
    });
    children.push(child);
    return waitFor(async () => (await fetch(`http://127.0.0.1:${port}/api/health`)).ok, `API on ${port}`);
};

const start = async () => {
    const mongod = spawn(MONGOD, ['--dbpath', dbPath, '--port', String(MONGO_PORT), '--bind_ip', '127.0.0.1', '--quiet'], {
        stdio: ['ignore', fs.openSync(path.join(root, 'mongod.log'), 'a'), 'ignore']
    });
    children.push(mongod);

    const net = require('net');
    await waitFor(() => new Promise(resolve => {
        const s = net.connect(MONGO_PORT, '127.0.0.1', () => { s.destroy(); resolve(true); });
        s.on('error', () => resolve(false));
    }), 'MongoDB');

    await Promise.all([startApi(DEV_PORT, 'development', 'lms_qa'), startApi(PROD_PORT, 'production', 'lms_qa_prod')]);
};

const stop = async () => {
    children.reverse().forEach(c => c.kill());
    await new Promise(r => setTimeout(r, 1500));
    try {
        fs.rmSync(root, { recursive: true, force: true });
    } catch { /* mongod may still hold a file for a moment */ }
};

module.exports = {
    start, stop, root, out, secrets, CLIENT_URL, SERVER_DIR,
    DEV: `http://127.0.0.1:${DEV_PORT}/api`,
    PROD: `http://127.0.0.1:${PROD_PORT}/api`,
    MONGO: `mongodb://127.0.0.1:${MONGO_PORT}/lms_qa`
};
