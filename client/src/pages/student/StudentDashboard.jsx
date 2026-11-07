import { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { FaBookOpen, FaPlay, FaSearch, FaUser } from 'react-icons/fa';

const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchCourseText, setSearchCourseText] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/courses/my/enrolled');
                // Each item is an enrollment, with the course nested inside it
                setEnrolledCourses((res.data || []).map(enrollment => ({ ...enrollment.course, progressPercent: enrollment.progressPercent })));
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

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
                                {user?.profileImage ? (
                                    <img
                                        src={user.profileImage}
                                        alt={user.name}
                                        className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-TenZe"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center font-black text-2xl border-4 border-white dark:border-slate-800 shadow-TenZe">
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-TenZe flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xl font-bold">
                            <FaBookOpen />
                        </div>
                        <div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white block">
                                {enrolledCourses.length}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">Enrolled Courses</span>
                        </div>
                    </div>

                </div>

                {/* 3. MAIN DASHBOARD CONTENT */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-TenZe">

                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">

                        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            My Learning ({enrolledCourses.length})
                        </h2>

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

                    {/* ENROLLED COURSES */}
                    <div>
                            {filteredEnrolledCourses.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-3xl mx-auto mb-3">
                                        <FaBookOpen />
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
                                                className="relative p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col md:flex-row items-center justify-between gap-6"
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
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary rounded-full" style={{ width: `${course.progressPercent || 0}%` }} />
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-slate-500">
                                                                {course.progressPercent || 0}% • {course.progressPercent === 100 ? 'Completed' : course.progressPercent > 0 ? 'In Progress' : 'Not Started'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action CTA */}
                                                <div>
                                                    <Link
                                                        to={`/course/${course._id}`}
                                                        className="after:absolute after:inset-0 px-5 py-2.5 rounded-xl bg-primary-light text-primary hover:bg-primary hover:text-white font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap"
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

                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
