import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FaPlus, FaRupeeSign, FaUsers, FaBook, FaChartLine,
    FaEdit, FaTag, FaEye, FaArrowRight, FaMoneyCheckAlt,
    FaCheckCircle, FaClock, FaCog
} from 'react-icons/fa';
import api from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import { showError } from '../../utils/toast';

const InstructorDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [dashboard, setDashboard] = useState({
        courses: [],
        totalCourses: 0,
        totalRevenue: 0,
        totalSales: 0,
        totalStudents: 0,
        recentPurchases: []
    });
    const [earnings, setEarnings] = useState(null);
    const [earningsLoading, setEarningsLoading] = useState(false);

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (activeTab === 'earnings' && !earnings) {
            fetchEarnings();
        }
    }, [activeTab]);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/instructor/dashboard');
            setDashboard(res.data);
        } catch (error) {
            showError('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchEarnings = async () => {
        setEarningsLoading(true);
        try {
            const res = await api.get('/instructor/earnings');
            setEarnings(res.data);
        } catch (error) {
            showError('Failed to load earnings');
        } finally {
            setEarningsLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return `₹${(amount || 0).toLocaleString('en-IN')}`;
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
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Instructor Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Welcome back, {user?.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/instructor/payment-settings"
                            className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <FaCog className="text-xs" />
                            Payment Settings
                        </Link>
                        <Link
                            to="/instructor/create-course"
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors"
                        >
                            <FaPlus className="text-xs" />
                            Create Course
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'courses', label: 'Courses' },
                        { id: 'earnings', label: 'Earnings' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard icon={FaRupeeSign} label="Total Revenue" value={formatCurrency(dashboard.totalRevenue)} color="green" />
                            <StatCard icon={FaChartLine} label="Total Sales" value={dashboard.totalSales} color="blue" />
                            <StatCard icon={FaUsers} label="Total Students" value={dashboard.totalStudents} color="purple" />
                            <StatCard icon={FaBook} label="Courses" value={dashboard.totalCourses} color="orange" />
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Courses */}
                            <div className="lg:col-span-2">
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <h2 className="font-semibold text-slate-900 dark:text-white">Your Courses</h2>
                                        <button onClick={() => setActiveTab('courses')} className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                                            View all <FaArrowRight className="text-[10px]" />
                                        </button>
                                    </div>
                                    {dashboard.courses.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <FaBook className="text-xl text-indigo-500" />
                                            </div>
                                            <h3 className="font-medium text-slate-900 dark:text-white mb-1">No courses yet</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create your first course and start earning!</p>
                                            <Link
                                                to="/instructor/create-course"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors"
                                            >
                                                <FaPlus /> Create Course
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {dashboard.courses.slice(0, 5).map(course => (
                                                <div key={course._id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{course.title}</p>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            <span className="flex items-center gap-1"><FaUsers className="text-[10px]" /> {course.enrollmentCount}</span>
                                                            <span>{formatCurrency(course.price)}</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                                course.status === 'Published'
                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                                            }`}>{course.status}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => navigate(`/instructor/course/${course._id}/edit`)} className="p-2 text-slate-400 hover:text-indigo-500" title="Edit"><FaEdit className="text-sm" /></button>
                                                        <button onClick={() => navigate(`/marketplace/course/${course._id}`)} className="p-2 text-slate-400 hover:text-blue-500" title="Preview"><FaEye className="text-sm" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Sales */}
                            <div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                                        <h2 className="font-semibold text-slate-900 dark:text-white">Recent Sales</h2>
                                    </div>
                                    {dashboard.recentPurchases.length === 0 ? (
                                        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No sales yet</p>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {dashboard.recentPurchases.slice(0, 5).map(purchase => (
                                                <div key={purchase._id} className="px-5 py-3 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                                        {purchase.user?.name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{purchase.user?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{purchase.course?.title}</p>
                                                    </div>
                                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">+{formatCurrency(purchase.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Courses Tab */}
                {activeTab === 'courses' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        {dashboard.courses.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FaBook className="text-xl text-indigo-500" />
                                </div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-1">No courses yet</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Start by creating your first course</p>
                                <Link to="/instructor/create-course" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors">
                                    <FaPlus /> Create Course
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {dashboard.courses.map(course => (
                                    <div key={course._id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-slate-900 dark:text-white mb-1">{course.title}</h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1"><FaUsers className="text-xs" /> {course.enrollmentCount} students</span>
                                                <span>{formatCurrency(course.price)}</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    course.status === 'Published'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                                }`}>{course.status}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => navigate(`/instructor/course/${course._id}/edit`)} className="p-2 text-slate-500 hover:text-indigo-500 transition-colors" title="Edit"><FaEdit /></button>
                                            <button onClick={() => navigate(`/instructor/course/${course._id}/coupons`)} className="p-2 text-slate-500 hover:text-green-500 transition-colors" title="Coupons"><FaTag /></button>
                                            <button onClick={() => navigate(`/marketplace/course/${course._id}`)} className="p-2 text-slate-500 hover:text-blue-500 transition-colors" title="Preview"><FaEye /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Earnings Tab */}
                {activeTab === 'earnings' && (
                    <div>
                        {earningsLoading ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Loading earnings...</div>
                        ) : earnings ? (
                            <>
                                {/* Earnings Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Earned</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(earnings.totalEarnings)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Paid Out</p>
                                        <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(earnings.totalPaidOut)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
                                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(earnings.pendingAmount)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Sales</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{earnings.totalSales}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Monthly Earnings */}
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                                            <h2 className="font-semibold text-slate-900 dark:text-white">Monthly Earnings</h2>
                                        </div>
                                        {earnings.monthlyEarnings.length === 0 ? (
                                            <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No earnings data</p>
                                        ) : (
                                            <div className="p-5 space-y-3">
                                                {earnings.monthlyEarnings.map(m => {
                                                    const maxAmount = Math.max(...earnings.monthlyEarnings.map(e => e.total));
                                                    const width = maxAmount > 0 ? (m.total / maxAmount) * 100 : 0;
                                                    return (
                                                        <div key={m._id}>
                                                            <div className="flex items-center justify-between text-sm mb-1">
                                                                <span className="text-slate-600 dark:text-slate-400">{m._id}</span>
                                                                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(m.total)} ({m.count} sales)</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${width}%` }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Payout History */}
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                                            <h2 className="font-semibold text-slate-900 dark:text-white">Payout History</h2>
                                        </div>
                                        {earnings.payouts.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <FaMoneyCheckAlt className="text-2xl text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                                <p className="text-sm text-slate-500 dark:text-slate-400">No payouts yet</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Payouts will appear here once the admin processes your payments</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {earnings.payouts.map(p => (
                                                    <div key={p._id} className="px-5 py-3 flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                            p.status === 'completed'
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {p.status === 'completed' ? <FaCheckCircle className="text-sm" /> : <FaClock className="text-sm" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(p.amount)}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {p.method.replace('_', ' ')} &middot; {new Date(p.createdAt).toLocaleDateString()}
                                                                {p.transactionId && ` · ${p.transactionId}`}
                                                            </p>
                                                        </div>
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                            p.status === 'completed'
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                        }`}>{p.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
    const colors = {
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <Icon />
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );
};

export default InstructorDashboard;
