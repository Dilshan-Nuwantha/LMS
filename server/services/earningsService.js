const Purchase = require('../models/Purchase');
const Payout = require('../models/Payout');

const CURRENCIES = ['LKR', 'USD'];

const emptyTotals = () => Object.fromEntries(
    CURRENCIES.map(c => [c, { earned: 0, sales: 0, paidOut: 0, pending: 0 }])
);

// Completed sales and payouts, totalled separately per currency - LKR and USD
// amounts can't be added together.
// groupBy: null for one overall total (key 'all'), or e.g. '$instructor' for per-instructor totals.
// Returns { [key]: { LKR: { earned, sales, paidOut, pending }, USD: {...} } }
const getEarningsByCurrency = async (match = {}, groupBy = null) => {
    const [sales, payouts] = await Promise.all([
        Purchase.aggregate([
            { $match: { ...match, status: 'completed' } },
            { $group: { _id: { key: groupBy, currency: '$currency' }, total: { $sum: '$amount' }, sales: { $sum: 1 } } }
        ]),
        Payout.aggregate([
            { $match: { ...match, status: 'completed' } },
            { $group: { _id: { key: groupBy, currency: { $ifNull: ['$currency', 'LKR'] } }, total: { $sum: '$amount' } } }
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
    });
    payouts.forEach(row => {
        bucket(row._id).paidOut += row.total;
    });

    Object.values(result).forEach(byCurrency => {
        Object.values(byCurrency).forEach(t => { t.pending = t.earned - t.paidOut; });
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
    pendingAmount: byCurrency.LKR.pending,
    byCurrency
});

module.exports = {
    CURRENCIES,
    getEarningsByCurrency,
    totalsFor,
    toSummary
};
