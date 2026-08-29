import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartBar, FaHistory, FaRobot, FaBan, FaTrash, FaSearch, FaUserPlus } from 'react-icons/fa';
import api from '../../api/axios';
import Pagination from '../ui/Pagination';
import { showSuccess, showError } from '../../utils/toast';

const StudentsTab = ({
    courseId,
    course,
    // AI chat viewer
    onViewStudentAIChats,
    onToggleAIBlock,
}) => {
    const navigate = useNavigate();

    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [studentsLoaded, setStudentsLoaded] = useState(false);
    const [studentPage, setStudentPage] = useState(1);
    const [studentTotalPages, setStudentTotalPages] = useState(1);
    const [studentKeyword, setStudentKeyword] = useState('');
    const [debouncedStudentKeyword, setDebouncedStudentKeyword] = useState('');
    const [enrollEmail, setEnrollEmail] = useState('');
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [studentLimit, setStudentLimit] = useState(15);
    const [studentTotal, setStudentTotal] = useState(0);

    // Fetch students with pagination
    const fetchStudents = async (page = 1, keyword = '') => {
        try {
            const res = await api.get(`/courses/${courseId}/progresses?page=${page}&limit=${studentLimit}&keyword=${keyword}`);
            setEnrolledStudents(res.data.progresses || res.data);
            setStudentTotalPages(res.data.pages || 1);
            setStudentTotal(res.data.total || 0);
            setStudentsLoaded(true);
        } catch (err) {
            console.error("Failed to fetch students", err);
        }
    };

    // Debounce student search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedStudentKeyword(studentKeyword);
            setStudentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [studentKeyword]);

    // Fetch students when page, limit or search changes
    useEffect(() => {
        fetchStudents(studentPage, debouncedStudentKeyword);
    }, [studentPage, studentLimit, debouncedStudentKeyword]);

    // Enroll student by email
    const handleEnrollStudent = async (e) => {
        e.preventDefault();
        setIsEnrolling(true);
        try {
            await api.post(`/courses/${courseId}/enroll`, { email: enrollEmail });
            setEnrollEmail('');
            showSuccess('Student enrolled successfully');
            fetchStudents(studentPage, debouncedStudentKeyword);
        } catch (error) {
            if (!error.handled) {
                showError(error, 'Error enrolling student');
            }
        } finally {
            setIsEnrolling(false);
        }
    };

    // Remove student from course
    const handleRemoveStudent = async (studentId, studentName) => {
        if (!window.confirm(`Are you sure you want to remove ${studentName} from this course? Progress will be lost.`)) return;
        try {
            await api.delete(`/courses/${courseId}/enroll/${studentId}`);
            showSuccess('Student removed from course');
            fetchStudents(studentPage, debouncedStudentKeyword);
        } catch (error) {
            if (!error.handled) {
                showError('Failed to remove student');
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Student List */}
            <div className="lg:col-span-2 space-y-4">
                {/* Header */}
                <div className="flex items-start sm:items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Manage Students</h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">View and manage enrolled students</p>
                    </div>
                </div>

                {/* Search */}
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-colors"
                            value={studentKeyword}
                            onChange={(e) => setStudentKeyword(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-slate-950/50 border-b border-gray-100 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                    <th className="px-4 sm:px-6 py-4">Student</th>
                                    <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">Enrolled Date</th>
                                    <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {!studentsLoaded ? (
                                    <tr><td colSpan="3" className="px-6 py-8 text-center text-xs text-slate-400">Loading...</td></tr>
                                ) : enrolledStudents.length > 0 ? (
                                    enrolledStudents.map((prog) => (
                                        <tr key={prog._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-4 sm:px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 dark:border-slate-700 uppercase">
                                                        {prog.student?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{prog.student?.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{prog.student?.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-xs text-slate-500 hidden sm:table-cell">
                                                {new Date(prog.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => navigate(`/admin/course/${courseId}/student/${prog.student?._id}/progress`)}
                                                        className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                                        title="View Progress"
                                                    >
                                                        <FaChartBar size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/admin/course/${courseId}/student/${prog.student?._id}`)}
                                                        className="text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                                        title="View Activity Log"
                                                    >
                                                        <FaHistory size={14} />
                                                    </button>
                                                    {course.allowStudentAI && (
                                                        <>
                                                        <button
                                                            onClick={() => onViewStudentAIChats(prog.student)}
                                                            className="p-2 rounded transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                            title="View student AI conversations (instructor key only)"
                                                        >
                                                            <FaRobot size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onToggleAIBlock(prog.student?._id)}
                                                            className={`p-2 rounded transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 ${
                                                                course.aiBlockedStudents?.some(id => id === prog.student?._id || id?.toString() === prog.student?._id)
                                                                    ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                                                    : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                                            }`}
                                                            title={course.aiBlockedStudents?.some(id => id === prog.student?._id || id?.toString() === prog.student?._id)
                                                                ? 'AI Blocked — Click to restore access'
                                                                : 'Block student from using your AI key'
                                                            }
                                                        >
                                                            <FaBan size={14} />
                                                        </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveStudent(prog.student?._id, prog.student?.name)}
                                                        className="text-red-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                                        title="Remove Student"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="3" className="px-6 py-8 text-center text-xs text-slate-400">No students found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={studentPage}
                        totalPages={studentTotalPages}
                        totalItems={studentTotal}
                        itemsPerPage={studentLimit}
                        onPageChange={(newPage) => setStudentPage(newPage)}
                        onLimitChange={(newLimit) => {
                            setStudentLimit(newLimit);
                            setStudentPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Right: Enroll Form */}
            <div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 sticky top-40 transition-colors">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FaUserPlus className="text-slate-400 dark:text-slate-500" /> Enroll New Student
                    </h2>
                    <form onSubmit={handleEnrollStudent} className="space-y-4">
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Student Email</label>
                            <input
                                type="email"
                                className="w-full rounded-md border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
                                value={enrollEmail}
                                onChange={(e) => setEnrollEmail(e.target.value)}
                                placeholder="student@example.com"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isEnrolling}
                            className="w-full bg-slate-900 dark:bg-blue-600 text-white py-2.5 rounded-md text-xs font-bold uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {isEnrolling ? 'Enrolling...' : 'Invite User'}
                        </button>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                            The user will be immediately enrolled in this course. They must already have an account on the platform.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentsTab;
