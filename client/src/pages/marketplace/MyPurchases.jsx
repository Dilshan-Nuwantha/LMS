import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlay, FaBook, FaCalendar, FaFileInvoice } from 'react-icons/fa';
import api from '../../api/axios';
import { showError } from '../../utils/toast';

const MyPurchases = () => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            const res = await api.get('/purchase/my-purchases');
            setPurchases(res.data);
        } catch (error) {
            showError('Failed to load purchases');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
                    My Purchases
                </h1>

                {purchases.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaBook className="text-2xl text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            No purchases yet
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Explore our marketplace and start learning today!
                        </p>
                        <Link
                            to="/marketplace"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                        >
                            Browse Courses
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {purchases.map(purchase => {
                            const course = purchase.course;
                            if (!course) return null;

                            const totalLectures = course.sections?.reduce((acc, s) => s.isPublic !== false ? acc + (s.lectures?.filter(l => l.isPublic !== false).length || 0) : acc, 0) || 0;

                            return (
                                <div
                                    key={purchase._id}
                                    className="group bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 dark:border-slate-700"
                                >
                                    {/* Thumbnail */}
                                    <Link to={`/course/${course._id}`} className="block relative aspect-video overflow-hidden bg-slate-200 dark:bg-slate-700">
                                        {course.thumbnail ? (
                                            <img
                                                src={course.thumbnail}
                                                alt={course.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FaBook className="text-4xl text-slate-400" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                                                <FaPlay className="text-indigo-500 text-xl ml-1" />
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Content */}
                                    <div className="p-4">
                                        <Link to={`/course/${course._id}`}>
                                            <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-indigo-500 transition-colors">
                                                {course.title}
                                            </h3>
                                        </Link>

                                        {purchase.instructor && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                                By {purchase.instructor.name}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <FaBook />
                                                {totalLectures} lectures
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FaCalendar />
                                                {formatDate(purchase.purchasedAt)}
                                            </span>
                                        </div>

                                        {/* Invoice Link */}
                                        {purchase.invoiceNumber && (
                                            <Link
                                                to={`/invoice/${purchase.invoiceNumber}`}
                                                className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
                                            >
                                                <FaFileInvoice />
                                                View Invoice ({purchase.invoiceNumber})
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyPurchases;
