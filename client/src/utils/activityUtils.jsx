import { FaHistory, FaCheckCircle, FaPlayCircle, FaBook, FaUser, FaClock, FaStickyNote, FaUserPlus, FaComment, FaSignInAlt, FaTrash, FaPen, FaPlus, FaBullhorn, FaUserTie, FaBookmark, FaBookOpen, FaUserSecret, FaExclamationTriangle, FaBan, FaUnlock, FaUserShield, FaUpload, FaClipboardList, FaRobot, FaBell, FaPaperPlane } from 'react-icons/fa';

export const ALL_ACTIONS = [
    'Login', 'Registered', 'Profile Updated', 'Password Updated',
    'Enrolled', 'Unenrolled',
    'Status Updated', 'Marked for Revision', 'Removed from Revision',
    'Completed', 'Started', 'Comment', 'Note Updated',
    'Lecture Added', 'Lecture Updated', 'Lecture Deleted',
    'Section Added', 'Section Updated', 'Section Deleted',
    'Course Created', 'Course Updated', 'Course Deleted',
    'Broadcast Created', 'Broadcast Updated', 'Broadcast Deleted',
    'Quiz Created', 'Quiz Updated', 'Quiz Deleted', 'Quiz Started', 'Quiz Submitted',
    'Resource Uploaded', 'Resource Deleted',
    'Teacher Added', 'Teacher Removed', 'Teacher Left', 'Teacher Updated',
    'User Warned', 'User Blocked', 'User Unblocked', 'Role Changed',
    'Course Blocked', 'Course Unblocked',
    'Student AI Enabled', 'Student AI Disabled', 'Student AI Blocked', 'Student AI Unblocked',
    'Notification Sent', 'Notification Settings Updated', 'Notification Read', 'Notifications Read', 'Notification Deleted',
];

export const ALL_ACTIONS_ADMIN = [...ALL_ACTIONS, 'Impersonated'];

export const DATE_PRESETS = [
    { label: 'All Time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Custom Range', value: 'custom' },
];

export const getDateRange = (preset) => {
    const now = new Date();
    const startOfDay = (d) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt; };
    switch (preset) {
        case 'today': return { from: startOfDay(now).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
        case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: startOfDay(y).toISOString().split('T')[0], to: startOfDay(y).toISOString().split('T')[0] }; }
        case '7d': { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: d.toISOString().split('T')[0], to: now.toISOString().split('T')[0] }; }
        case '30d': { const d = new Date(now); d.setDate(d.getDate() - 30); return { from: d.toISOString().split('T')[0], to: now.toISOString().split('T')[0] }; }
        case 'this_month': return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
        case 'last_month': { const first = new Date(now.getFullYear(), now.getMonth() - 1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); return { from: first.toISOString().split('T')[0], to: last.toISOString().split('T')[0] }; }
        default: return { from: '', to: '' };
    }
};

