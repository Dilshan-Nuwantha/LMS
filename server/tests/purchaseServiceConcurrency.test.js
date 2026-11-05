
require('dotenv').config();

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Purchase = require('../models/Purchase');
const Counter = require('../models/Counter');
const { createPurchaseWithInvoice } = require('../services/purchaseService');

const TEST_URI = process.env.MONGO_TEST_URI;

const purchaseIds = Array.from(
    { length: 50 },
    () => new mongoose.Types.ObjectId()
);

const userIds = Array.from(
    { length: 50 },
    () => new mongoose.Types.ObjectId()
);

const courseIds = Array.from(
    { length: 50 },
    () => new mongoose.Types.ObjectId()
);

const instructorId = new mongoose.Types.ObjectId();

after(async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            // Delete only records created by this test.
            await Purchase.deleteMany({
                user: { $in: userIds }
            });
        }
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
});

test('should create 50 purchases with unique invoice numbers concurrently', async () => {
    assert.ok(TEST_URI, 'MONGO_TEST_URI is missing');

    const testDbName = new URL(TEST_URI).pathname.slice(1);

    assert.equal(
        testDbName,
        'tenze_lms_test',
        'Test must use the dedicated test database'
    );

    await mongoose.connect(TEST_URI);

    console.log(`Connected to test database: ${mongoose.connection.name}`);

    // Ensure database indexes exist before testing.
    await Purchase.init();
    await Counter.init();

    const requests = purchaseIds.map((purchaseId, index) => {
        return createPurchaseWithInvoice({
            _id: purchaseId,
            user: userIds[index],
            course: courseIds[index],
            instructor: instructorId,
            amount: 1000,
            originalPrice: 1000,
            currency: 'LKR',
            status: 'pending',
            invoiceStatus: 'created'
        });
    });

    const results = await Promise.allSettled(requests);

    const successfulPurchases = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

    const failedRequests = results.filter(
        result => result.status === 'rejected'
    );

    console.log('\nConcurrency Test Results:');
    console.log(`Total requests: ${requests.length}`);
    console.log(`Successful purchases: ${successfulPurchases.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);

    assert.equal(
        successfulPurchases.length,
        50,
        'All 50 purchase requests should succeed'
    );

    const invoiceNumbers = successfulPurchases.map(
        purchase => purchase.invoiceNumber
    );

    const uniqueInvoiceNumbers = new Set(invoiceNumbers);

    assert.equal(
        uniqueInvoiceNumbers.size,
        50,
        'All invoice numbers must be unique'
    );

    const savedPurchases = await Purchase.find({
        _id: { $in: purchaseIds }
    });

    assert.equal(
        savedPurchases.length,
        50,
        'All 50 purchase records should exist in the database'
    );

    console.log(`Unique invoices: ${uniqueInvoiceNumbers.size}`);
    console.log('All 50 purchases have unique invoice numbers.');
});
