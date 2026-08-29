import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChalkboardTeacher } from 'react-icons/fa';
import api from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';

const BecomeInstructor = () => {
    const navigate = useNavigate();
    const { user, setUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);

    const handleBecomeInstructor = async () => {
        setLoading(true);
        try {
            const res = await api.post('/instructor/become');
            setUser(res.data.user || { ...user, role: 'instructor' });
            showSuccess('You are now an instructor!');
            navigate('/instructor/dashboard');
        } catch (error) {
            showError(error, 'Failed to become instructor');
        } finally {
            setLoading(false);
        }
    };

    if (user?.role === 'instructor') {
        navigate('/instructor/dashboard');
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaChalkboardTeacher className="text-3xl text-indigo-500" />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                        Become an Instructor
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                        Share your knowledge with the world. Create courses, set your own prices, and start earning.
                    </p>

                    <button
                        onClick={handleBecomeInstructor}
                        disabled={loading}
                        className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Start Teaching Today'}
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium transition-colors"
                    >
                        Go back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BecomeInstructor;
