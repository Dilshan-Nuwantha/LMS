// One-off migration: old records use the invalid currency codes 'SLR' / 'INR'.
// Stripe only accepts ISO codes, so these are rewritten to 'LKR'.
//
// Usage (from server/):
//   node scripts/migrateCurrencyToLKR.js          -> dry run, only prints counts
//   node scripts/migrateCurrencyToLKR.js --apply  -> updates the database
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const LEGACY_CODES = ['SLR', 'INR'];
const COLLECTIONS = ['courses', 'purchases', 'payouts'];

const run = async () => {
    const apply = process.argv.includes('--apply');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    for (const name of COLLECTIONS) {
        const filter = { currency: { $in: LEGACY_CODES } };
        if (apply) {
            const result = await db.collection(name).updateMany(filter, { $set: { currency: 'LKR' } });
            console.log(`${name}: updated ${result.modifiedCount}`);
        } else {
            const count = await db.collection(name).countDocuments(filter);
            console.log(`${name}: ${count} to update`);
        }
    }

    if (!apply) console.log('Dry run only. Re-run with --apply to update.');
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
