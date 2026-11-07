const Purchase = require('../models/Purchase');
const Payout = require('../models/Payout');
const CommissionPayment = require('../models/CommissionPayment');

const CURRENCIES = ['LKR', 'USD'];

// The platform's share. Instructors pay it on slip sales they collected themselves,
// and it is kept from claims on card sales, where the platform holds the money.
const COMMISSION_PERCENT = 10;

const roundMoney = (amount) => Math.round(amount * 100) / 100;

// Splits a claimed amount into the commission and what the instructor receives
const splitClaim = (grossAmount) => {
    const commissionAmount = roundMoney(grossAmount * COMMISSION_PERCENT / 100);
    return { grossAmount, commissionAmount, netAmount: roundMoney(grossAmount - commissionAmount) };
};

const emptyTotals = () => Object.fromEntries(
    CURRENCIES.map(c => [c, {
        earned: 0, sales: 0, collected: 0, paidOut: 0, commission: 0, settled: 0, claimed: 0, waitingApproval: 0, available: 0, pending: 0,
        commissionDue: 0, commissionPaid: 0, commissionWaiting: 0, commissionOwed: 0, commissionPayable: 0
    }])
);

// Completed sales and payouts, totalled separately per currency - LKR and USD
// amounts can't be added together.
// groupBy: null for one overall total (key 'all'), or e.g. '$instructor' for per-instructor totals.
// Per currency: earned (all sales), collected (slip sales the instructor received directly),
// commissionDue, commissionPaid and commissionWaiting (what the instructor owes the platform on those),
// commissionOwed (still unpaid) and commissionPayable (unpaid and not under review).
// For card sales, held by the platform: paidOut (sent to the instructor), commission (kept by the platform),
// settled (paid claims, before commission), claimed and waitingApproval (claims not reviewed yet,
// before and after commission), available (can still be claimed) and pending (still to be paid
// to the instructor, after commission).
const getEarningsByCurrency = async (match = {}, groupBy = null) => {
    const [sales, payouts, commissionPayments] = await Promise.all([
        Purchase.aggregate([
            { $match: { ...match, status: 'completed' } },
            { $group: { _id: { key: groupBy, currency: '$currency', method: '$paymentMethod' }, total: { $sum: '$amount' }, sales: { $sum: 1 } } }
        ]),
        Payout.aggregate([
            { $match: { ...match, status: { $in: ['completed', 'pending'] } } },
            {
                $group: {
                    _id: { key: groupBy, currency: { $ifNull: ['$currency', 'LKR'] }, status: '$status' },
                    total: { $sum: '$amount' },
                    gross: { $sum: { $ifNull: ['$grossAmount', '$amount'] } },
                    commission: { $sum: { $ifNull: ['$commissionAmount', 0] } }
                }
            }
        ]),
        CommissionPayment.aggregate([
            { $match: { ...match, status: { $in: ['approved', 'pending'] } } },
            { $group: { _id: { key: groupBy, currency: '$currency', status: '$status' }, total: { $sum: '$amount' } } }
        ])
    ]);

    const result = {};
    const bucket = ({ key, currency }) => {
        const id = key ? key.toString() : 'all';
        result[id] = result[id] || emptyTotals();
        // Old records may still carry the legacy rupee codes (lkr / INR)
        return result[id][CURRENCIES.includes(currency) ? currency : 'LKR'];
    };

    sales.forEach(row => {
        const totals = bucket(row._id);
        totals.earned += row.total;
        totals.sales += row.sales;
        if (row._id.method === 'slip') totals.collected += row.total;
    });
    payouts.forEach(row => {
        const totals = bucket(row._id);
        if (row._id.status === 'completed') {
            totals.paidOut += row.total;
            totals.commission += row.commission;
            totals.settled += row.gross;
        } else {
            totals.waitingApproval += row.total;
            totals.claimed += row.gross;
        }
    });

    commissionPayments.forEach(row => {
        const totals = bucket(row._id);
        if (row._id.status === 'approved') totals.commissionPaid += row.total;
        else totals.commissionWaiting += row.total;
    });

    Object.values(result).forEach(byCurrency => {
        Object.values(byCurrency).forEach(t => {
            const heldByPlatform = t.earned - t.collected;
            t.available = Math.max(roundMoney(heldByPlatform - t.settled - t.claimed), 0);
            t.pending = splitClaim(Math.max(heldByPlatform - t.settled, 0)).netAmount;
            t.commissionDue = splitClaim(t.collected).commissionAmount;
            t.commissionOwed = Math.max(roundMoney(t.commissionDue - t.commissionPaid), 0);
            t.commissionPayable = Math.max(roundMoney(t.commissionOwed - t.commissionWaiting), 0);
        });
    });

    return result;
};

// Totals for a single key, or zeros when there are no sales/payouts yet
const totalsFor = (result, key = 'all') => result[key] || emptyTotals();

// The existing *Revenue / *Earnings / *PaidOut / *Pending fields are kept in LKR (the main
// currency, and what the UI labels them as); byCurrency carries the full split.
const toSummary = (byCurrency) => ({
    totalEarnings: byCurrency.LKR.earned,
    totalSales: CURRENCIES.reduce((n, c) => n + byCurrency[c].sales, 0),
    totalPaidOut: byCurrency.LKR.paidOut,
    totalCommission: roundMoney(byCurrency.LKR.commission + byCurrency.LKR.commissionPaid),
    commissionOwed: byCurrency.LKR.commissionOwed,
    pendingAmount: byCurrency.LKR.pending,
    byCurrency
});

module.exports = {
    CURRENCIES,
    COMMISSION_PERCENT,
    splitClaim,
    getEarningsByCurrency,
    totalsFor,
    toSummary
};
