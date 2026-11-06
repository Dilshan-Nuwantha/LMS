
require('dotenv').config();

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Purchase = require('../models/Purchase');
const { createPurchaseWithInvoice } = require('../services/purchaseService');

const TEST_URI = process.env.MONGO_TEST_URI;

const seedUserId = new mongoose.Types.ObjectId();
const targetUserId = new mongoose.Types.ObjectId();
const instructorId = new mongoose.Types.ObjectId();

const seedCourseId = new mongoose.Types.ObjectId();
const targetCourseId = new mongoose.Types.ObjectId();

let originalGenerateInvoiceNumber;

after(async () => {
    try {
        // Restore the original method if it was overridden.
        if (originalGenerateInvoiceNumber) {
            Purchase.generateInvoiceNumber = originalGenerateInvoiceNumber;
        }

        if (mongoose.connection.readyState === 1) {
            // Delete only records created by this test.
            await Purchase.deleteMany({
                user: { $in: [seedUserId, targetUserId] }
            });
        }
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
});

test('should retry when a duplicate invoice number is generated', async () => {
    assert.ok(TEST_URI, 'MONGO_TEST_URI is missing');

    const testDbName = new URL(TEST_URI).pathname.slice(1);

    assert.equal(
        testDbName,
        'tenze_lms_test',
        'Test must use the dedicated test database'
    );

    await mongoose.connect(TEST_URI);

    console.log(`Connected to test database: ${mongoose.connection.name}`);

    await Purchase.init();

    // 1. Generate a valid invoice number for the test seed.
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latestInvoice = await Purchase.findOne({
        invoiceNumber: { $regex: `^${prefix}` }
    }).sort({ invoiceNumber: -1 });

    let latestNumber = 0;

    if (latestInvoice?.invoiceNumber) {
        latestNumber = parseInt(
            latestInvoice.invoiceNumber.split('-').pop(),
            10
        );

        assert.ok(
            Number.isInteger(latestNumber),
            'Latest existing invoice number must be valid'
        );
    }

    const duplicateInvoice =
        `${prefix}${String(latestNumber + 1).padStart(5, '0')}`;

    await Purchase.create({
        user: seedUserId,
        course: seedCourseId,
        instructor: instructorId,
        amount: 1000,
        currency: 'LKR',
        status: 'completed',
        invoiceNumber: duplicateInvoice,
        invoiceStatus: 'paid'
    });

    // 2. Keep the original invoice generator.
    originalGenerateInvoiceNumber = Purchase.generateInvoiceNumber;

    let generationAttempts = 0;

    // 3. Force the first attempt to return a duplicate invoice.
    // The second attempt uses the real invoice generator.
    Purchase.generateInvoiceNumber = async function () {
        generationAttempts++;

        if (generationAttempts === 1) {
            return duplicateInvoice;
        }

        return originalGenerateInvoiceNumber.call(Purchase);
    };

    // 4. Create another purchase.
    const purchase = await createPurchaseWithInvoice({
        user: targetUserId,
        course: targetCourseId,
        instructor: instructorId,
        amount: 1500,
        originalPrice: 1500,
        currency: 'LKR',
        status: 'pending',
        invoiceStatus: 'created'
    });

    // 5. Verify retry behavior.
    assert.equal(
        generationAttempts,
        2,
        'Invoice generation should be attempted twice'
    );

    assert.ok(
        purchase.invoiceNumber,
        'A new invoice number should be generated'
    );

    assert.notEqual(
        purchase.invoiceNumber,
        duplicateInvoice,
        'The new invoice must not duplicate the existing invoice'
    );

    const savedPurchase = await Purchase.findById(purchase._id);

    assert.ok(savedPurchase, 'Purchase should be saved in the database');

    assert.equal(
        savedPurchase.invoiceNumber,
        purchase.invoiceNumber
    );

    console.log('\nRetry Test Results:');
    console.log(`Generation attempts: ${generationAttempts}`);
    console.log(`Duplicate invoice: ${duplicateInvoice}`);
    console.log(`New invoice: ${purchase.invoiceNumber}`);
    console.log('Duplicate invoice detected and retry successful.');
});


test('should stop after 5 failed invoice generation attempts', async () => {
    const duplicateInvoice = `INV-${new Date().getFullYear()}-00001`;

    let generationAttempts = 0;

    originalGenerateInvoiceNumber = Purchase.generateInvoiceNumber;

    Purchase.generateInvoiceNumber = async function () {
        generationAttempts++;
        return duplicateInvoice;
    };

    await assert.rejects(
        createPurchaseWithInvoice({
            user: new mongoose.Types.ObjectId(),
            course: new mongoose.Types.ObjectId(),
            instructor: instructorId,
            amount: 1000,
            currency: 'LKR',
            status: 'pending'
        }),
        {
            message: 'Could not allocate an invoice number, please try again'
        }
    );

    assert.equal(generationAttempts, 5);

    console.log('\nMaximum Retry Test Results:');
    console.log(`Generation attempts: ${generationAttempts}`);
    console.log('Retry limit enforced successfully.');
});

