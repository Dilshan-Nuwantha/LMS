import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { formatMoney } from '../../utils/currency';
import { showSuccess, showError } from '../../utils/toast';

const PaymentSlips = ({ onReviewed }) => {
    const [slips, setSlips] = useState([]);

    const fetchSlips = async () => {
        try {
            const res = await api.get('/purchase/slips');
            setSlips(res.data);
        } catch (error) {
            showError(error, 'Failed to load payment slips');
        }
    };

    useEffect(() => { fetchSlips(); }, []);

    const openSlip = async (id) => {
        try {
            const res = await api.get(`/purchase/${id}/slip`, { responseType: 'blob' });
            window.open(URL.createObjectURL(res.data), '_blank', 'noopener');
        } catch (error) {
            showError(error, 'Failed to open the slip');
        }
    };

    const review = async (id, action, body) => {
        try {
            await api.put(`/purchase/${id}/slip/${action}`, body);
            showSuccess(action === 'approve' ? 'Payment approved' : 'Payment slip rejected');
            setSlips(current => current.filter(slip => slip._id !== id));
            onReviewed?.();
        } catch (error) {
            showError(error, 'Failed to review the slip');
        }
    };

    const reject = (id) => {
        const reason = window.prompt('Why is this slip rejected? The student will see this.');
        if (reason !== null) review(id, 'reject', { reason });
    };

    if (slips.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">Payment Slips to Review ({slips.length})</h2>
            <div className="space-y-3">
                {slips.map(slip => (
                    <div key={slip._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                            <p className="font-bold text-slate-900 dark:text-white">{slip.user?.name} • {slip.course?.title}</p>
                            <p>{slip.user?.email} • {formatMoney(slip.amount, slip.currency)}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <button type="button" onClick={() => openSlip(slip._id)} className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">View Slip</button>
                            <button type="button" onClick={() => review(slip._id, 'approve')} className="px-3 py-2 rounded-lg bg-success text-white">Approve</button>
                            <button type="button" onClick={() => reject(slip._id)} className="px-3 py-2 rounded-lg bg-danger text-white">Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentSlips;
