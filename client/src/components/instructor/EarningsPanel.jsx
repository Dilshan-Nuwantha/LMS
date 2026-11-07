import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { formatMoney } from '../../utils/currency';
import { showSuccess, showError } from '../../utils/toast';
import { site } from '../../config/site';

const STATUS_LABELS = { pending: 'Waiting for approval', completed: 'Paid', approved: 'Approved', failed: 'Rejected', rejected: 'Rejected' };
const inputClass = 'w-full sm:w-48 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white';

const Card = ({ label, value, currency }) => (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
        <span className="block text-base font-black text-slate-900 dark:text-white">{formatMoney(value, currency)}</span>
    </div>
);

const EarningsPanel = ({ reloadKey }) => {
    const [data, setData] = useState(null);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('LKR');
    const [sending, setSending] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [reference, setReference] = useState('');
    const [proof, setProof] = useState(null);
    const [paying, setPaying] = useState(false);

    const fetchEarnings = async () => {
        try {
            const res = await api.get('/instructor/earnings');
            setData(res.data);
        } catch (error) {
            showError(error, 'Failed to load earnings');
        }
    };

    useEffect(() => { fetchEarnings(); }, [reloadKey]);

    if (!data) return null;

    const percent = data.commissionPercent;
    const totals = data.byCurrency[currency];
    const claimed = Number(amount) || 0;
    const commission = Math.round(claimed * percent) / 100;
    const hasUsd = data.byCurrency.USD.earned > 0;

    const handleClaim = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.post('/instructor/claims', { amount: claimed, currency });
            showSuccess('Claim sent for approval');
            setAmount('');
            fetchEarnings();
        } catch (error) {
            showError(error, 'Failed to send the claim');
        } finally {
            setSending(false);
        }
    };

    const handlePayCommission = async (e) => {
        e.preventDefault();
        if (!proof) {
            showError('Please attach proof of the payment');
            return;
        }

        const form = new FormData();
        form.append('amount', payAmount);
        form.append('currency', currency);
        form.append('reference', reference);
        form.append('proof', proof);

        setPaying(true);
        try {
            await api.post('/instructor/commission', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            showSuccess('Sent to the admin to verify');
            setPayAmount('');
            setReference('');
            setProof(null);
            e.target.reset();
            fetchEarnings();
        } catch (error) {
            showError(error, 'Failed to send the payment');
        } finally {
            setPaying(false);
        }
    };

    const showClaims = totals.earned - totals.collected > 0 || data.payouts.length > 0;
    const showCommission = totals.collected > 0 || data.commissionPayments.length > 0;

    const commissionCards = [
        ['Collected from Students', totals.collected],
        [`Commission Due (${percent}%)`, totals.commissionDue],
        ['Paid to Admin', totals.commissionPaid],
        ['Waiting for Approval', totals.commissionWaiting],
        ['Still to Pay', totals.commissionOwed]
    ];

    const claimCards = [
        ['Card Sales', totals.earned - totals.collected],
        [`Admin Commission (${percent}%)`, totals.commission],
        ['Paid to You', totals.paidOut],
        ['Waiting for Approval', totals.waitingApproval],
        ['Still to Receive', totals.pending],
        ['Available to Claim', totals.available]
    ];

    if (!showClaims && !showCommission) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 mb-8">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Earnings & Commission</h2>
                {hasUsd && (
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200">
                        <option value="LKR">Rs.</option>
                        <option value="USD">USD</option>
                    </select>
                )}
            </div>

            {showCommission && (
                <div className={showClaims ? 'mb-8' : ''}>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Commission to Admin</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                        {commissionCards.map(([label, value]) => <Card key={label} label={label} value={value} currency={currency} />)}
                    </div>

                    {totals.commissionPayable > 0 && (
                        <form onSubmit={handlePayCommission} className="space-y-3 mb-4">
                            {site.bankDetails && <p className="text-xs whitespace-pre-line text-slate-600 dark:text-slate-300">{site.bankDetails}</p>}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <input type="number" min="0.01" step="0.01" max={totals.commissionPayable} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount paid" required className={inputClass} />
                                <input type="text" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className={inputClass} />
                                <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setProof(e.target.files?.[0] || null)} className="text-xs text-slate-600 dark:text-slate-300" />
                                <button type="submit" disabled={paying} className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50 whitespace-nowrap">
                                    {paying ? 'Sending...' : 'Send Payment Proof'}
                                </button>
                            </div>
                        </form>
                    )}

                    {data.commissionPayments.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                        <th className="py-2 pr-4 font-semibold">Date</th>
                                        <th className="py-2 pr-4 font-semibold">Paid</th>
                                        <th className="py-2 pr-4 font-semibold">Status</th>
                                        <th className="py-2 font-semibold">Reference or Note</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700 dark:text-slate-300">
                                    {data.commissionPayments.map(p => (
                                        <tr key={p._id} className="border-b border-slate-100 dark:border-slate-800/60">
                                            <td className="py-2 pr-4">{new Date(p.createdAt).toLocaleDateString('en-LK')}</td>
                                            <td className="py-2 pr-4 font-semibold">{formatMoney(p.amount, p.currency)}</td>
                                            <td className="py-2 pr-4">{STATUS_LABELS[p.status]}</td>
                                            <td className="py-2">{p.note || p.reference || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {showClaims && (
                <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Card Sales Held by the Platform</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {claimCards.map(([label, value]) => <Card key={label} label={label} value={value} currency={currency} />)}
            </div>

            <form onSubmit={handleClaim} className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={totals.available}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount to claim"
                    required
                    className="w-full sm:w-48 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
                <button type="submit" disabled={sending || totals.available <= 0} className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50">
                    {sending ? 'Sending...' : 'Claim'}
                </button>
                {claimed > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {percent}% commission {formatMoney(commission, currency)} • You receive {formatMoney(claimed - commission, currency)}
                    </span>
                )}
            </form>
            <p className="text-[11px] text-slate-500 mb-5">
                Payments go to your <Link to="/instructor/payment-settings" className="text-primary hover:underline">payment details</Link>.
            </p>

            {data.payouts.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                <th className="py-2 pr-4 font-semibold">Date</th>
                                <th className="py-2 pr-4 font-semibold">Claimed</th>
                                <th className="py-2 pr-4 font-semibold">Commission</th>
                                <th className="py-2 pr-4 font-semibold">You Receive</th>
                                <th className="py-2 pr-4 font-semibold">Status</th>
                                <th className="py-2 font-semibold">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700 dark:text-slate-300">
                            {data.payouts.map(p => (
                                <tr key={p._id} className="border-b border-slate-100 dark:border-slate-800/60">
                                    <td className="py-2 pr-4">{new Date(p.createdAt).toLocaleDateString('en-LK')}</td>
                                    <td className="py-2 pr-4">{formatMoney(p.grossAmount ?? p.amount, p.currency)}</td>
                                    <td className="py-2 pr-4">{formatMoney(p.commissionAmount, p.currency)}</td>
                                    <td className="py-2 pr-4 font-semibold">{formatMoney(p.amount, p.currency)}</td>
                                    <td className="py-2 pr-4">{STATUS_LABELS[p.status]}</td>
                                    <td className="py-2">{p.transactionId || p.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
                </div>
            )}
        </div>
    );
};

export default EarningsPanel;
