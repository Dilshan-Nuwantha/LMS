import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { FaArrowLeft, FaUsers, FaCheckCircle, FaClock, FaPercentage, FaTrophy } from 'react-icons/fa';

const QuizAnalytics = () => {
    const { courseId, quizId } = useParams();
    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [quizId]);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get(`/quizzes/${quizId}/analytics`);
            setAnalytics(res.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <p className="text-slate-500">Failed to load analytics</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-12 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/admin/course/${courseId}/quizzes`)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Quiz Analytics</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{analytics.quizTitle}</p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                            <FaUsers size={14} />
                            <span className="text-xs font-medium">Students</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{analytics.overview.uniqueStudents}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                            <FaCheckCircle size={14} />
                            <span className="text-xs font-medium">Pass Rate</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.overview.passRate}%</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                            <FaPercentage size={14} />
                            <span className="text-xs font-medium">Avg Score</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.overview.avgScore}%</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                            <FaClock size={14} />
                            <span className="text-xs font-medium">Avg Time</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatTime(analytics.overview.avgTimeTaken)}</p>
                    </div>
                </div>

                {/* Question Stats */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Question Performance</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">How students performed on each question</p>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {analytics.questionStats.map((q, idx) => (
                            <div key={idx} className="p-4 flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-900 dark:text-white truncate">{q.questionText}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {q.correctCount} of {q.totalAnswers} correct
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-lg font-bold ${
                                        q.correctRate >= 70 ? 'text-green-600 dark:text-green-400' :
                                        q.correctRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-red-600 dark:text-red-400'
                                    }`}>
                                        {q.correctRate}%
                                    </p>
                                </div>
                            </div>
                        ))}
                        {analytics.questionStats.length === 0 && (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                No question data available yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <FaTrophy className="text-amber-500" />
                            Top Performers
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {analytics.topPerformers.map((p, idx) => (
                            <div key={idx} className="p-4 flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                                    idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                    idx === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                                    idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                    'bg-gray-100 dark:bg-slate-800 text-slate-500'
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.student.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.student.email}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-lg font-bold ${p.passed ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {p.percentage}%
                                    </p>
                                    <p className="text-xs text-slate-500">{formatTime(p.timeTaken)}</p>
                                </div>
                            </div>
                        ))}
                        {analytics.topPerformers.length === 0 && (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                No attempts yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizAnalytics;