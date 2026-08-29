import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { FaArrowLeft, FaUsers, FaBook, FaChartLine, FaTrophy, FaUserPlus, FaCheckCircle } from 'react-icons/fa';
import { showError } from '../../utils/toast';

const CourseAnalytics = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get(`/courses/${id}/analytics`);
                setAnalytics(res.data);
            } catch (error) {
                if (!error.handled) {
                    showError('Failed to load analytics');
                }
                navigate(`/admin/course/${id}`);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!analytics) return null;

    const { overview, lectureStats, sectionStats, topStudents, progressDistribution } = analytics;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 pb-12 transition-colors duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-navbar z-10 transition-colors">
                <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button
                            onClick={() => navigate(`/admin/course/${id}`)}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 shrink-0"
                        >
                            <FaArrowLeft className="text-sm sm:text-base" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">Analytics</h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">{analytics.courseTitle}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
                {/* Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-8">
                    <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <FaUsers className="text-blue-500 text-sm sm:text-base" />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{overview.totalStudents}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Students</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                                <FaBook className="text-purple-500 text-sm sm:text-base" />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{overview.totalLectures}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Lectures</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                                <FaChartLine className="text-green-500 text-sm sm:text-base" />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{overview.averageProgress}%</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Avg Progress</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                                <FaTrophy className="text-amber-500 text-sm sm:text-base" />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{overview.studentsCompleted}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Completed</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
                                <FaUserPlus className="text-cyan-500 text-sm sm:text-base" />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{overview.recentEnrollments}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">New (7 days)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    {/* Section Progress */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 sm:mb-4">Section Progress</h2>
                        {sectionStats.length > 0 ? (
                            <div className="space-y-3 sm:space-y-4">
                                {sectionStats.map((section, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between text-[11px] sm:text-xs mb-1">
                                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[60%]">{section.title}</span>
                                            <span className="text-slate-500 dark:text-slate-400">{section.lectureCount} lectures</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 sm:h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        section.averageCompletion >= 75 ? 'bg-green-500' :
                                                        section.averageCompletion >= 50 ? 'bg-blue-500' :
                                                        section.averageCompletion >= 25 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${section.averageCompletion}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 w-8 sm:w-10 text-right">{section.averageCompletion}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center py-6 sm:py-8">No sections yet</p>
                        )}
                    </div>

                    {/* Top Performing Students */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 sm:mb-4">Top Students</h2>
                        {topStudents.length > 0 ? (
                            <div className="space-y-2.5 sm:space-y-3">
                                {topStudents.map((student, idx) => (
                                    <div key={student.studentId} className="flex items-center gap-2 sm:gap-3">
                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                                            idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                            idx === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                                            idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">{student.studentName}</p>
                                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{student.completedLectures}/{overview.totalLectures} done</p>
                                        </div>
                                        <span className={`text-xs sm:text-sm font-bold ${
                                            student.progressPercent === 100 ? 'text-green-500' :
                                            student.progressPercent >= 75 ? 'text-blue-500' :
                                            'text-slate-600 dark:text-slate-400'
                                        }`}>
                                            {student.progressPercent}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center py-6 sm:py-8">No students enrolled</p>
                        )}
                    </div>

                    {/* Progress Distribution */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm md:col-span-2 lg:col-span-1">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 sm:mb-4">Progress Distribution</h2>
                        <div className="space-y-3 sm:space-y-4">
                            {Object.entries(progressDistribution).map(([range, count]) => {
                                const percent = overview.totalStudents > 0 ? Math.round((count / overview.totalStudents) * 100) : 0;
                                const colors = {
                                    '0-25': 'bg-red-500',
                                    '25-50': 'bg-amber-500',
                                    '50-75': 'bg-blue-500',
                                    '75-100': 'bg-green-500'
                                };
                                return (
                                    <div key={range}>
                                        <div className="flex justify-between text-[11px] sm:text-xs mb-1">
                                            <span className="text-slate-600 dark:text-slate-400">{range}%</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{count} students</span>
                                        </div>
                                        <div className="h-1.5 sm:h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full ${colors[range]} rounded-full transition-all`} style={{ width: `${percent}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Lecture Completion Rates */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 sm:mb-4">Lecture Completion Rates</h2>
                    {lectureStats.length > 0 ? (
                        <>
                            {/* Mobile Card View */}
                            <div className="sm:hidden space-y-3">
                                {lectureStats.slice(0, 10).map((lecture, idx) => (
                                    <div key={idx} className="border border-gray-100 dark:border-slate-800 rounded-lg p-3">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FaCheckCircle className={`text-xs shrink-0 ${lecture.completionRate >= 75 ? 'text-green-500' : lecture.completionRate >= 50 ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`} />
                                                <span className="text-xs font-medium text-slate-900 dark:text-white truncate">{lecture.title}</span>
                                            </div>
                                            <span className={`text-xs font-bold shrink-0 ${
                                                lecture.completionRate >= 75 ? 'text-green-500' :
                                                lecture.completionRate >= 50 ? 'text-blue-500' :
                                                'text-slate-500'
                                            }`}>{lecture.completionRate}%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                                            <span>{lecture.sectionTitle}</span>
                                            <span>{lecture.completedCount}/{overview.totalStudents} done</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    lecture.completionRate >= 75 ? 'bg-green-500' :
                                                    lecture.completionRate >= 50 ? 'bg-blue-500' :
                                                    lecture.completionRate >= 25 ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${lecture.completionRate}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-slate-800 text-xs text-slate-500 uppercase">
                                            <th className="pb-3 font-semibold">Lecture</th>
                                            <th className="pb-3 font-semibold">Section</th>
                                            <th className="pb-3 font-semibold text-center">Completed</th>
                                            <th className="pb-3 font-semibold">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {lectureStats.slice(0, 10).map((lecture, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <FaCheckCircle className={`text-xs ${lecture.completionRate >= 75 ? 'text-green-500' : lecture.completionRate >= 50 ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`} />
                                                        <span className="text-sm text-slate-900 dark:text-white">{lecture.title}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-xs text-slate-500 dark:text-slate-400">{lecture.sectionTitle}</td>
                                                <td className="py-3 text-center">
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{lecture.completedCount} / {overview.totalStudents}</span>
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    lecture.completionRate >= 75 ? 'bg-green-500' :
                                                                    lecture.completionRate >= 50 ? 'bg-blue-500' :
                                                                    lecture.completionRate >= 25 ? 'bg-amber-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${lecture.completionRate}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10">{lecture.completionRate}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {lectureStats.length > 10 && (
                                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 text-center mt-3 sm:mt-4">Showing top 10 of {lectureStats.length} lectures</p>
                            )}
                        </>
                    ) : (
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center py-6 sm:py-8">No lectures yet</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseAnalytics;