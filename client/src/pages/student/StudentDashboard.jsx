import { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import {
    FaBook, FaCheckCircle, FaPlus, FaTrash,
    FaGraduationCap, FaChalkboardTeacher, FaStore, FaRobot,
    FaPlay, FaSearch, FaUser
} from 'react-icons/fa';
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
    const [searchCourseText, setSearchCourseText] = useState('');

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
                setEnrolledCourses(enrolledRes.data || []);
                setCreatedCourses(createdRes.data || []);
            } catch (error) {
                console.error('Error loading dashboard data:', error);
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

    const filteredEnrolledCourses = enrolledCourses.filter(course =>
        course.title?.toLowerCase().includes(searchCourseText.toLowerCase())
    );

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-950">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-primary rounded-full animate-spin"></div>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Loading Dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors duration-200">

            {/* 1. COVER BANNER HEADER */}
            <div className="bg-gradient-to-r from-slate-900 via-primary-700 to-slate-900 text-white pt-10 pb-20 px-4 lg:px-8">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                        {/* Profile Info Left */}
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                {user?.profilePicture ? (
                                    <img
                                        src={user.profilePicture}
                                        alt={user.name}
                                        className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-TENZE"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center font-black text-2xl border-4 border-white dark:border-slate-800 shadow-TENZE">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : <FaUser />}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-extrabold text-white">
                                        {user?.name}
                                    </h1>
                                    <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-md font-semibold text-white/90 capitalize">
                                        {user?.role || 'Student'}
                                    </span>
                                </div>
                                <p className="text-xs text-white/70 mt-0.5">{user?.email}</p>
                            </div>
                        </div>

                        {/* Right Quick Action Buttons */}
                        <div className="flex items-center gap-3">
                            <Link
                                to="/ai-chat"
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all"
                            >
                                <FaRobot className="text-warning" />
                                <span>AI Assistant</span>
                            </Link>
                            <Link
                                to="/marketplace"
                                className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-all shadow-sm"
                            >
                                Browse Marketplace
                            </Link>
                        </div>

                    </div>
                </div>
            </div>

            {/* 2. REAL METRICS OVERLAP */}
            <div className="container mx-auto px-4 lg:px-8 -mt-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 max-w-2xl">

                    {/* Metric 1: Enrolled Courses */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-TENZE flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xl font-bold">
                            <FaGraduationCap />
                        </div>
                        <div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white block">
                                {enrolledCourses.length}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">Enrolled Courses</span>
                        </div>
                    </div>

                    {/* Metric 2: Created Courses */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-TENZE flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-light text-purple flex items-center justify-center text-xl font-bold">
                            <FaChalkboardTeacher />
                        </div>
                        <div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white block">
                                {createdCourses.length}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">Created Courses</span>
                        </div>
                    </div>

                </div>

                {/* 3. MAIN DASHBOARD CONTENT */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-TENZE">

                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">

                        {/* Tabs */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('enrolled')}
                                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'enrolled'
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary'
                                    }`}
                            >
                                My Learning ({enrolledCourses.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('created')}
                                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'created'
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary'
                                    }`}
                            >
                                Created Courses ({createdCourses.length})
                            </button>
                        </div>

                        {/* Search Filter */}
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Search my courses..."
                                value={searchCourseText}
                                onChange={(e) => setSearchCourseText(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium rounded-xl pl-4 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 border border-transparent"
                            />
                            <FaSearch className="absolute right-3 top-3 text-slate-400 text-xs" />
                        </div>
                    </div>

                    {/* ENROLLED TAB CONTENT */}
                    {activeTab === 'enrolled' && (
                        <div>
                            {filteredEnrolledCourses.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-3xl mx-auto mb-3">
                                        <FaGraduationCap />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                        No Enrolled Courses
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-6">
                                        Explore the marketplace to enroll in online courses.
                                    </p>
                                    <Link
                                        to="/marketplace"
                                        className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-all"
                                    >
                                        Explore Marketplace
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredEnrolledCourses.map((course) => {
                                        return (
                                            <div
                                                key={course._id}
                                                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col md:flex-row items-center justify-between gap-6"
                                            >
                                                {/* Course Thumbnail & Details */}
                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <div className="w-20 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                        {course.thumbnail ? (
                                                            <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl">
                                                                LMS
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1 line-clamp-1">
                                                            {course.title}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                                            <span>Category: {course.category || 'General'}</span>
                                                            {course.level && <span>• Level: {course.level}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action CTA */}
                                                <div>
                                                    <Link
                                                        to={`/course/${course._id}`}
                                                        className="px-5 py-2.5 rounded-xl bg-primary-light text-primary hover:bg-primary hover:text-white font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap"
                                                    >
                                                        <FaPlay className="text-[10px]" />
                                                        <span>View Course Lectures</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* CREATED TAB CONTENT */}
                    {activeTab === 'created' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                    Courses You Created
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-4 py-2.5 rounded-xl bg-success text-white font-bold text-xs flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-sm"
                                >
                                    <FaPlus className="text-xs" /> Create Course
                                </button>
                            </div>

                            {createdCourses.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-xs text-slate-500 mb-4">You haven't created any courses yet.</p>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs"
                                    >
                                        Create Course
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {createdCourses.map((c) => (
                                        <div
                                            key={c._id}
                                            className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4"
                                        >
                                            <div>
                                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1 line-clamp-1">
                                                    {c.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/admin/course/${c._id}`}
                                                    className="px-3.5 py-2 rounded-xl bg-primary-light text-primary font-bold text-xs"
                                                >
                                                    Manage
                                                </Link>
                                                <button
                                                    onClick={() => openDeleteModal(c)}
                                                    className="p-2 rounded-xl bg-danger-light text-danger hover:bg-danger hover:text-white transition-colors"
                                                >
                                                    <FaTrash className="text-xs" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* CREATE COURSE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-TENZE-lg border border-slate-200 dark:border-slate-800">
                        <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Create New Course</h3>
                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newCourse.title}
                                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:ring-2 focus:ring-primary"
                                    placeholder="Enter course title..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:ring-2 focus:ring-primary"
                                    placeholder="Enter course description..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold"
                                >
                                    {creating ? 'Creating...' : 'Create Course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE COURSE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-TENZE-lg border border-slate-200 dark:border-slate-800 text-center">
                        <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">Delete Course?</h3>
                        <p className="text-xs text-slate-500 mb-6">
                            Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{courseToDelete?.title}"</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteCourse}
                                disabled={deleting}
                                className="px-5 py-2.5 rounded-xl bg-danger text-white text-xs font-bold hover:bg-red-700 transition-colors"
                            >
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default StudentDashboard;
