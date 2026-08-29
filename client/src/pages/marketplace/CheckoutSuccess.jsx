import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaArrowRight } from 'react-icons/fa';
import api from '../../api/axios';

const CheckoutSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [course, setCourse] = useState(null);

    const sessionId = searchParams.get('session_id');
    const MAX_RETRIES = 15; // 15 retries * 2s = 30 seconds max

    useEffect(() => {
        if (sessionId) {
            checkPaymentStatus(0);
        } else {
            setStatus('error');
        }
    }, [sessionId]);

    const checkPaymentStatus = async (retryCount) => {
        try {
            const res = await api.get(`/purchase/session/${sessionId}`);
            setCourse(res.data.course);

            if (res.data.status === 'completed') {
                setStatus('success');
            } else if (res.data.status === 'pending') {
                if (retryCount >= MAX_RETRIES) {
                    setStatus('error');
                    return;
                }
                setTimeout(() => checkPaymentStatus(retryCount + 1), 2000);
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Verifying your payment...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaTimesCircle className="text-4xl text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                        Payment Failed
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                        Something went wrong with your payment. Please try again.
                    </p>
                    <Link
                        to="/marketplace"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                    >
                        Back to Marketplace <FaArrowRight />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Success Animation */}
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <FaCheckCircle className="text-4xl text-green-500" />
                </div>

                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    Payment Successful! 🎉
                </h1>

                <p className="text-slate-600 dark:text-slate-400 mb-2">
                    Thank you for your purchase!
                </p>

                {course && (
                    <p className="text-lg font-medium text-slate-900 dark:text-white mb-8">
                        You now have access to <span className="text-indigo-500">{course.title}</span>
                    </p>
                )}

                <div className="space-y-4">
                    {course && (
                        <Link
                            to={`/course/${course._id}`}
                            className="block w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            Start Learning Now
                        </Link>
                    )}

                    <Link
                        to="/my-purchases"
                        className="block w-full px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        View My Purchases
                    </Link>

                    <Link
                        to="/marketplace"
                        className="block text-indigo-500 hover:text-indigo-600 font-medium"
                    >
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
