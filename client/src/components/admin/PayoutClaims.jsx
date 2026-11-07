import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { formatMoney } from '../../utils/currency';
import { showSuccess, showError } from '../../utils/toast';

const PayoutClaims = ({ onReviewed }) => {
    const [claims, setClaims] = useState([]);

    const fetchClaims = async () => {
        try {
            const res = await api.get('/admin/payouts', { params: { status: 'pending', limit: 100 } });
            setClaims(res.data.payouts);
        } catch (error) {
            showError(error, 'Failed to load claims');
        }
    };

    useEffect(() => { fetchClaims(); }, []);

    const review = async (id, action, body) => {
        try {
            await api.put(`/admin/payouts/${id}/${action}`, body);
            showSuccess(action === 'approve' ? 'Claim marked as paid' : 'Claim rejected');
            fetchClaims();
            onReviewed?.();
        } catch (error) {
            showError(error, 'Failed to review the claim');
        }
    };

    const approve = (id) => {
        const transactionId = window.prompt('Transaction reference for this payment:');
        if (transactionId) review(id, 'approve', { transactionId });
    };

    const reject = (id) => {
        const note = window.prompt('Why is this claim rejected? The instructor will see this.');
        if (note !== null) review(id, 'reject', { note });
    };

    if (claims.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Claims to Review ({claims.length})</h3>
            <div className="space-y-3">
                {claims.map(claim => (
                    <div key={claim._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                            <p className="font-bold text-slate-900 dark:text-white">{claim.instructor?.name} • {claim.method?.replace('_', ' ')}</p>
                            <p>
                                Claimed {formatMoney(claim.grossAmount, claim.currency)} • Commission {formatMoney(claim.commissionAmount, claim.currency)} • Pay {formatMoney(claim.amount, claim.currency)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <button type="button" onClick={() => approve(claim._id)} className="px-3 py-2 rounded-lg bg-emerald-500 text-white">Mark as Paid</button>
                            <button type="button" onClick={() => reject(claim._id)} className="px-3 py-2 rounded-lg bg-red-500 text-white">Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PayoutClaims;
