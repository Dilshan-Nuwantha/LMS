import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { formatMoney } from '../../utils/currency';
import { showSuccess, showError } from '../../utils/toast';

const CommissionReview = ({ onReviewed }) => {
    const [payments, setPayments] = useState([]);

    const fetchPayments = async () => {
        try {
            const res = await api.get('/admin/commission-payments', { params: { status: 'pending' } });
            setPayments(res.data);
        } catch (error) {
            showError(error, 'Failed to load commission payments');
        }
    };

    useEffect(() => { fetchPayments(); }, []);

    const openProof = async (id) => {
        try {
            const res = await api.get(`/admin/commission-payments/${id}/proof`, { responseType: 'blob' });
            window.open(URL.createObjectURL(res.data), '_blank', 'noopener');
        } catch (error) {
            showError(error, 'Failed to open the proof');
        }
    };

    const review = async (id, action, body = {}) => {
        try {
            await api.put(`/admin/commission-payments/${id}/${action}`, body);
            showSuccess(action === 'approve' ? 'Payment approved' : 'Payment rejected');
            fetchPayments();
            onReviewed?.();
        } catch (error) {
            showError(error, 'Failed to review the payment');
        }
    };

    const reject = (id) => {
        const note = window.prompt('Why is this payment rejected? The instructor will see this.');
        if (note !== null) review(id, 'reject', { note });
    };

    if (payments.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Commission Payments to Verify ({payments.length})</h3>
            <div className="space-y-3">
                {payments.map(payment => (
                    <div key={payment._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                            <p className="font-bold text-slate-900 dark:text-white">{payment.instructor?.name} • {formatMoney(payment.amount, payment.currency)}</p>
                            <p>{payment.reference || 'No reference'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <button type="button" onClick={() => openProof(payment._id)} className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">View Proof</button>
                            <button type="button" onClick={() => review(payment._id, 'approve')} className="px-3 py-2 rounded-lg bg-emerald-500 text-white">Approve</button>
                            <button type="button" onClick={() => reject(payment._id)} className="px-3 py-2 rounded-lg bg-red-500 text-white">Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommissionReview;