export const getActionIcon = (action) => {
    if (!action) return <FaHistory className="text-slate-400" />;
    if (action === 'Completed') return <FaCheckCircle className="text-green-500" />;
    if (action === 'Started' || action === 'In Progress') return <FaPlayCircle className="text-blue-500" />;
    if (action === 'Status Updated') return <FaClock className="text-amber-500" />;
    if (action === 'Note Updated') return <FaStickyNote className="text-purple-500" />;
    if (action === 'Marked for Revision') return <FaBookmark className="text-amber-500" />;
    if (action === 'Removed from Revision') return <FaBookOpen className="text-slate-400" />;
    if (action === 'Impersonated') return <FaUserSecret className="text-orange-500" />;
    if (action === 'Enrolled') return <FaUserPlus className="text-indigo-500" />;
    if (action === 'Unenrolled') return <FaTrash className="text-red-500" />;
    if (action === 'Comment') return <FaComment className="text-slate-500" />;
    if (action === 'Registered') return <FaUserPlus className="text-emerald-500" />;
    if (action === 'Login') return <FaSignInAlt className="text-cyan-500" />;
    if (action === 'Profile Updated') return <FaUser className="text-teal-500" />;
    if (action === 'Password Updated') return <FaPen className="text-violet-500" />;
    if (action === 'Teacher Added') return <FaUserTie className="text-emerald-500" />;
    if (action === 'Teacher Removed') return <FaUserTie className="text-red-500" />;
    if (action === 'Teacher Left') return <FaUserTie className="text-slate-400" />;
    if (action === 'Teacher Updated') return <FaUserTie className="text-violet-500" />;
    if (action === 'User Warned') return <FaExclamationTriangle className="text-amber-500" />;
    if (action === 'User Blocked') return <FaBan className="text-red-500" />;
    if (action === 'User Unblocked') return <FaUnlock className="text-green-500" />;
    if (action === 'Role Changed') return <FaUserShield className="text-indigo-500" />;
    if (action === 'Course Blocked') return <FaBan className="text-red-400" />;
    if (action === 'Course Unblocked') return <FaUnlock className="text-green-400" />;
    if (action === 'Quiz Started') return <FaPlayCircle className="text-indigo-500" />;
    if (action === 'Quiz Submitted') return <FaClipboardList className="text-green-500" />;
    if (action === 'Resource Uploaded') return <FaUpload className="text-emerald-500" />;
    if (action === 'Student AI Enabled') return <FaRobot className="text-indigo-500" />;
    if (action === 'Student AI Disabled') return <FaRobot className="text-slate-400" />;
    if (action === 'Student AI Blocked') return <FaRobot className="text-red-500" />;
    if (action === 'Student AI Unblocked') return <FaRobot className="text-green-500" />;
    if (action === 'Notification Sent') return <FaPaperPlane className="text-indigo-500" />;
    if (action === 'Notification Settings Updated') return <FaBell className="text-amber-500" />;
    if (action === 'Notification Read' || action === 'Notifications Read') return <FaBell className="text-green-500" />;
    if (action === 'Notification Deleted') return <FaBell className="text-red-500" />;
    if (action.includes('Deleted')) return <FaTrash className="text-red-500" />;
    if (action.includes('Added') || action.includes('Created')) return <FaPlus className="text-emerald-500" />;
    if (action.includes('Updated')) return <FaPen className="text-violet-500" />;
    if (action.includes('Broadcast')) return <FaBullhorn className="text-amber-500" />;
    if (action.includes('Quiz')) return <FaBook className="text-indigo-500" />;
    return <FaHistory className="text-slate-400" />;
};

export const getActionBadgeClass = (action) => {
    if (!action) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    if (action === 'Completed') return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    if (action === 'Started' || action === 'In Progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    if (action === 'Enrolled') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
    if (action === 'Impersonated') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    if (action === 'Login' || action === 'Registered') return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400';
    if (action === 'Comment') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    if (action === 'Note Updated') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    if (action === 'Marked for Revision') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    if (action === 'Removed from Revision') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    if (action === 'Student AI Enabled') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
    if (action === 'Student AI Disabled') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    if (action === 'Student AI Blocked') return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    if (action === 'Student AI Unblocked') return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    if (action === 'Notification Sent') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
    if (action === 'Notification Settings Updated') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    if (action === 'Notification Read' || action === 'Notifications Read') return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    if (action === 'Notification Deleted') return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    if (action.includes('Deleted') || action === 'Unenrolled') return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    if (action.includes('Added') || action.includes('Created')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
    if (action.includes('Updated')) return 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
};

export const getMethodColor = (method) => {
    if (method === 'POST') return 'text-emerald-600 dark:text-emerald-400';
    if (method === 'PUT') return 'text-amber-600 dark:text-amber-400';
    if (method === 'DELETE') return 'text-red-600 dark:text-red-400';
    if (method === 'PATCH') return 'text-violet-600 dark:text-violet-400';
    return 'text-slate-500 dark:text-slate-400';
};

export const getResourceLabel = (log) => {
    if (log.course) return null; // caller renders the course title
    if (log.action === 'Login' || log.action === 'Registered') return 'Authentication';
    if (log.action === 'Profile Updated' || log.action === 'Password Updated') return 'Account Settings';
    if (log.action === 'Impersonated') return 'Admin Panel';
    if (['Role Changed', 'User Warned', 'User Blocked', 'User Unblocked'].includes(log.action)) return 'User Management';
    if (log.action === 'Course Blocked' || log.action === 'Course Unblocked') return 'Course Management';
    if (log.action?.includes('Student AI')) return 'AI Settings';
    if (log.action?.includes('Notification')) return 'Notifications';
    return 'General';
};
