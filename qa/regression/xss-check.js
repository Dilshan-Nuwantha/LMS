// UI-010 evidence: clicks "Open Link" on a javascript: resource in real headless Chrome,
// with a throwaway profile. Needs `run.js --serve` and the client dev server on port 5199.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.QA_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const info = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../results/serve-info.json'), 'utf8'));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const connect = async (wsUrl) => {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    };
    const send = (method, params = {}) => new Promise(res => {
        const n = ++id;
        pending.set(n, res);
        ws.send(JSON.stringify({ id: n, method, params }));
    });
    const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
    return { ws, send, evaluate };
};

const main = async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-qa-chrome-'));
    const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });

    try {
        let target;
        for (let i = 0; i < 40 && !target; i++) {
            await sleep(500);
            try {
                const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
                target = list.find(t => t.type === 'page');
            } catch { /* still starting */ }
        }
        const login = await (await fetch(`${info.api}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(info.student)
        })).json();

        const page = await connect(target.webSocketDebuggerUrl);
        await page.send('Page.enable');
        await page.send('Runtime.enable');
        await page.send('Page.navigate', { url: 'http://localhost:5199/login' });
        await sleep(2500);
        await page.evaluate(`localStorage.setItem('token', ${JSON.stringify(login.token)})`);
        await page.send('Page.navigate', { url: `http://localhost:5199/course/${info.courseId}?tab=resources` });
        await sleep(4000);

        const expected = login.token.slice(0, 12);
        const rect = await page.evaluate(`(() => {
            const b = [...document.querySelectorAll('button')].find(x => (x.title || x.innerText).includes('Open Link'));
            if (!b) return null;
            b.scrollIntoView({ block: 'center' });
            const r = b.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        })()`);
        console.log('Open Link button found:', !!rect);
        if (!rect) return;

        for (const type of ['mousePressed', 'mouseReleased']) {
            await page.send('Input.dispatchMouseEvent', { type, x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
        }
        await sleep(2000);

        const title = await page.evaluate('document.title');
        const pages = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).filter(t => t.type === 'page');
        console.log('Browser tabs after click:', pages.length);
        console.log('Page title after click:', title.slice(0, 30));
        console.log('Script read the login token:', title === `XSS-${expected}`);
        page.ws.close();
    } finally {
        chrome.kill();
        await sleep(800);
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
    }
};

main().catch(e => { console.error(e); process.exit(1); });
