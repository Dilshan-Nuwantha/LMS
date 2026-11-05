// One-off migration: lowercases emails stored with capitals, so they match what login searches for.
// Two accounts that differ only by case (Foo@x and foo@x) are listed and left alone, because
// someone has to decide which one to keep.
//
// Usage (from server/):
//   node scripts/normalizeUserEmails.js          -> dry run, only prints what would change
//   node scripts/normalizeUserEmails.js --apply  -> updates the database
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const run = async () => {
    const apply = process.argv.includes('--apply');
    await mongoose.connect(process.env.MONGO_URI);
    const users = mongoose.connection.db.collection('users');

    const all = await users.find({}, { projection: { email: 1 } }).toArray();
    const groups = new Map();
    all.forEach((user) => {
        const key = String(user.email).toLowerCase().trim();
        groups.set(key, [...(groups.get(key) || []), user]);
    });

    let toUpdate = 0;
    let conflicts = 0;

    for (const [email, group] of groups) {
        if (group.length > 1) {
            conflicts++;
            console.log(`Conflict, not changed: ${group.map(u => u.email).join(', ')}`);
        } else if (group[0].email !== email) {
            toUpdate++;
            if (apply) await users.updateOne({ _id: group[0]._id }, { $set: { email } });
        }
    }

    console.log(`${apply ? 'Updated' : 'To update'}: ${toUpdate}. Conflicts to resolve by hand: ${conflicts}.`);
    if (!apply) console.log('Dry run only. Re-run with --apply to update.');
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
