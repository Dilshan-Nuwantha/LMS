// Admin accounts can only be created here, there is no public registration for them.
//
// Usage (from server/):
//   node scripts/createAdmin.js --list
//     prints every admin account, to review who has admin access
//   ADMIN_NAME="Jo" ADMIN_EMAIL=jo@example.com ADMIN_PASSWORD=... node scripts/createAdmin.js
//     creates an admin. The password comes from the environment so it stays out of shell history.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    if (process.argv.includes('--list')) {
        const admins = await User.find({ role: 'admin' }).select('name email createdAt').sort({ createdAt: 1 }).lean();
        admins.forEach(a => console.log(`${a.createdAt?.toISOString().slice(0, 10)}  ${a.email}  ${a.name}`));
        console.log(`${admins.length} admin account(s)`);
    } else {
        const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;

        if (!name || !email || !password || password.length < 12) {
            throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).');
        }
        if (await User.findByEmail(email)) {
            throw new Error('An account with this email already exists.');
        }

        await User.create({ name, email, password, role: 'admin' });
        console.log(`Created admin ${email.toLowerCase().trim()}`);
    }

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
