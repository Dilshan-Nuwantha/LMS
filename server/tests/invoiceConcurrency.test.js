
require('dotenv').config();

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');

describe('Invoice Number Concurrency Test', () => {
    before(async () => {
        const uri = process.env.MONGO_TEST_URI;

        if (!uri) {
            throw new Error('MONGO_TEST_URI is missing');
        }

        const dbName = decodeURIComponent(
            new URL(uri).pathname.replace(/^\/+/, '')
        );

        // Safety check: never run this test against another database.
        assert.equal(
            dbName,
            'tenze_lms_test',
            'Incorrect test database!'
        );

        await mongoose.connect(uri);
        console.log('Connected to test database:', dbName);
    });

    after(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    it('should generate 50 unique sequential invoice numbers concurrently', async () => {
        const totalRequests = 50;

        const invoices = await Promise.all(
            Array.from(
                { length: totalRequests },
                () => Purchase.generateInvoiceNumber()
            )
        );

        // Check total generated invoices.
        assert.equal(invoices.length, totalRequests);

        // Check for duplicate invoice numbers.
        const uniqueInvoices = new Set(invoices);

        assert.equal(
            uniqueInvoices.size,
            totalRequests,
            'Duplicate invoice numbers detected!'
        );

        // Extract and sort sequence numbers.
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;

        const sequenceNumbers = invoices
            .map(invoice => {
                assert.ok(
                    invoice.startsWith(prefix),
                    `Invalid invoice format: ${invoice}`
                );

                return Number(invoice.split('-').pop());
            })
            .sort((a, b) => a - b);

        // Check sequential numbering.
        for (let i = 1; i < sequenceNumbers.length; i++) {
            assert.equal(
                sequenceNumbers[i],
                sequenceNumbers[i - 1] + 1,
                'Invoice sequence contains a gap!'
            );
        }

        console.log('\nConcurrency Test Results:');
        console.log('Total requests:', totalRequests);
        console.log('Unique invoices:', uniqueInvoices.size);
        console.log('First invoice:', invoices.sort()[0]);
        console.log('Last invoice:', [...invoices].sort().at(-1));
        console.log('All invoice numbers are unique and sequential.');
    });
});
