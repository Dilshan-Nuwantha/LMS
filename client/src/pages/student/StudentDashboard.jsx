import { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { FaBook, FaCheckCircle, FaPlus, FaCog, FaUsers, FaEye, FaEyeSlash, FaTrash, FaGraduationCap, FaChalkboardTeacher, FaStore, FaRobot, FaArrowRight } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';

const StudentDashboard = ({ defaultTab }) => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active tab from route or prop
    const getInitialTab = () => {
        if (location.pathname === '/my-courses') return 'created';
        if (defaultTab === 'created') return 'created';
        return 'enrolled';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [createdCourses, setCreatedCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [newCourse, setNewCourse] = useState({ title: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Sync tab with route
    useEffect(() => {
        if (activeTab === 'created' && location.pathname !== '/my-courses') {
            navigate('/my-courses', { replace: true });
        } else if (activeTab === 'enrolled' && location.pathname !== '/my-learning') {
            navigate('/my-learning', { replace: true });
        }
    }, [activeTab, location.pathname, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [enrolledRes, createdRes] = await Promise.all([
                    api.get('/courses/my/enrolled'),
                    api.get('/courses/my/created')
                ]);
                setEnrolledCourses(enrolledRes.data);
                setCreatedCourses(createdRes.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        if (!newCourse.title.trim() || !newCourse.description.trim()) {
            showError('Please fill all fields');
            return;
        }

        setCreating(true);
        try {
            const res = await api.post('/courses', newCourse);
            setCreatedCourses([res.data, ...createdCourses]);
            setShowCreateModal(false);
            setNewCourse({ title: '', description: '' });
            showSuccess('Course created successfully');
            navigate(`/admin/course/${res.data._id}`);
        } catch (error) {
            showError(error, 'Failed to create course');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;

        setDeleting(true);
        try {
            await api.delete(`/courses/${courseToDelete._id}`);
            setCreatedCourses(createdCourses.filter(c => c._id !== courseToDelete._id));
            setShowDeleteModal(false);
            setCourseToDelete(null);
            showSuccess('Course deleted successfully');
        } catch (error) {
            showError(error, 'Failed to delete course');
        } finally {
            setDeleting(false);
        }
    };

    const openDeleteModal = (course) => {
        setCourseToDelete(course);
        setShowDeleteModal(true);
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-slate-950">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-400 rounded-full animate-spin"></div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-12 transition-colors duration-300">

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="container mx-auto px-4">
                    <div className="flex gap-1">
                        <Link
                            to="/marketplace"
                            className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                        >
                            <FaStore className="text-sm" />
                            <span>Marketplace</span>
                        </Link>
                        <button
                            onClick={() => setActiveTab('enrolled')}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'enrolled'
                                ? 'border-slate-900 text-slate-900 dark:text-white dark:border-white'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <FaGraduationCap className="text-sm" />
                            <span>My Learning</span>
                            {enrolledCourses.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {enrolledCourses.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('created')}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'created'
                                ? 'border-slate-900 text-slate-900 dark:text-white dark:border-white'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <FaChalkboardTeacher className="text-sm" />
                            <span>My Courses</span>
                            {createdCourses.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {createdCourses.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 sm:py-8">
                {/* AI Chat Banner */}
                {activeTab === 'enrolled' && (
                    <Link to="/ai-chat" className="block mb-6 group">
                        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg hover:shadow-xl transition-all">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                            <div className="relative flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0">
                                        <FaRobot className="text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold">AI Study Assistant</h3>
                                        <p className="text-sm text-white/80 mt-0.5">Upload PDFs, images & ask questions — get instant AI-powered help</p>
                                    </div>
                                </div>
                                <FaArrowRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
                            </div>
                        </div>
                    </Link>
                )}

                {activeTab === 'enrolled' ? (
                    // Enrolled Courses Tab
                    enrolledCourses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {enrolledCourses.map(item => {
                                const completionLabel = item.course.completedStatus || 'Completed';
                                const completedCount = item.completedLectures ? item.completedLectures.filter(l => l.status === completionLabel).length : 0;

                                // Use pre-computed totalLectures from optimized API
                                const totalLectures = item.course.totalLectures ?? 0;
                                const percent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

                                return (
                                    <Link
                                        key={item._id}
                                        to={`/course/${item.course._id}`}
                                        className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group"
                                    >
                                        {/* Card Header - Thumbnail */}
                                        <div className="h-28 sm:h-32 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 relative overflow-hidden">
                                            {item.course.thumbnail ? (
                                                <img src={item.course.thumbnail} alt={item.course.title} className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <FaGraduationCap className="text-white/20 text-5xl transform group-hover:scale-110 transition-transform duration-500" />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {item.course.title}
                                            </h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                                                {item.course.description || "No description provided."}
                                            </p>

                                            {/* Progress Info */}
                                            <div className="mt-auto">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {completedCount} of {totalLectures} lectures
                                                    </span>
                                                    <span className={`text-xs font-semibold ${percent === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                                        {percent === 100 ? (
                                                            <span className="flex items-center gap-1">
                                                                <FaCheckCircle className="text-[10px]" /> Complete
                                                            </span>
                                                        ) : (
                                                            `${percent}%`
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-1.5 rounded-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 sm:py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 transition-colors duration-300">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <FaGraduationCap className="text-blue-400 dark:text-blue-500 text-3xl" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                                No courses yet
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                When you get enrolled in a course by an instructor, it will appear here.
                            </p>
                        </div>
                    )
                ) : (
                    // Created Courses Tab
                    <div>
                        {/* Header with Create Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {createdCourses.length > 0
                                        ? `You have ${createdCourses.length} course${createdCourses.length > 1 ? 's' : ''}`
                                        : 'Start creating your first course'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg text-sm flex items-center gap-2 transition-colors shadow-sm hover:shadow-md w-full sm:w-auto justify-center"
                            >
                                <FaPlus className="text-xs" /> Create New Course
                            </button>
                        </div>

                        {createdCourses.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                {createdCourses.map(course => {
                                    // Use pre-computed totalLectures from optimized API
                                    const totalLectures = course.totalLectures ?? 0;
                                    const studentCount = course.studentCount ?? 0;

                                    return (
                                        <div key={course._id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group">
                                            {/* Card Header */}
                                            <div className="h-28 sm:h-32 bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-800 relative overflow-hidden">
                                                {course.thumbnail ? (
                                                    <img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <FaChalkboardTeacher className="text-white/20 text-5xl transform group-hover:scale-110 transition-transform duration-500" />
                                                        </div>
                                                    </>
                                                )}

                                                {/* Status Badge */}
                                                <div className="absolute top-3 right-3">
                                                    <span className={`text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm ${course.status === 'Published' ? 'bg-green-600/70' :
                                                        course.status === 'Archived' ? 'bg-red-500/70' : 'bg-yellow-500/70'
                                                        }`}>
                                                        {course.status === 'Published' ? (
                                                            <span className="flex items-center gap-1">
                                                                <FaEye className="text-[8px]" /> Live
                                                            </span>
                                                        ) : course.status === 'Archived' ? (
                                                            <span className="flex items-center gap-1">
                                                                <FaEyeSlash className="text-[8px]" /> Archived
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1">
                                                                <FaEyeSlash className="text-[8px]" /> Draft
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2 transition-colors">
                                                    {course.title}
                                                </h2>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                                                    {course.description || "No description provided."}
                                                </p>

                                                {/* Stats */}
                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
                                                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                                                        <FaBook className="text-slate-400 text-[10px]" />
                                                        {totalLectures} lectures
                                                    </span>
                                                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                                                        <FaUsers className="text-slate-400 text-[10px]" />
                                                        {studentCount} students
                                                    </span>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 mt-auto">
                                                    <Link
                                                        to={`/admin/course/${course._id}`}
                                                        className="flex-1 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <FaCog className="text-xs" /> Manage
                                                    </Link>
                                                    <Link
                                                        to={`/admin/course/${course._id}?tab=students`}
                                                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 px-3 rounded-lg text-sm flex items-center justify-center transition-colors"
                                                        title="View Students"
                                                    >
                                                        <FaUsers />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            openDeleteModal(course);
                                                        }}
                                                        className="bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 dark:hover:text-red-400 font-medium py-2.5 px-3 rounded-lg text-sm flex items-center justify-center transition-colors"
                                                        title="Delete Course"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16 sm:py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 transition-colors duration-300">
                                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                    <FaChalkboardTeacher className="text-emerald-400 dark:text-emerald-500 text-3xl" />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                                    No courses created yet
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                                    Create your first course and start sharing your knowledge with students.
                                </p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm inline-flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
                                >
                                    <FaPlus className="text-xs" /> Create Your First Course
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Course Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                                <FaPlus className="text-blue-600 dark:text-blue-400 text-lg" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create New Course</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fill in the details to create your course</p>
                        </div>
                        <form onSubmit={handleCreateCourse} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Course Title
                                </label>
                                <input
                                    type="text"
                                    value={newCourse.title}
                                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-800 transition-all outline-none"
                                    placeholder="e.g., Introduction to Web Development"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-800 transition-all resize-none outline-none"
                                    placeholder="Describe what students will learn..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setNewCourse({ title: '', description: '' });
                                    }}
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-xl text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-colors shadow-sm hover:shadow-md"
                                >
                                    {creating ? 'Creating...' : 'Create Course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Course Modal */}
            {showDeleteModal && courseToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
                                <FaTrash className="text-red-600 dark:text-red-400 text-lg" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Delete Course</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-200">"{courseToDelete.title}"</span>?
                            </p>
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4 mb-6">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    This action cannot be undone. All lectures, sections, and enrolled student progress will be permanently deleted.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setCourseToDelete(null);
                                    }}
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-xl text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteCourse}
                                    disabled={deleting}
                                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-colors shadow-sm hover:shadow-md"
                                >
                                    {deleting ? 'Deleting...' : 'Delete Course'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
