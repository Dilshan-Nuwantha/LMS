import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaCheck, FaCheckDouble, FaTimes, FaRobot, FaBullhorn, FaBook, FaClipboardList, FaClock, FaTrophy, FaPaperPlane } from 'react-icons/fa';
import api from '../../api/axios';

const typeConfig = {
    new_content: { icon: FaBook, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    broadcast: { icon: FaBullhorn, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    quiz: { icon: FaClipboardList, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    due_date: { icon: FaClock, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    ai_access: { icon: FaRobot, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    milestone: { icon: FaTrophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    custom: { icon: FaPaperPlane, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800' },
};

const priorityDot = {
    urgent: 'bg-red-500',
    important: 'bg-amber-500',
    normal: ''
};

const NotificationBell = () => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            const res = await api.get('/notifications/unread-count');
            setUnreadCount(res.data.count);
        } catch {}
    };

    // Fetch recent notifications
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications?limit=10');
            setNotifications(res.data.notifications);
        } catch {} finally {
            setLoading(false);
        }
    };

    // Poll unread count every 60s
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, []);

    // Fetch notifications when panel opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
            // Auto mark all as read when opened (like broadcasts)
            if (unreadCount > 0) {
                api.put('/notifications/mark-all-read').then(() => {
                    setUnreadCount(0);
                }).catch(() => {});
            }
        }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/mark-all-read');
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch {}
    };

    const handleClick = async (notif) => {
        // Mark as read
        if (!notif.read) {
            try {
                await api.put(`/notifications/${notif._id}/read`);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
            } catch {}
        }
        setIsOpen(false);
        if (notif.link) navigate(notif.link);
    };

    const handleDelete = async (e, notifId) => {
        e.stopPropagation();
        try {
            await api.delete(`/notifications/${notifId}`);
            setNotifications(prev => prev.filter(n => n._id !== notifId));
            fetchUnreadCount();
        } catch {}
    };

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title="Notifications"
            >
                <FaBell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-slate-950">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                    <FaCheckDouble size={10} /> Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                    <FaBell className="text-slate-300 dark:text-slate-600" size={20} />
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No notifications yet</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const config = typeConfig[notif.type] || typeConfig.custom;
                                const Icon = config.icon;
                                return (
                                    <div
                                        key={notif._id}
                                        onClick={() => handleClick(notif)}
                                        className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 ${!notif.read ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                                    >
                                        {/* Icon */}
                                        <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                            <Icon className={config.color} size={14} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-xs leading-relaxed ${!notif.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {notif.title}
                                                </p>
                                                <button
                                                    onClick={(e) => handleDelete(e, notif._id)}
                                                    className="p-1 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                >
                                                    <FaTimes size={10} />
                                                </button>
                                            </div>
                                            {notif.message && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(notif.createdAt)}</span>
                                                {notif.course?.title && (
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">· {notif.course.title}</span>
                                                )}
                                                {priorityDot[notif.priority] && (
                                                    <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[notif.priority]}`} />
                                                )}
                                                {!notif.read && (
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-2.5">
                            <button
                                onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                                className="w-full text-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
