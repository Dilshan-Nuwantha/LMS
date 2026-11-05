import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
    FaPlus,
    FaUsers,
    FaBook,
    FaChartLine,
    FaEdit,
    FaEye,
    FaCog,
    FaUser,
    FaRupeeSign
} from 'react-icons/fa';

import api from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import { showError } from '../../utils/toast';


// --------------------------------------------------
// LKR ICON
// --------------------------------------------------
const LkrIcon = () => (
    <span className="font-bold text-[14px] leading-none tracking-tight select-none">
        Rs
    </span>
);


// --------------------------------------------------
// STAT CARD
// --------------------------------------------------
const StatCard = ({ icon: Icon, label, value }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-TenZe flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xl font-bold">
            <Icon />
        </div>

        <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white block">
                {value}
            </span>

            <span className="text-xs font-semibold text-slate-500">
                {label}
            </span>
        </div>
    </div>
);


// --------------------------------------------------
// INSTRUCTOR DASHBOARD
// --------------------------------------------------
const InstructorDashboard = () => {
    const { user } = useContext(AuthContext);

    const [loading, setLoading] = useState(true);

    const [dashboard, setDashboard] = useState({
        courses: [],
        totalCourses: 0,
        totalRevenue: 0,
        totalSales: 0,
        totalStudents: 0,
        recentPurchases: []
    });


    // --------------------------------------------------
    // FETCH DASHBOARD DATA
    // --------------------------------------------------
    useEffect(() => {
        fetchDashboard();
    }, []);


    const fetchDashboard = async () => {
        try {
            const res = await api.get('/instructor/dashboard');

            setDashboard(res.data || {
                courses: [],
                totalCourses: 0,
                totalRevenue: 0,
                totalSales: 0,
                totalStudents: 0,
                recentPurchases: []
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            showError('Failed to load instructor dashboard');

        } finally {
            setLoading(false);
        }
    };


    // --------------------------------------------------
    // FORMAT CURRENCY
    // --------------------------------------------------
    const formatCurrency = (amount) => {
        return `LKR ${(amount || 0).toLocaleString('en-LK')} `;
    };


    // --------------------------------------------------
    // LOADING SCREEN
    // --------------------------------------------------
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }


    // --------------------------------------------------
    // DASHBOARD DATA
    // --------------------------------------------------
    const {
        courses = [],
        totalCourses = 0,
        totalRevenue = 0,
        revenueByCurrency,
        totalStudents = 0,
        totalSales = 0
    } = dashboard;


    // --------------------------------------------------
    // MAIN UI
    // --------------------------------------------------
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors duration-200">

            {/* ==================================================
                1. INSTRUCTOR COVER BANNER
            ================================================== */}
            <div className="bg-gradient-to-r from-slate-900 via-primary-700 to-slate-900 text-white pt-10 pb-20 px-4 lg:px-8">

                <div className="container mx-auto">

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                        {/* Profile Info */}
                        <div className="flex items-center gap-5">

                            <div className="relative">

                                {user?.profilePicture ? (

                                    <img
                                        src={user.profilePicture}
                                        alt={user.name || 'Instructor'}
                                        className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-TenZe"
                                    />

                                ) : (

                                    <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center font-black text-2xl border-4 border-white dark:border-slate-800 shadow-TenZe">
                                        {user?.name
                                            ? user.name.charAt(0).toUpperCase()
                                            : <FaUser />
                                        }
                                    </div>

                                )}

                            </div>


                            <div>

                                <div className="flex items-center gap-2">

                                    <h1 className="text-2xl font-extrabold text-white">
                                        {user?.name || 'Instructor'}
                                    </h1>

                                    <span className="badge-soft-success flex items-center gap-1 text-[10px]">
                                        Instructor
                                    </span>

                                </div>

                                <p className="text-xs text-white/70 mt-0.5">
                                    {user?.email || ''}
                                </p>

                            </div>

                        </div>


                        {/* Right Actions */}
                        <div className="flex items-center gap-3">

                            <Link
                                to="/instructor/payment-settings"
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all"
                            >
                                <FaCog />
                                <span>Payment Settings</span>
                            </Link>


                            <Link
                                to="/instructor/create-course"
                                className="px-5 py-2.5 rounded-xl bg-success text-white font-bold text-xs hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-2"
                            >
                                <FaPlus className="text-xs" />
                                <span>Create Course</span>
                            </Link>

                        </div>

                    </div>

                </div>

            </div>


            {/* ==================================================
                2. MAIN CONTENT
            ================================================== */}
            <div className="container mx-auto px-4 lg:px-8 -mt-10">


                {/* ==================================================
                    METRICS
                ================================================== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">


                    {/* Total Courses */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-TenZe flex items-center gap-4">

                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl font-bold">
                            <FaBook />
                        </div>

                        <div>

                            <span className="text-2xl font-black text-slate-900 dark:text-white block">
                                {totalCourses}
                            </span>

                            <span className="text-xs font-semibold text-slate-500">
                                Total Courses
                            </span>

                        </div>

                    </div>


                    {/* Total Students */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-TenZe flex items-center gap-4">

                        <div className="w-12 h-12 rounded-xl bg-purple-light text-purple flex items-center justify-center text-xl font-bold">
                            <FaUsers />
                        </div>

                        <div>

                            <span className="text-2xl font-black text-slate-900 dark:text-white block">
                                {totalStudents}
                            </span>

                            <span className="text-xs font-semibold text-slate-500">
                                Total Students
                            </span>

                        </div>

                    </div>


                    {/* Total Revenue */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-TenZe flex items-center gap-4">

                        <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center text-xl font-bold">
                            <FaRupeeSign />
                        </div>

                        <div>

                            <span className="text-2xl font-black text-slate-900 dark:text-white block">
                                {formatCurrency(totalRevenue)}
                            </span>

                            {/* USD sales are kept separate - LKR and USD can't be added together */}
                            {revenueByCurrency?.USD?.earned > 0 && (
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                                    + ${revenueByCurrency.USD.earned.toLocaleString('en-US')}
                                </span>
                            )}

                            <span className="text-xs font-semibold text-slate-500">
                                Total Earnings
                            </span>

                        </div>

                    </div>


                    {/* Total Sales */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-TenZe flex items-center gap-4">

                        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xl font-bold">
                            <FaChartLine />
                        </div>

                        <div>

                            <span className="text-2xl font-black text-slate-900 dark:text-white block">
                                {totalSales}
                            </span>

                            <span className="text-xs font-semibold text-slate-500">
                                Total Sales
                            </span>

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    OVERVIEW
                ================================================== */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-TenZe overflow-hidden">


                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                            <div>

                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                    Course Overview
                                </h2>

                                <p className="text-xs text-slate-500 mt-1">
                                    Manage your courses and view student enrollments.
                                </p>

                            </div>


                            <Link
                                to="/instructor/create-course"
                                className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-all flex items-center gap-2 w-fit"
                            >
                                <FaPlus className="text-xs" />
                                Create Course
                            </Link>

                        </div>

                    </div>


                    {/* ==================================================
                        COURSE LIST
                    ================================================== */}

                    {courses.length === 0 ? (

                        /* Empty State */
                        <div className="text-center py-16 px-6">

                            <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-3xl mx-auto mb-3">
                                <FaBook />
                            </div>

                            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                No Courses Published Yet
                            </h4>

                            <p className="text-xs text-slate-500 mb-6">
                                Start creating your course to share your knowledge with students.
                            </p>

                            <Link
                                to="/instructor/create-course"
                                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs inline-block"
                            >
                                Create First Course
                            </Link>

                        </div>

                    ) : (

                        /* Course Table */
                        <div className="overflow-x-auto">

                            <table className="w-full text-left border-collapse">

                                <thead>

                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider">

                                        <th className="py-3 px-4">
                                            Course
                                        </th>

                                        <th className="py-3 px-4">
                                            Enrolled Learners
                                        </th>

                                        <th className="py-3 px-4">
                                            Price
                                        </th>

                                        <th className="py-3 px-4 text-right">
                                            Actions
                                        </th>

                                    </tr>

                                </thead>


                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">

                                    {courses.map((course) => (

                                        <tr
                                            key={course._id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                                        >

                                            {/* Course */}
                                            <td className="py-4 px-4">

                                                <div className="flex items-center gap-3">

                                                    <div className="w-12 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">

                                                        {course.thumbnail ? (

                                                            <img
                                                                src={course.thumbnail}
                                                                alt={course.title || 'Course thumbnail'}
                                                                className="w-full h-full object-cover"
                                                            />

                                                        ) : (

                                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                <FaBook />
                                                            </div>

                                                        )}

                                                    </div>


                                                    <div>

                                                        <h5 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">
                                                            {course.title}
                                                        </h5>

                                                        <span className="text-[11px] text-slate-400">
                                                            Category: {course.category || 'General'}
                                                        </span>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* Students */}
                                            <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-200">
                                                {course.enrollmentCount || 0} Students
                                            </td>


                                            {/* Price */}
                                            <td className="py-4 px-4 font-bold text-success text-sm">

                                                {course.price === 0
                                                    ? 'Free'
                                                    : `Rs.${course.price} `
                                                }

                                            </td>


                                            {/* Actions */}
                                            <td className="py-4 px-4 text-right">

                                                <div className="flex items-center justify-end gap-2">

                                                    {/* Edit */}
                                                    <Link
                                                        to={`/ instructor / course / ${course._id}/edit`}
                                                        className="p-2 rounded-lg bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors"
                                                        title="Edit Course"
                                                    >
                                                        <FaEdit className="text-xs" />
                                                    </Link >


                                                    {/* Manage / View */}
                                                    < Link
                                                        to={`/admin/course/${course._id}`}
                                                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                                                        title="Manage"
                                                    >
                                                        <FaEye className="text-xs" />
                                                    </Link >

                                                </div >

                                            </td >

                                        </tr >

                                    ))}

                                </tbody >

                            </table >

                        </div >

                    )}

                </div >

            </div >

        </div >
    );
};


export default InstructorDashboard;
