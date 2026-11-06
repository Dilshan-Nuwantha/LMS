const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns').promises;

dns.setServers(['1.1.1.1', '8.8.8.8']);
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const authRoutes = require('../routes/authRoutes');

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

describe('Authentication System Test Suite', () => {
    let server;
    let baseUrl;
    const testEmails = [];

    const generateTestEmail = (prefix = 'user') => {
        const email = `autotest_${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}@tenzetest.com`;
        testEmails.push(email);
        return email;
    };

    before(async () => {
        // Connect to MongoDB
        // Never MONGO_URI: this suite creates and deletes users
        const mongoUri = process.env.MONGO_TEST_URI;
        if (!mongoUri) {
            throw new Error('MONGO_TEST_URI is missing in environment');
        }
        await mongoose.connect(mongoUri);

        // Clean up any stale test accounts from previous runs
        await User.deleteMany({ email: /@tenzetest\.com$/i });

        // Set up Express test server
        const app = express();
        app.use(express.json());
        app.use('/api/auth', authRoutes);

        // Generic error handler
        app.use((err, req, res, next) => {
            const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
            res.status(statusCode).json({ message: err.message });
        });

        await new Promise((resolve) => {
            server = http.createServer(app);
            server.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://localhost:${port}/api/auth`;
                resolve();
            });
        });
    });

    after(async () => {
        // Clean up all created test users
        await User.deleteMany({ email: /@tenzetest\.com$/i });
        await mongoose.disconnect();
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    // ── Task 7.1: Normal Manual Registration ─────────────────────────────────────
    it('should successfully register a manual account with a valid salted bcrypt password hash', async () => {
        const email = generateTestEmail('normal');
        const rawPassword = 'SecurePassword123!';

        const res = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Alice Normal',
                email,
                password: rawPassword,
                role: 'student',
            }),
        });

        const data = await res.json();
        assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(data)}`);
        assert.ok(data._id, 'Response should contain user id');
        assert.equal(data.email, email.toLowerCase());
        assert.equal(data.name, 'Alice Normal');
        assert.ok(data.token, 'Response should contain JWT token');
        assert.equal(data.password, undefined, 'Response must never leak password hash');

        // Verify in database directly
        const dbUser = await User.findById(data._id).select('+password');
        assert.ok(dbUser, 'User must exist in database');
        assert.ok(dbUser.password, 'User must have a stored password');
        assert.ok(
            BCRYPT_HASH_REGEX.test(dbUser.password),
            `Stored password must be a valid bcrypt hash, got: ${dbUser.password}`
        );
        assert.notEqual(dbUser.password, rawPassword, 'Stored password must NEVER be plaintext');
        assert.equal(dbUser.googleId, null, 'Manual account must have googleId null');

        // Verify password match using bcrypt
        const passwordMatches = await bcrypt.compare(rawPassword, dbUser.password);
        assert.equal(passwordMatches, true, 'Stored bcrypt hash must verify against original password');
    });

    // ── Task 7.2: OAuth Cancellation Followed by Manual Registration ─────────────
    it('should successfully create manual account with valid hash after an OAuth cancellation attempt', async () => {
        const email = generateTestEmail('oauth_fallback');
        const rawPassword = 'FallbackPassword456!';

        // Step 1: Simulate OAuth cancellation (client aborted OAuth popup, or failed OAuth attempt)
        // Ensure no partial account is created by a failed or cancelled OAuth request with missing code
        const cancelledOAuthRes = await fetch(`${baseUrl}/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: '', // cancelled/missing code
                role: 'student',
            }),
        });
        assert.equal(cancelledOAuthRes.status, 400, 'Cancelled OAuth must return 400 and not create an account');

        // Step 2: Switch to manual registration. Even if client or rogue caller injects googleId residue,
        // manual registration must isolate itself and force local password hashing with googleId null.
        const manualRegRes = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Bob Fallback',
                email,
                password: rawPassword,
                googleId: 'leftover_unverified_oauth_id_123', // should be sanitized/ignored
                role: 'student',
            }),
        });

        const manualData = await manualRegRes.json();
        assert.equal(manualRegRes.status, 201, `Manual registration should succeed: ${JSON.stringify(manualData)}`);
        assert.ok(manualData.token, 'Should return token');

        // Step 3: Verify the account in DB has a valid bcrypt hash and googleId null
        const dbUser = await User.findById(manualData._id).select('+password');
        assert.ok(dbUser, 'User document must exist');
        assert.ok(
            BCRYPT_HASH_REGEX.test(dbUser.password),
            `Stored password must be a valid bcrypt hash: ${dbUser.password}`
        );
        assert.equal(dbUser.googleId, null, 'Manual registration must ignore untrusted client googleId');

        // Step 4: Verify that the user can immediately log in with their manual password
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: rawPassword,
            }),
        });
        assert.equal(loginRes.status, 200, 'User should be able to log in with manual password');
    });

    // ── Task 7.3: Missing & Invalid Password Validation ──────────────────────────
    it('should reject registration when password is missing', async () => {
        const email = generateTestEmail('missing_pass');

        const res = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'No Password User',
                email,
            }),
        });

        assert.equal(res.status, 400, 'Must return 400 Bad Request');
        const count = await User.countDocuments({ email });
        assert.equal(count, 0, 'No user account must be created without a password');
    });

    it('should reject registration when password is empty or whitespace', async () => {
        const email = generateTestEmail('whitespace_pass');

        const res = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Whitespace User',
                email,
                password: '      ',
            }),
        });

        assert.equal(res.status, 400, 'Must return 400 Bad Request for whitespace password');
        const count = await User.countDocuments({ email });
        assert.equal(count, 0, 'No user account must be created');
    });

    it('should reject registration when password is shorter than 6 characters', async () => {
        const email = generateTestEmail('short_pass');

        const res = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Short Password User',
                email,
                password: '123',
            }),
        });

        assert.equal(res.status, 400, 'Must return 400 Bad Request for short password');
        const count = await User.countDocuments({ email });
        assert.equal(count, 0, 'No user account must be created');
    });

    // ── Task 7.4: Duplicate Email Handling ───────────────────────────────────────
    it('should reject duplicate email registration safely', async () => {
        const email = generateTestEmail('dup');
        const password = 'ValidPassword123!';

        // First registration
        const res1 = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'User One', email, password }),
        });
        assert.equal(res1.status, 201, 'First registration should succeed');

        // Duplicate registration with exact same email
        const res2 = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'User Two', email, password }),
        });
        assert.equal(res2.status, 400, 'Duplicate registration must return 400 Bad Request');
        const data2 = await res2.json();
        assert.equal(data2.message, 'User already exists');

        // Duplicate registration with different casing and whitespace
        const res3 = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'User Three', email: `  ${email.toUpperCase()}  `, password }),
        });
        assert.equal(res3.status, 400, 'Case-insensitive duplicate must return 400 Bad Request');
    });

    // ── Task 7.5: Google Account Registration & Interoperability ─────────────────
    it('should support Google account registration with null password and reject manual login on it', async () => {
        const email = generateTestEmail('google_user');
        const googleId = `google_oauth_sub_${Date.now()}`;

        // Create a Google OAuth user directly via User model (as googleLogin does)
        const googleUser = await User.create({
            name: 'Google Learner',
            email: email.toLowerCase(),
            googleId,
            password: null,
            role: 'student',
        });

        assert.ok(googleUser._id);
        assert.equal(googleUser.password, null, 'Google-only user should have null password');
        assert.equal(googleUser.googleId, googleId);

        // Attempting to register manually with the same email must be rejected
        const manualRegAttempt = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Imposter',
                email,
                password: 'SomePassword123!',
            }),
        });
        assert.equal(manualRegAttempt.status, 400);
        const manualData = await manualRegAttempt.json();
        assert.ok(
            manualData.message.includes('Google sign-in'),
            `Expected message mentioning Google sign-in, got: ${manualData.message}`
        );

        // Attempting to log in manually with password on a Google-only account must be rejected cleanly
        const manualLoginAttempt = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'AttemptPassword123!',
            }),
        });
        assert.equal(manualLoginAttempt.status, 400);
        const loginData = await manualLoginAttempt.json();
        assert.equal(loginData.message, 'Invalid credentials');
    });

    // ── Task 7.6: Successful Manual Login ────────────────────────────────────────
    it('should successfully log in with valid manual credentials', async () => {
        const email = generateTestEmail('login_success');
        const password = 'MySecretLoginPass123!';

        // Create user
        const regRes = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Login Master', email, password, role: 'student' }),
        });
        assert.equal(regRes.status, 201);

        // Perform login
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const loginData = await loginRes.json();
        assert.equal(loginRes.status, 200, `Expected 200 OK, got ${loginRes.status}`);
        assert.ok(loginData.token, 'Should return JWT token');
        assert.equal(loginData.email, email.toLowerCase());
        assert.equal(loginData.name, 'Login Master');
        assert.equal(loginData.password, undefined, 'Password must not be returned');
    });

    // ── Task 7.7: Failed Login Scenarios ─────────────────────────────────────────
    it('should reject login with wrong password', async () => {
        const email = generateTestEmail('wrong_pass');
        const password = 'CorrectPassword123!';

        await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'User WrongPass', email, password }),
        });

        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'IncorrectPassword!' }),
        });

        assert.equal(loginRes.status, 400);
        const loginData = await loginRes.json();
        assert.equal(loginData.message, 'Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'non_existent_email_12345@tenzetest.com',
                password: 'SomePassword123!',
            }),
        });

        assert.equal(loginRes.status, 400);
        const loginData = await loginRes.json();
        assert.equal(loginData.message, 'Invalid credentials');
    });

    it('should reject login with missing fields', async () => {
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'someemail@test.com' }),
        });

        assert.equal(loginRes.status, 400);
    });

    // ── Task 5 Verification: Ordinary User Queries Do Not Expose Password ───────
    it('should not include password in ordinary queries due to select: false', async () => {
        const email = generateTestEmail('query_security');
        const password = 'SecretPassword123!';

        const regRes = await fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Security User', email, password }),
        });
        const regData = await regRes.json();

        // Standard findOne query without select('+password')
        const userFindOne = await User.findOne({ email: email.toLowerCase() });
        assert.equal(userFindOne.password, undefined, 'findOne must not return password');

        // Standard findById query
        const userFindById = await User.findById(regData._id);
        assert.equal(userFindById.password, undefined, 'findById must not return password');
    });
});

