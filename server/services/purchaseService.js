
const Purchase = require('../models/Purchase');

const isDuplicateKey = (err, field) => {
    if (err?.code !== 11000) {
        return false;
    }

    if (!field) {
        return true;
    }

    if (err.keyPattern && Object.hasOwn(err.keyPattern, field)) {
        return true;
    }

    if (err.keyValue && Object.hasOwn(err.keyValue, field)) {
        return true;
    }

    return typeof err.message === 'string' &&
        err.message.includes(`${field}_1`);
};

// Create a purchase with a unique invoice number.
const createPurchaseWithInvoice = async (data) => {
    const refunded = await Purchase.findOne({
        user: data.user,
        course: data.course,
        status: 'refunded'
    });

    for (let attempt = 0; attempt < 5; attempt++) {
        const invoiceNumber = await Purchase.generateInvoiceNumber();

        try {
            if (refunded) {
                return await Object.assign(
                    refunded,
                    data,
                    { invoiceNumber }
                ).save();
            }

            return await Purchase.create({
                ...data,
                invoiceNumber
            });
        } catch (err) {
            if (!isDuplicateKey(err, 'invoiceNumber')) {
                throw err;
            }
        }
    }

    throw new Error(
        'Could not allocate an invoice number, please try again'
    );
};

module.exports = {
    createPurchaseWithInvoice,
    isDuplicateKey
};
