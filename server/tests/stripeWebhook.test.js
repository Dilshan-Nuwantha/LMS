
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({
    path: path.join(__dirname, '..', '.env')
});

// Test-only Stripe key. No real Stripe API requests are made.
process.env.STRIPE_SECRET_KEY = 'sk_test_webhook_mock_only';

const User = require('../models/User');
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Progress = require('../models/Progress');

const stripe = require('../config/stripe');

const {
    handleStripeWebhook
} = require('../controllers/purchaseController');

describe('Stripe Webhook Idempotency Test', () => {

    let student;
    let instructor;
    let course;
    let connected = false;
    let mockEvent;
    let session;

    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const originalConstructEvent =
        stripe.webhooks.constructEvent;

    // Reusable webhook request helper
    const sendWebhook = async (event) => {
        mockEvent = event;

        const req = {
            headers: {
                'stripe-signature': 'mock_signature'
            },
            body: Buffer.from('mock_webhook_payload')
        };

        const res = {
            statusCode: null,
            responseBody: null,

            status(code) {
                this.statusCode = code;
                return this;
            },

            json(data) {
                this.responseBody = data;
                return this;
            },

            send(data) {
                this.responseBody = data;
                return this;
            }
        };

        await handleStripeWebhook(req, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.responseBody, {
            received: true
        });
    };

    // Setup test database and test records
    before(async () => {
        const mongoUri = process.env.MONGO_TEST_URI;

        if (!mongoUri) {
            throw new Error('MONGO_TEST_URI is missing');
        }

        const databaseName = new URL(mongoUri).pathname.slice(1);

        if (databaseName !== 'tenze_lms_test') {
            throw new Error(
                `Unsafe test database: ${databaseName}`
            );
        }

        await mongoose.connect(mongoUri);
        connected = true;

        // Mock Stripe signature verification
        stripe.webhooks.constructEvent = () => mockEvent;

        student = await User.create({
            name: 'Webhook Test Student',
            email: `webhook_student_${uniqueId}@tenzetest.com`,
            password: 'testpassword123',
            role: 'student'
        });

        instructor = await User.create({
            name: 'Webhook Test Instructor',
            email: `webhook_instructor_${uniqueId}@tenzetest.com`,
            password: 'testpassword123',
            role: 'instructor'
        });

        course = await Course.create({
            title: 'Webhook Test Course',
            description: 'Course for webhook testing',
            user: instructor._id,
            enrollmentCount: 0
        });

        await Purchase.create({
            user: student._id,
            course: course._id,
            instructor: instructor._id,
            amount: 1000,
            currency: 'LKR',
            status: 'pending',
            stripeSessionId: `cs_test_${uniqueId}`
        });

        // Shared successful payment session
        session = {
            id: `cs_test_${uniqueId}`,
            payment_status: 'paid',
            payment_intent: `pi_test_${uniqueId}`,
            amount_total: 100000,
            currency: 'lkr',
            metadata: {
                courseId: course._id.toString(),
                userId: student._id.toString(),
                instructorId: instructor._id.toString(),
                couponId: '',
                discountAmount: '0',
                originalPrice: '1000'
            }
        };
    });

    // Cleanup test records
    after(async () => {
        stripe.webhooks.constructEvent =
            originalConstructEvent;

        if (connected) {
            if (student) {
                await Purchase.deleteMany({
                    user: student._id
                });

                await Progress.deleteMany({
                    student: student._id
                });
            }

            if (course) {
                await Course.deleteOne({
                    _id: course._id
                });
            }

            const testUserIds = [
                student?._id,
                instructor?._id
            ].filter(Boolean);

            if (testUserIds.length > 0) {
                await User.deleteMany({
                    _id: {
                        $in: testUserIds
                    }
                });
            }

            await mongoose.disconnect();
        }
    });

    // TEST 1: Duplicate successful webhook
    it('should process the same successful webhook only once', async () => {

        const event = {
            type: 'checkout.session.completed',
            data: {
                object: session
            }
        };

        // First delivery
        await sendWebhook(event);

        // Duplicate delivery
        await sendWebhook(event);

        const purchases = await Purchase.find({
            user: student._id,
            course: course._id
        });

        const progressRecords = await Progress.find({
            student: student._id,
            course: course._id
        });

        const updatedCourse = await Course.findById(
            course._id
        );

        assert.equal(purchases.length, 1);
        assert.equal(purchases[0].status, 'completed');
        assert.equal(updatedCourse.enrollmentCount, 1);
        assert.equal(progressRecords.length, 1);

        console.log(
            'Webhook duplicate delivery test passed'
        );
    });

    // TEST 2: Refund and old webhook replay
    it('should not restore course access when a refunded payment webhook is replayed', async () => {

        // Step 1: Refund the completed payment
        await sendWebhook({
            type: 'charge.refunded',
            data: {
                object: {
                    payment_intent: session.payment_intent,
                    refunded: true
                }
            }
        });

        // Step 2: Replay original successful payment event
        await sendWebhook({
            type: 'checkout.session.completed',
            data: {
                object: session
            }
        });

        const purchase = await Purchase.findOne({
            user: student._id,
            course: course._id
        });

        const updatedCourse = await Course.findById(
            course._id
        );

        const progressCount = await Progress.countDocuments({
            student: student._id,
            course: course._id
        });

        // Verify refund status remains unchanged
        assert.ok(purchase);
        assert.equal(purchase.status, 'refunded');
        assert.equal(purchase.invoiceStatus, 'refunded');

        // Verify course access was not restored
        assert.equal(updatedCourse.enrollmentCount, 0);
        assert.equal(progressCount, 0);

        console.log(
            'Refund replay protection test passed'
        );
    });

});
