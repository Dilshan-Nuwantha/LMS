// One-off cleanup: older activity records stored whole request bodies, including plain text
// passwords, AI keys and bank details. This removes those fields and keeps the rest of the log.
// After running it, ask affected users to change those passwords and AI keys, because anyone
// who could read the log may already have seen them.
//
// Usage (from server/):
//   node scripts/purgeActivitySecrets.js          -> dry run, only prints counts
//   node scripts/purgeActivitySecrets.js --apply  -> updates the database
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const SECRET_FIELDS = [
    'password', 'currentPassword', 'newPassword', 'confirmPassword', 'token', 'resetToken', 'otp', 'code',
    'apiKey', 'accountHolderName', 'accountNumber', 'bankName', 'ifscCode', 'upiId', 'paypalEmail'
];

const run = async () => {
    const apply = process.argv.includes('--apply');
    await mongoose.connect(process.env.MONGO_URI);
    const activities = mongoose.connection.db.collection('activities');

    for (const field of SECRET_FIELDS) {
        const filter = { [`data.${field}`]: { $exists: true } };
        if (apply) {
            const result = await activities.updateMany(filter, { $unset: { [`data.${field}`]: '' } });
            console.log(`data.${field}: cleared ${result.modifiedCount}`);
        } else {
            console.log(`data.${field}: ${await activities.countDocuments(filter)} to clear`);
        }
    }

    if (!apply) console.log('Dry run only. Re-run with --apply to update.');
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
