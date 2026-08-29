import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FaCheckCircle, FaBook, FaClipboardList, FaTrophy, FaClock, FaChartLine, FaFire, FaBullseye, FaHistory, FaLayerGroup, FaCheck, FaPlay, FaPen, FaBookmark, FaBullhorn } from 'react-icons/fa';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const STATUS_COLORS = {
    'Completed': '#10b981',
    'In Progress': '#6366f1',
    'Not Started': '#475569',
};
const FALLBACK_COLORS = ['#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];

const StudentAnalytics = ({ courseId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get(`/courses/${courseId}/my-analytics`);
                setData(res.data);
            } catch (err) {
                setError('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [courseId]);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Loading analytics...</p>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <FaChartLine className="text-xl text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{error || 'No analytics data available'}</p>
        </div>
    );

    const { overview, sectionProgress, activityTimeline, statusDistribution, submissions, quizPerformance, recentActivity } = data;

    const pieData = Object.entries(statusDistribution).map(([name, value], i) => ({
        name,
        value,
        color: STATUS_COLORS[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
    }));

    const totalLectures = overview.totalLectures;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const strokeDash = (overview.overallPercent / 100) * circumference;

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-slate-900 dark:bg-slate-700 text-white px-3 py-2 rounded-lg shadow-xl text-[11px] font-medium border border-white/10">
                {label && <p className="text-slate-400 text-[10px] mb-0.5">{label}</p>}
                {payload.map((p, i) => (
                    <p key={i}>{p.name || 'Value'}: <span className="font-bold">{p.value}</span></p>
                ))}
            </div>
        );
    };

    const getActivityConfig = (action) => {
        if (action?.includes('Completed')) return { icon: FaCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
        if (action?.includes('Started') || action?.includes('In Progress')) return { icon: FaPlay, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' };
        if (action?.includes('Quiz')) return { icon: FaClipboardList, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' };
        if (action?.includes('Note')) return { icon: FaPen, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' };
        if (action?.includes('Revision')) return { icon: FaBookmark, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' };
        if (action?.includes('Broadcast') || action?.includes('Lecture Added')) return { icon: FaBullhorn, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
        return { icon: FaChartLine, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' };
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto">

            {/* ── Row 1: Progress Ring + 4 Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {/* Progress Ring */}
                <div className="sm:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 flex flex-col items-center justify-center">
                    <div className="relative w-28 h-28">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
                            <circle cx="65" cy="65" r={radius} fill="none" strokeWidth="9" className="stroke-slate-100 dark:stroke-slate-800" />
                            <circle
                                cx="65" cy="65" r={radius} fill="none" strokeWidth="9" strokeLinecap="round"
                                stroke={overview.overallPercent >= 80 ? '#10b981' : overview.overallPercent >= 40 ? '#6366f1' : '#f59e0b'}
                                strokeDasharray={`${strokeDash} ${circumference}`}
                                style={{ transition: 'stroke-dasharray 0.8s ease' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{overview.overallPercent}%</span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Complete</span>
                        </div>
                    </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="sm:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={FaBook} color="indigo" value={overview.completedLectures} suffix={`/${overview.totalLectures}`} label="Lectures Done" />
                    <StatCard icon={FaClipboardList} color="violet" value={overview.quizzesPassed} suffix={`/${overview.totalQuizzes}`} label="Quizzes Passed" />
                    <StatCard icon={FaClock} color="emerald" value={submissions.onTime} label="On Time" />
                    <StatCard icon={FaFire} color="amber" value={submissions.late} label={submissions.late === 0 ? 'No Late Work' : 'Late'} />
                </div>
            </div>

            {/* ── Row 2: Daily Activity + Status Breakdown ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Daily Activity</h3>
                        <span className="text-[10px] text-slate-400 font-medium">Last 30 days</span>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityTimeline} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(d) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}`; }}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    axisLine={false} tickLine={false}
                                    interval={4}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    axisLine={false} tickLine={false}
                                    width={30}
                                    domain={[0, (dataMax) => Math.max(dataMax, 5)]}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" name="Actions" stroke="#6366f1" strokeWidth={2} fill="url(#aGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Status Breakdown</h3>
                    {pieData.length > 0 ? (
                        <>
                            <div className="h-36">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-2 mt-3">
                                {pieData.map((entry, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                            <span className="text-xs text-slate-600 dark:text-slate-400">{entry.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-8">No data yet</p>
                    )}
                </div>
            </div>

            {/* ── Row 3: Section Progress ── */}
            {sectionProgress.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Section Progress</h3>
                    <div className="space-y-3">
                        {sectionProgress.map((sec, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[70%]">{sec.title}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{sec.completed}/{sec.total}</span>
                                        {sec.percent === 100 && <FaCheckCircle className="text-emerald-500 text-[10px]" />}
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            sec.percent === 100 ? 'bg-emerald-500' :
                                            sec.percent >= 50 ? 'bg-indigo-500' :
                                            sec.percent > 0 ? 'bg-violet-500' : 'bg-transparent'
                                        }`}
                                        style={{ width: `${sec.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Row 4: Quiz Performance ── */}
            {quizPerformance.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Quiz Performance</h3>
                    <div className="space-y-3">
                        {quizPerformance.map((quiz, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                <div className="flex items-center justify-between gap-3 mb-2.5">
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{quiz.title}</h4>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{quiz.totalAttempts} attempt{quiz.totalAttempts !== 1 ? 's' : ''} · Pass: {quiz.passingScore}%</p>
                                    </div>
                                    {quiz.passed ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full shrink-0">
                                            <FaTrophy size={9} /> Passed
                                        </span>
                                    ) : quiz.totalAttempts > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-full shrink-0">
                                            <FaBullseye size={9} /> {quiz.bestScore}%
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 shrink-0">Not attempted</span>
                                    )}
                                </div>
                                {quiz.scores.length > 0 && (
                                    <div className="flex items-end gap-[3px] h-10 mt-1">
                                        {quiz.scores.map((s, j) => (
                                            <div
                                                key={j}
                                                className={`flex-1 rounded-sm ${s.score >= quiz.passingScore ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                style={{ height: `${Math.max(s.score, 8)}%` }}
                                                title={`#${j + 1}: ${s.score}%`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Row 5: Recent Activity ── */}
            {recentActivity.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Recent Activity</h3>
                    <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-4">
                        {recentActivity.map((act, i) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600" />
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{act.details || act.action}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {new Date(act.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {' · '}
                                    {new Date(act.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon: Icon, color, value, suffix, label }) => {
    const colorMap = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500',
        violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-500',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500',
    };
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
                <Icon className="text-sm" />
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
                {value}
                {suffix && <span className="text-xs font-normal text-slate-400 ml-0.5">{suffix}</span>}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{label}</p>
        </div>
    );
};

export default StudentAnalytics;
