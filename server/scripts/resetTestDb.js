/**
 * Drops the E2E test database so every Playwright run starts from a clean slate.
 *
 * Safety: refuses to run unless the resolved database name contains "test",
 * so it can never wipe the dev/production database.
 *
 * Usage:  npm run reset:test-db          (from the server/ directory)
 *         node scripts/resetTestDb.js
 *
 * Honours MONGO_DB_NAME (defaults to "lms_test"). MONGO_URI is read from server/.env.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const dbName = process.env.MONGO_DB_NAME || 'lms_test';

(async () => {
    if (!/test/i.test(dbName)) {
        console.error(`Refusing to reset "${dbName}" — database name must contain "test".`);
        process.exit(1);
    }

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set (checked server/.env). Cannot connect.');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, { dbName });

        // Double-check what we actually connected to before dropping anything.
        if (!/test/i.test(conn.connection.name)) {
            console.error(`Connected to "${conn.connection.name}", which is not a test database. Aborting.`);
            await mongoose.disconnect();
            process.exit(1);
        }

        await conn.connection.dropDatabase();
        console.log(`Dropped test DB: ${conn.connection.name}`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error(`Failed to reset test DB: ${err.message}`);
        process.exit(1);
    }
})();
