import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    FaArrowLeft,
    FaUserGraduate,
    FaHistory,
    FaCheckCircle,
    FaPlayCircle,
    FaClock,
    FaStickyNote,
    FaUserPlus,
    FaComment,
    FaEnvelope,
    FaUser,
    FaBookmark,
    FaBookOpen
} from 'react-icons/fa';
import Pagination from '../../components/ui/Pagination';

const StudentDetail = () => {
    const { courseId, studentId } = useParams();
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState(15);

    useEffect(() => {
        const fetchActivity = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/courses/${courseId}/activity/${studentId}?page=${page}&limit=${limit}`);
                setActivities(res.data.activities || []);
                setStudent(res.data.student || null);
                setTotalPages(res.data.pages || 1);
                setTotal(res.data.total || 0);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [courseId, studentId, page, limit]);

    const getActionIcon = (action) => {
        switch (action) {
            case 'Completed': return <FaCheckCircle className="text-green-500" />;
            case 'Started': return <FaPlayCircle className="text-blue-500" />;
            case 'In Progress': return <FaClock className="text-amber-500" />;
            case 'Note Updated': return <FaStickyNote className="text-purple-500" />;
            case 'Marked for Revision': return <FaBookmark className="text-amber-500" />;
            case 'Removed from Revision': return <FaBookOpen className="text-slate-400" />;
            case 'Enrolled': return <FaUserPlus className="text-indigo-500" />;
            case 'Comment': return <FaComment className="text-slate-500" />;
            case 'POST': return <FaCheckCircle className="text-green-600" />;
            case 'PUT': return <FaCheckCircle className="text-amber-600" />;
            case 'DELETE': return <FaCheckCircle className="text-red-600" />;
            default: return <FaHistory className="text-slate-400" />;
        }
    };

    const getActionBadgeClasses = (action) => {
        switch (action) {
            case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
            case 'Started': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
            case 'In Progress': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
            case 'Enrolled': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
            case 'Note Updated': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
            case 'Marked for Revision': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
            case 'Removed from Revision': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
            case 'Comment': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    if (loading && !student) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-slate-500 dark:text-slate-400 animate-pulse">Loading activity logs...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 pb-12 transition-colors duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-navbar z-10">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FaHistory className="text-slate-400" />
                                Student Activity Log
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tracking learning progress and actions</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Student Info Card */}
                {student && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                                {student.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FaUserGraduate className="text-slate-400 text-sm" />
                                    {student.name}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                    <FaEnvelope className="text-xs" />
                                    {student.email}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {total} activities
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Table */}
                {loading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-12 text-center">
                        <div className="text-slate-400 animate-pulse">Loading...</div>
                    </div>
                ) : activities.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-slate-950 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-gray-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 w-[200px]">User</th>
                                        <th className="px-6 py-4 w-[150px]">Action</th>
                                        <th className="px-6 py-4 w-[200px]">Lecture</th>
                                        <th className="px-6 py-4">Details</th>
                                        <th className="px-6 py-4 w-[150px]">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {activities.map((log) => {
                                        const user = log.user || student;
                                        return (
                                            <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs uppercase shrink-0">
                                                            {user?.name ? user.name.charAt(0) : <FaUser />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">{user?.name || 'Unknown'}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-500 truncate max-w-[120px]">{user?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                                    <div className="flex items-center gap-2">
                                                        {getActionIcon(log.action)}
                                                        <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${getActionBadgeClasses(log.action)}`}>
                                                            {log.action}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    {log.lecture ? (
                                                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                                            <span className="text-[10px] uppercase font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                                                #{log.lecture.number || '?'}
                                                            </span>
                                                            <span className="text-xs truncate max-w-[150px]" title={log.lecture.title}>
                                                                {log.lecture.title}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="max-w-[250px] min-w-0">
                                                        <div className="line-clamp-2 break-words text-xs text-slate-700 dark:text-slate-300 leading-relaxed" title={log.details || ''}>
                                                            {log.details || 'No details'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap align-top">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={total}
                            itemsPerPage={limit}
                            onPageChange={(newPage) => setPage(newPage)}
                            onLimitChange={(newLimit) => {
                                setLimit(newLimit);
                                setPage(1);
                            }}
                        />
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 border-dashed">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaHistory className="text-slate-300 dark:text-slate-600 text-2xl" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No activity yet</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {student?.name || 'This student'}'s activity will appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDetail;
