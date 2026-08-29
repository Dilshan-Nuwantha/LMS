import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    FaArrowLeft,
    FaUserGraduate,
    FaCheckCircle,
    FaClock,
    FaPlayCircle,
    FaChevronDown,
    FaChevronRight,
    FaEnvelope,
    FaCalendarAlt
} from 'react-icons/fa';
import { showError } from '../../utils/toast';

const StudentProgressDetail = () => {
    const { courseId, studentId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await api.get(`/courses/${courseId}/progress/${studentId}`);
                setData(res.data);
                // Expand all sections by default
                const expanded = {};
                res.data.sections.forEach(section => {
                    expanded[section._id] = true;
                });
                setExpandedSections(expanded);
            } catch (err) {
                console.error(err);
                showError(err, 'Failed to load student progress');
            } finally {
                setLoading(false);
            }
        };
        fetchProgress();
    }, [courseId, studentId]);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const getStatusIcon = (status, lectureStatuses) => {
        const completedLabel = data?.course?.lectureStatuses?.find(s => s.label === (data?.course?.completedStatus || 'Completed'))?.label || 'Completed';
        const inProgressLabel = 'In Progress';

        if (status === completedLabel || status === 'Completed') {
            return <FaCheckCircle className="text-green-500" />;
        } else if (status === inProgressLabel || status === 'In Progress') {
            return <FaPlayCircle className="text-amber-500" />;
        }
        return <FaClock className="text-slate-400" />;
    };

    const getStatusColor = (status) => {
        const statusConfig = data?.course?.lectureStatuses?.find(s => s.label === status);
        if (statusConfig) {
            return statusConfig.color;
        }
        // Defaults
        if (status === 'Completed') return '#10b981';
        if (status === 'In Progress') return '#f59e0b';
        return '#64748b';
    };

    const getStatusBadgeClasses = (status) => {
        const completedStatus = data?.course?.completedStatus || 'Completed';
        const statusConfig = data?.course?.lectureStatuses?.find(s => s.label === status);

        if (status === completedStatus) {
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        } else if (status === 'In Progress') {
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        } else if (status === 'Not Started') {
            return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        }

        // For custom statuses, use color from config if available
        if (statusConfig?.color) {
            return 'bg-slate-100 dark:bg-slate-800';
        }
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    };

    const getStatusDateLabel = (status) => {
        const completedStatus = data?.course?.completedStatus || 'Completed';
        if (status === completedStatus) {
            return 'Completed on';
        } else if (status === 'In Progress') {
            return 'Started on';
        } else if (status === 'Not Started') {
            return null; // No date for not started
        }
        // For custom statuses
        return 'Updated on';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-slate-500 dark:text-slate-400">Loading student progress...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-slate-500 dark:text-slate-400">Failed to load data</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 pb-12 transition-colors duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-navbar z-10 transition-colors">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Progress</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{data.course.title}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Student Info Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                            {data.student.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FaUserGraduate className="text-slate-400" />
                                {data.student.name}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                                <FaEnvelope className="text-xs" />
                                {data.student.email}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-1">
                                <FaCalendarAlt className="text-xs" />
                                Enrolled on {new Date(data.enrolledAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Overall Progress */}
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {data.progress.completedLectures}/{data.progress.totalLectures} lectures ({data.progress.progressPercent}%)
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${data.progress.progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Sections and Lectures */}
                <div className="space-y-4">
                    {data.sections.map((section) => (
                        <div
                            key={section._id}
                            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden"
                        >
                            {/* Section Header */}
                            <button
                                onClick={() => toggleSection(section._id)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedSections[section._id] ? (
                                        <FaChevronDown className="text-slate-400 text-sm" />
                                    ) : (
                                        <FaChevronRight className="text-slate-400 text-sm" />
                                    )}
                                    <div className="text-left">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                            Section {section.sectionNumber}: {section.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {section.completedCount}/{section.totalCount} completed
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all"
                                            style={{ width: `${section.progressPercent}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-12 text-right">
                                        {section.progressPercent}%
                                    </span>
                                </div>
                            </button>

                            {/* Lectures List */}
                            {expandedSections[section._id] && (
                                <div className="border-t border-gray-100 dark:border-slate-800">
                                    {section.lectures.length > 0 ? (
                                        [...section.lectures].sort((a, b) => a.number - b.number).map((lecture, idx) => (
                                            <div
                                                key={lecture._id}
                                                className="px-6 py-3 flex items-center justify-between border-b border-gray-50 dark:border-slate-800/50 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(lecture.status)}
                                                    <div>
                                                        <p className="text-sm text-slate-800 dark:text-slate-200">
                                                            <span className="text-slate-400 dark:text-slate-500 mr-2">
                                                                {lecture.number || idx + 1}.
                                                            </span>
                                                            {lecture.title}
                                                        </p>
                                                        {lecture.statusDate && lecture.status !== 'Not Started' && getStatusDateLabel(lecture.status) && (
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                                {getStatusDateLabel(lecture.status)} {new Date(lecture.statusDate).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadgeClasses(lecture.status)}`}
                                                    style={getStatusColor(lecture.status) ? {
                                                        backgroundColor: `${getStatusColor(lecture.status)}20`,
                                                        color: getStatusColor(lecture.status)
                                                    } : {}}
                                                >
                                                    {lecture.status}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-6 py-4 text-sm text-slate-400 dark:text-slate-500 italic">
                                            No lectures in this section
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {data.sections.length === 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-8 text-center">
                            <p className="text-slate-500 dark:text-slate-400">No sections in this course yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentProgressDetail;
