const path = require('path');
const dns = require('dns').promises;
dns.setServers(['1.1.1.1', '8.8.8.8']);
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

async function inspectAccounts() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('[ERROR] MONGO_URI is not set in environment.');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.\n');

    // Query raw collection to ensure no schema transform hides fields
    const rawUsers = await mongoose.connection.collection('users').find({}).toArray();

    console.log(`========================================================================================`);
    console.log(`                     DATABASE USER ACCOUNT INTEGRITY AUDIT                              `);
    console.log(`========================================================================================`);
    console.log(`Total Accounts Found: ${rawUsers.length}\n`);

    const stats = {
        total: rawUsers.length,
        localValid: 0,
        googleOnly: 0,
        linkedAccounts: 0,
        incompleteLocal: 0,
        plaintextPasswords: 0,
        anomalies: []
    };

    console.log(
        'ID'.padEnd(26) +
        'EMAIL'.padEnd(36) +
        'ROLE'.padEnd(12) +
        'AUTH TYPE'.padEnd(14) +
        'PASSWORD STATUS'
    );
    console.log('-'.repeat(105));

    for (const u of rawUsers) {
        const idStr = String(u._id);
        const emailStr = (u.email || '<missing email>').padEnd(36);
        const roleStr = (u.role || 'student').padEnd(12);

        const hasPassword = u.password !== null && u.password !== undefined && u.password !== '';
        const hasGoogle = Boolean(u.googleId);
        const isBcrypt = hasPassword && typeof u.password === 'string' && BCRYPT_REGEX.test(u.password);

        let authType = 'Unknown';
        let passStatus = 'Missing';

        if (hasGoogle && hasPassword) {
            authType = 'Linked (G+L)';
            stats.linkedAccounts++;
        } else if (hasGoogle) {
            authType = 'Google Only';
            stats.googleOnly++;
        } else {
            authType = 'Local';
        }

        if (isBcrypt) {
            passStatus = 'Valid Bcrypt';
            if (!hasGoogle) stats.localValid++;
        } else if (hasPassword) {
            passStatus = 'INVALID / Plaintext';
            stats.plaintextPasswords++;
            stats.anomalies.push({
                id: idStr,
                email: u.email,
                issue: 'Stored password is NOT a valid bcrypt salted hash'
            });
        } else {
            passStatus = hasGoogle ? 'None (Google OAuth)' : 'MISSING (Incomplete)';
            if (!hasGoogle) {
                stats.incompleteLocal++;
                stats.anomalies.push({
                    id: idStr,
                    email: u.email,
                    issue: 'Local manual account is missing password hash'
                });
            }
        }

        console.log(
            idStr.padEnd(26) +
            emailStr +
            roleStr +
            authType.padEnd(14) +
            passStatus
        );
    }

    console.log('-'.repeat(105));
    console.log('\n--- AUDIT SUMMARY ---');
    console.log(`Total Users:                     ${stats.total}`);
    console.log(`Valid Local Accounts:            ${stats.localValid}`);
    console.log(`Google-Only Accounts:            ${stats.googleOnly}`);
    console.log(`Linked Accounts (Local + Google):${stats.linkedAccounts}`);
    console.log(`Incomplete Local Accounts:       ${stats.incompleteLocal}`);
    console.log(`Plaintext / Invalid Passwords:   ${stats.plaintextPasswords}`);

    if (stats.anomalies.length > 0) {
        console.log('\n[WARNING] Found anomalous accounts requiring administrative review:');
        stats.anomalies.forEach((a, i) => {
            console.log(`  ${i + 1}. [${a.id}] ${a.email}: ${a.issue}`);
        });
        console.log('\nNote: No accounts were modified or deleted. Manual administrative password reset or outreach is recommended.');
    } else {
        console.log('\n[OK] All existing database accounts have valid authentication configurations.');
    }

    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
}

inspectAccounts().catch(err => {
    console.error('Inspection failed:', err);
    process.exit(1);
});

