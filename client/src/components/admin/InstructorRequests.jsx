import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

const InstructorRequests = ({ onReviewed }) => {
    const [requests, setRequests] = useState([]);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/admin/instructor-requests');
            setRequests(res.data);
        } catch (error) {
            showError(error, 'Failed to load instructor requests');
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const review = async (id, action, body) => {
        try {
            await api.put(`/admin/instructor-requests/${id}/${action}`, body);
            showSuccess(action === 'approve' ? 'Instructor approved' : 'Request rejected');
            fetchRequests();
            onReviewed?.();
        } catch (error) {
            showError(error, 'Failed to review the request');
        }
    };

    const reject = (id) => {
        const note = window.prompt('Why is this request rejected? The user will see this.');
        if (note !== null) review(id, 'reject', { note });
    };

    if (requests.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Instructor Requests ({requests.length})</h3>
            <div className="space-y-3">
                {requests.map(request => (
                    <div key={request._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                            <p className="font-bold text-slate-900 dark:text-white">{request.name}</p>
                            <p>{request.email}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <button type="button" onClick={() => review(request._id, 'approve')} className="px-3 py-2 rounded-lg bg-emerald-500 text-white">Approve</button>
                            <button type="button" onClick={() => reject(request._id)} className="px-3 py-2 rounded-lg bg-red-500 text-white">Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InstructorRequests;
