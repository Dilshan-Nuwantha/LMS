// Moves stored data from the old "teacher" names to "instructor".
//   node scripts/migrateInstructorNames.js           reports what would change
//   node scripts/migrateInstructorNames.js --apply   changes it
require('dotenv').config();
const mongoose = require('mongoose');

const apply = process.argv.includes('--apply');
const ACTIVITY_NAMES = ['Added', 'Removed', 'Left', 'Updated'];

const renameCollection = async (db, from, to) => {
    const names = (await db.listCollections().toArray()).map(c => c.name);
    if (!names.includes(from)) return console.log(`${from}: not found, nothing to do`);

    const count = await db.collection(from).countDocuments();
    if (names.includes(to) && await db.collection(to).countDocuments() > 0) {
        throw new Error(`${to} already has data. Merge it by hand before running this.`);
    }

    console.log(`${from} -> ${to}: ${count} documents`);
    if (!apply) return;

    // The collection is recreated empty when the app starts first, so that copy goes
    if (names.includes(to)) await db.collection(to).drop();
    await db.collection(from).rename(to);
};

// A unique index on the old field would treat every renamed record as a duplicate
const dropOldIndexes = async (db, name) => {
    const indexes = await db.collection(name).indexes().catch(() => []);
    for (const index of indexes) {
        if (index.key.teacher) await db.collection(name).dropIndex(index.name);
    }
};

const renameField = async (db, name, filter, update, label) => {
    const count = await db.collection(name).countDocuments(filter);
    console.log(`${label}: ${count} documents`);
    if (apply && count) await db.collection(name).updateMany(filter, update);
};

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const { db } = mongoose.connection;

    await renameCollection(db, 'courseteachers', 'courseinstructors');
    await renameCollection(db, 'teacheraiconfigs', 'instructoraiconfigs');

    const source = (name) => (apply ? name.replace('teachers', 'instructors').replace('teacherai', 'instructorai') : name);
    if (apply) {
        await dropOldIndexes(db, 'courseinstructors');
        await dropOldIndexes(db, 'instructoraiconfigs');
    }
    await renameField(db, source('courseteachers'), { teacher: { $exists: true } }, { $rename: { teacher: 'instructor' } }, 'Course instructor field');
    await renameField(db, source('courseteachers'), { 'permissions.manage_teachers': { $exists: true } }, { $unset: { 'permissions.manage_teachers': '' } }, 'Removed manage_teachers permission');
    await renameField(db, source('teacheraiconfigs'), { teacher: { $exists: true } }, { $rename: { teacher: 'instructor' } }, 'AI config field');
    await renameField(db, 'resources', { uploaderRole: 'teacher' }, { $set: { uploaderRole: 'instructor' } }, 'Resource uploader role');

    for (const name of ACTIVITY_NAMES) {
        await renameField(db, 'activities', { action: `Teacher ${name}` }, { $set: { action: `Instructor ${name}` } }, `Activity "Teacher ${name}"`);
    }

    // Only instructors can be added to a course now, so older student entries need a decision
    const instructorCollection = apply ? 'courseinstructors' : 'courseteachers';
    const field = apply ? 'instructor' : 'teacher';
    const assigned = await db.collection(instructorCollection).distinct(field).catch(() => []);
    const students = await db.collection('users').find({ _id: { $in: assigned }, role: 'student' }).project({ email: 1 }).toArray();
    console.log(`Student accounts added to a course: ${students.length}`);
    students.forEach(s => console.log(`  ${s.email}`));

    console.log(apply ? 'Done.' : 'Nothing was changed. Add --apply to run it.');
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
