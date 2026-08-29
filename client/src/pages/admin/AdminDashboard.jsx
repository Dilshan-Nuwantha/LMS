import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FaUsers, FaChalkboardTeacher, FaGraduationCap, FaBook,
    FaRupeeSign, FaChartLine, FaMoneyCheckAlt, FaHistory,
    FaArrowRight, FaExclamationCircle, FaCheckCircle, FaSearch,
    FaBan, FaUnlock, FaExclamationTriangle, FaTimes, FaEdit,
    FaChevronDown, FaChevronUp, FaShieldAlt, FaChevronLeft, FaChevronRight,
    FaUserSecret, FaSignInAlt
} from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

/* ─────────────────────────────────────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────────────────────────────────────── */
const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

const Avatar = ({ name, color = 'indigo', size = 9, blocked = false }) => {
    const palette = {
        indigo: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
        slate:  'bg-slate-100  dark:bg-slate-700       text-slate-600  dark:text-slate-300',
        red:    'bg-red-100    dark:bg-red-900/40      text-red-600    dark:text-red-400',
    };
    return (
        <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${blocked ? palette.red : palette[color]}`}>
            {name?.charAt(0)?.toUpperCase() || '?'}
        </div>
    );
};

const Badge = ({ variant, children }) => {
    const variants = {
        active:      'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800',
        blocked:     'bg-red-50     dark:bg-red-900/20     text-red-700     dark:text-red-400     ring-1 ring-red-200     dark:ring-red-800',
        warned:      'bg-amber-50   dark:bg-amber-900/20   text-amber-700   dark:text-amber-400   ring-1 ring-amber-200   dark:ring-amber-800',
        student:     'bg-sky-50     dark:bg-sky-900/20     text-sky-700     dark:text-sky-400     ring-1 ring-sky-200     dark:ring-sky-800',
        instructor:  'bg-violet-50  dark:bg-violet-900/20  text-violet-700  dark:text-violet-400  ring-1 ring-violet-200  dark:ring-violet-800',
        completed:   'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800',
        pending:     'bg-amber-50   dark:bg-amber-900/20   text-amber-700   dark:text-amber-400   ring-1 ring-amber-200   dark:ring-amber-800',
        failed:      'bg-red-50     dark:bg-red-900/20     text-red-700     dark:text-red-400     ring-1 ring-red-200     dark:ring-red-800',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${variants[variant] || variants.active}`}>
            {children}
        </span>
    );
};

const Pagination = ({ page, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
                <FaChevronLeft className="text-[10px]" /> Prev
            </button>
            <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                    }, [])
                    .map((p, i) =>
                        p === '...'
                            ? <span key={`dots-${i}`} className="px-1 text-xs text-slate-400">…</span>
                            : <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                                    p === page
                                        ? 'bg-indigo-500 text-white'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >{p}</button>
                    )
                }
            </div>
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
                Next <FaChevronRight className="text-[10px]" />
            </button>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, color }) => {
    const colors = {
        blue:   { wrap: 'bg-blue-500',   ring: 'ring-blue-100 dark:ring-blue-900/30',   text: 'text-blue-600 dark:text-blue-400' },
        purple: { wrap: 'bg-violet-500', ring: 'ring-violet-100 dark:ring-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
        green:  { wrap: 'bg-emerald-500', ring: 'ring-emerald-100 dark:ring-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
        orange: { wrap: 'bg-orange-500', ring: 'ring-orange-100 dark:ring-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
    };
    const c = colors[color];
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.wrap} flex items-center justify-center shadow-sm shrink-0`}>
                <Icon className="text-white text-lg" />
            </div>
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value ?? '—'}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Payouts Tab (server-side pagination)
───────────────────────────────────────────────────────────────────────────── */
const PayoutsTab = () => {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => { fetchPayouts(); }, [page]);

    const fetchPayouts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/payouts', { params: { page, limit: 15 } });
            setPayouts(res.data.payouts);
            setTotalPages(res.data.pages);
        } catch {
            showError('Failed to load payouts');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-slate-500 dark:text-slate-400">Loading payouts…</div>;

    if (payouts.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-16 text-center">
                <FaHistory className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No payouts recorded yet</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wide">
                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Instructor</th>
                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Method</th>
                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Transaction ID</th>
                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Processed By</th>
                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {payouts.map(p => (
                            <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={p.instructor?.name} color="indigo" />
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{p.instructor?.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{p.instructor?.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">{formatCurrency(p.amount)}</td>
                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 capitalize">{p.method?.replace('_', ' ')}</td>
                                <td className="px-5 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">{p.transactionId || '—'}</td>
                                <td className="px-5 py-3.5">
                                    <Badge variant={p.status}>
                                        {p.status === 'completed' && <FaCheckCircle className="text-[9px]" />}
                                        {p.status}
                                    </Badge>
                                </td>
                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{p.processedBy?.name || '—'}</td>
                                <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Users Tab (client-side pagination)
───────────────────────────────────────────────────────────────────────────── */
const USERS_PER_PAGE = 10;

const UsersTab = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);

    // Warn modal
    const [warnModal, setWarnModal] = useState({ open: false, user: null });
    const [warnReason, setWarnReason] = useState('');
    const [warnLoading, setWarnLoading] = useState(false);

    // Block modal
    const [blockModal, setBlockModal] = useState({ open: false, user: null });
    const [blockReason, setBlockReason] = useState('');
    const [hideCourses, setHideCourses] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);

    // Expanded warnings per user
    const [expandedWarnings, setExpandedWarnings] = useState({});
    const [editMaxWarnings, setEditMaxWarnings] = useState({});
    const [maxWarningsInput, setMaxWarningsInput] = useState({});

    useEffect(() => { fetchUsers(); }, []);

    // Reset to page 1 when search/filter changes
    useEffect(() => { setPage(1); }, [search, filter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch {
            showError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        const matchFilter =
            filter === 'all' ||
            (filter === 'students' && u.role === 'student') ||
            (filter === 'instructors' && u.role === 'instructor') ||
            (filter === 'blocked' && u.isBlocked) ||
            (filter === 'warned' && u.warnings?.length > 0 && !u.isBlocked);
        return matchSearch && matchFilter;
    });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
    const pagedUsers = filteredUsers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

    const isLastWarning = (user) => (user.warnings?.length || 0) + 1 >= (user.maxWarnings || 2);

    const handleWarn = async () => {
        if (!warnReason.trim()) { showError('Please provide a reason'); return; }
        setWarnLoading(true);
        try {
            const res = await api.post(`/admin/users/${warnModal.user._id}/warn`, { reason: warnReason });
            setUsers(prev => prev.map(u => u._id === res.data._id ? res.data : u));
            showSuccess(res.data.isBlocked ? 'Warning issued — user auto-blocked' : 'Warning issued');
            setWarnModal({ open: false, user: null });
            setWarnReason('');
        } catch (e) {
            showError(e, 'Failed to warn user');
        } finally { setWarnLoading(false); }
    };

    const handleBlock = async () => {
        if (!blockReason.trim()) { showError('Please provide a reason'); return; }
        setBlockLoading(true);
        try {
            const res = await api.post(`/admin/users/${blockModal.user._id}/block`, { reason: blockReason, hideCourses });
            setUsers(prev => prev.map(u => u._id === res.data._id ? res.data : u));
            showSuccess('User blocked');
            setBlockModal({ open: false, user: null });
            setBlockReason('');
            setHideCourses(false);
        } catch (e) {
            showError(e, 'Failed to block user');
        } finally { setBlockLoading(false); }
    };

    const handleUnblock = async (userId) => {
        try {
            const res = await api.post(`/admin/users/${userId}/unblock`);
            setUsers(prev => prev.map(u => u._id === res.data._id ? res.data : u));
            showSuccess('User unblocked');
        } catch { showError('Failed to unblock user'); }
    };

    const handleChangeRole = async (userId, role) => {
        try {
            const res = await api.post(`/admin/users/${userId}/role`, { role });
            setUsers(prev => prev.map(u => u._id === res.data._id ? res.data : u));
            showSuccess(`Role changed to ${role}`);
        } catch { showError('Failed to change role'); }
    };

    const handleRemoveWarning = async (userId, index) => {
        try {
            const res = await api.delete(`/admin/users/${userId}/warnings/${index}`);
            setUsers(prev => prev.map(u => u._id === res.data._id ? res.data : u));
            showSuccess('Warning removed');
        } catch { showError('Failed to remove warning'); }
    };

    const handleSetMaxWarnings = async (userId) => {
        const val = parseInt(maxWarningsInput[userId]);
        if (!val || val < 1) { showError('Must be at least 1'); return; }
        try {
            await api.post(`/admin/users/${userId}/max-warnings`, { maxWarnings: val });
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, maxWarnings: val } : u));
            setEditMaxWarnings(prev => ({ ...prev, [userId]: false }));
            showSuccess('Max warnings updated');
        } catch { showError('Failed to update'); }
    };

    const filterOptions = [
        { id: 'all', label: 'All', count: users.length },
        { id: 'students', label: 'Students', count: users.filter(u => u.role === 'student').length },
        { id: 'instructors', label: 'Instructors', count: users.filter(u => u.role === 'instructor').length },
        { id: 'warned', label: 'Warned', count: users.filter(u => u.warnings?.length > 0 && !u.isBlocked).length },
        { id: 'blocked', label: 'Blocked', count: users.filter(u => u.isBlocked).length },
    ];

    if (loading) return <div className="text-center py-20 text-slate-500 dark:text-slate-400">Loading users…</div>;

    return (
        <div className="space-y-4">
            {/* Search + Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                        type="text"
                        placeholder="Search name or email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {filterOptions.map(f => {
                        const isActive = filter === f.id;
                        const accentMap = { blocked: 'bg-red-500 border-red-500', warned: 'bg-amber-500 border-amber-500' };
                        const accent = accentMap[f.id] || 'bg-indigo-500 border-indigo-500';
                        return (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                    isActive
                                        ? `${accent} text-white shadow-sm`
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                {f.label}
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                    {f.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Summary bar */}
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-700 dark:text-slate-300">{filteredUsers.length}</span> user{filteredUsers.length !== 1 ? 's' : ''}
                {search && <> matching &quot;<span className="font-medium">{search}</span>&quot;</>}
                {page > 1 && <> · Page {page} of {totalPages}</>}
            </p>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {pagedUsers.length === 0 ? (
                    <div className="py-16 text-center">
                        <FaUsers className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No users found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wide">
                                        <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">User</th>
                                        <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Role</th>
                                        <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Warnings</th>
                                        <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                                        <th className="text-right px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                    {pagedUsers.map(user => {
                                        const warnCount = user.warnings?.length || 0;
                                        const maxWarn = user.maxWarnings || 2;
                                        const isExpanded = expandedWarnings[user._id];
                                        const isEditingMax = editMaxWarnings[user._id];
                                        const warnPct = Math.min(100, (warnCount / maxWarn) * 100);

                                        return (
                                            <>
                                                <tr
                                                    key={user._id}
                                                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${user.isBlocked ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}
                                                >
                                                    {/* User info */}
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar name={user.name} color={user.isBlocked ? 'red' : 'slate'} blocked={user.isBlocked} />
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                                                {user.isBlocked && user.blockReason && (
                                                                    <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5 truncate max-w-[200px]" title={user.blockReason}>
                                                                        {user.blockReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Role */}
                                                    <td className="px-5 py-4">
                                                        <select
                                                            value={user.role}
                                                            onChange={e => handleChangeRole(user._id, e.target.value)}
                                                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer ${
                                                                user.role === 'instructor'
                                                                    ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300'
                                                                    : 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                                                            }`}
                                                        >
                                                            <option value="student">Student</option>
                                                            <option value="instructor">Instructor</option>
                                                        </select>
                                                    </td>

                                                    {/* Warnings */}
                                                    <td className="px-5 py-4">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                {/* Count pill */}
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                                    warnCount === 0
                                                                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                                                        : warnCount >= maxWarn
                                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                                }`}>
                                                                    {warnCount > 0 && <FaExclamationTriangle className="text-[8px]" />}
                                                                    {warnCount}/{maxWarn}
                                                                </span>

                                                                {/* Edit max */}
                                                                {isEditingMax ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={maxWarningsInput[user._id] ?? maxWarn}
                                                                            onChange={e => setMaxWarningsInput(prev => ({ ...prev, [user._id]: e.target.value }))}
                                                                            className="w-11 text-xs px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                        />
                                                                        <button onClick={() => handleSetMaxWarnings(user._id)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-bold text-sm">✓</button>
                                                                        <button onClick={() => setEditMaxWarnings(prev => ({ ...prev, [user._id]: false }))} className="text-slate-400 hover:text-slate-600 text-sm">✗</button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => { setEditMaxWarnings(prev => ({ ...prev, [user._id]: true })); setMaxWarningsInput(prev => ({ ...prev, [user._id]: maxWarn })); }}
                                                                        className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                                                                        title="Edit limit"
                                                                    >
                                                                        <FaEdit className="text-[11px]" />
                                                                    </button>
                                                                )}

                                                                {/* Expand toggle */}
                                                                {warnCount > 0 && (
                                                                    <button
                                                                        onClick={() => setExpandedWarnings(prev => ({ ...prev, [user._id]: !prev[user._id] }))}
                                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                                        title={isExpanded ? 'Hide warnings' : 'View warnings'}
                                                                    >
                                                                        {isExpanded ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Progress bar */}
                                                            {warnCount > 0 && (
                                                                <div className="w-20 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${warnCount >= maxWarn ? 'bg-red-500' : 'bg-amber-400'}`}
                                                                        style={{ width: `${warnPct}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-5 py-4">
                                                        {user.isBlocked ? (
                                                            <Badge variant="blocked"><FaBan className="text-[9px]" /> Blocked</Badge>
                                                        ) : warnCount > 0 ? (
                                                            <Badge variant="warned"><FaExclamationTriangle className="text-[9px]" /> Warned</Badge>
                                                        ) : (
                                                            <Badge variant="active"><FaCheckCircle className="text-[9px]" /> Active</Badge>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {!user.isBlocked && (
                                                                <button
                                                                    onClick={() => { setWarnModal({ open: true, user }); setWarnReason(''); }}
                                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                                                >
                                                                    Warn
                                                                </button>
                                                            )}
                                                            {user.isBlocked ? (
                                                                <button
                                                                    onClick={() => handleUnblock(user._id)}
                                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                                                                >
                                                                    <FaUnlock className="text-[10px]" /> Unblock
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => { setBlockModal({ open: true, user }); setBlockReason(''); setHideCourses(false); }}
                                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                                                                >
                                                                    <FaBan className="text-[10px]" /> Block
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Warning history expanded row */}
                                                {isExpanded && warnCount > 0 && (
                                                    <tr key={`${user._id}-warn-history`} className="bg-amber-50/60 dark:bg-amber-900/10">
                                                        <td colSpan={5} className="px-5 py-4">
                                                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-wide">Warning history</p>
                                                            <div className="space-y-2">
                                                                {user.warnings.map((w, i) => (
                                                                    <div key={i} className="flex items-start justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-900/40">
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                                                {i + 1}
                                                                            </span>
                                                                            <div>
                                                                                <p className="text-sm text-slate-700 dark:text-slate-300">{w.reason}</p>
                                                                                <p className="text-[11px] text-slate-400 mt-0.5">{new Date(w.issuedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleRemoveWarning(user._id, i)}
                                                                            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
                                                                            title="Remove warning"
                                                                        >
                                                                            <FaTimes className="text-xs" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </>
                )}
            </div>

            {/* ── Warn Modal ─────────────────────────────────────────────── */}
            {warnModal.open && warnModal.user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-2xl">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <FaExclamationTriangle className="text-amber-500 text-sm" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white">Issue Warning</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{warnModal.user.name} &middot; {warnModal.user.email}</p>
                            </div>
                            <button onClick={() => setWarnModal({ open: false, user: null })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Progress */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Warning count after this</span>
                                    <span className={`font-bold ${isLastWarning(warnModal.user) ? 'text-red-500' : 'text-amber-500'}`}>
                                        {(warnModal.user.warnings?.length || 0) + 1} / {warnModal.user.maxWarnings || 2}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${isLastWarning(warnModal.user) ? 'bg-red-500' : 'bg-amber-400'}`}
                                        style={{ width: `${Math.min(100, (((warnModal.user.warnings?.length || 0) + 1) / (warnModal.user.maxWarnings || 2)) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Final warning alert */}
                            {isLastWarning(warnModal.user) && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                    <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Final warning</p>
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">The user will be automatically blocked after this warning.</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={warnReason}
                                    onChange={e => setWarnReason(e.target.value)}
                                    placeholder="Explain why this warning is being issued…"
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setWarnModal({ open: false, user: null })}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleWarn}
                                    disabled={warnLoading}
                                    className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                                        isLastWarning(warnModal.user) ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                                    }`}
                                >
                                    {warnLoading ? 'Issuing…' : isLastWarning(warnModal.user) ? 'Warn & Block' : 'Issue Warning'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Block Modal ─────────────────────────────────────────────── */}
            {blockModal.open && blockModal.user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-2xl">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <FaBan className="text-red-500 text-sm" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white">Block User</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{blockModal.user.name} &middot; {blockModal.user.email}</p>
                            </div>
                            <button onClick={() => setBlockModal({ open: false, user: null })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0 text-sm" />
                                <p className="text-xs text-red-700 dark:text-red-400">
                                    This user will be logged out immediately and unable to log in. The block reason will be shown to them.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Block reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={blockReason}
                                    onChange={e => setBlockReason(e.target.value)}
                                    placeholder="This will be shown to the user when they try to log in…"
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                                />
                            </div>
                            {blockModal.user.role === 'instructor' && (
                                <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={hideCourses}
                                        onChange={e => setHideCourses(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-400"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Hide instructor's courses</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Remove all their courses from the marketplace</p>
                                    </div>
                                </label>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setBlockModal({ open: false, user: null })}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBlock}
                                    disabled={blockLoading}
                                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <FaBan className="text-xs" />
                                    {blockLoading ? 'Blocking…' : 'Block User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Impersonate Tab
───────────────────────────────────────────────────────────────────────────── */
const ImpersonateTab = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [foundUser, setFoundUser] = useState(null);
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setFoundUser(null);
        try {
            const res = await api.get('/admin/users', { params: { search: email.trim(), page: 1, limit: 5 } });
            const users = res.data.users || res.data;
            const match = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
            if (match) {
                setFoundUser(match);
            } else if (users.length > 0) {
                setFoundUser(null);
                showError('No exact email match. Check spelling.');
            } else {
                showError('No user found with that email');
            }
        } catch {
            showError('Failed to search user');
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = async () => {
        if (!foundUser) return;
        setLoading(true);
        try {
            const res = await api.post('/admin/impersonate', { email: foundUser.email });
            // Store the current admin token so we can return later
            const currentToken = localStorage.getItem('token');
            const currentCache = localStorage.getItem('userCache');
            localStorage.setItem('adminToken', currentToken);
            localStorage.setItem('adminUserCache', currentCache);

            // Switch to the impersonated user
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userCache', JSON.stringify({ user: res.data, timestamp: Date.now() }));
            localStorage.setItem('isImpersonating', 'true');

            showSuccess(`Now logged in as ${res.data.name}`);
            window.location.href = '/';
        } catch (error) {
            showError(error, 'Impersonation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <FaUserSecret className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Login as User</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Enter a user's email to access their account</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Enter user email address"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !email.trim()}
                        className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Searching…' : 'Find User'}
                    </button>
                </form>

                {foundUser && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar name={foundUser.name} color={foundUser.isBlocked ? 'red' : 'indigo'} size={12} blocked={foundUser.isBlocked} />
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white text-base">{foundUser.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{foundUser.email}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Badge variant={foundUser.role === 'instructor' ? 'instructor' : foundUser.role === 'admin' ? 'active' : 'student'}>
                                            {foundUser.role}
                                        </Badge>
                                        {foundUser.isBlocked && <Badge variant="blocked">Blocked</Badge>}
                                        {foundUser.warnings?.length > 0 && (
                                            <Badge variant="warned">{foundUser.warnings.length} warning{foundUser.warnings.length > 1 ? 's' : ''}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleImpersonate}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm"
                            >
                                <FaSignInAlt />
                                {loading ? 'Switching…' : 'Login as this user'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                    <div className="flex items-start gap-3">
                        <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-300">
                            <p className="font-medium mb-1">How to return to admin</p>
                            <p className="text-amber-700 dark:text-amber-400">After impersonating, a banner will appear at the top of the page. Click "Return to Admin" to switch back to your admin account.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main AdminDashboard
───────────────────────────────────────────────────────────────────────────── */
const INSTRUCTORS_PER_PAGE = 12;

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [instructors, setInstructors] = useState([]);
    const [instructorSearch, setInstructorSearch] = useState('');
    const [instructorPage, setInstructorPage] = useState(1);
    const [activeTab, setActiveTab] = useState('overview');

    // Payout modal
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [payoutForm, setPayoutForm] = useState({ amount: '', method: 'bank_transfer', transactionId: '', note: '' });
    const [payoutLoading, setPayoutLoading] = useState(false);

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { setInstructorPage(1); }, [instructorSearch]);

    const fetchData = async () => {
        try {
            const [dashRes, instRes] = await Promise.all([
                api.get('/admin/dashboard'),
                api.get('/admin/instructors')
            ]);
            setDashboard(dashRes.data);
            setInstructors(instRes.data);
        } catch {
            showError('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const openPayoutModal = (instructor) => {
        setSelectedInstructor(instructor);
        setPayoutForm({ amount: '', method: instructor.preferredMethod || 'bank_transfer', transactionId: '', note: '' });
        setShowPayoutModal(true);
    };

    const handlePayout = async (e) => {
        e.preventDefault();
        if (!payoutForm.amount || Number(payoutForm.amount) <= 0) { showError('Enter a valid amount'); return; }
        setPayoutLoading(true);
        try {
            await api.post('/admin/payouts', {
                instructorId: selectedInstructor._id,
                amount: Number(payoutForm.amount),
                method: payoutForm.method,
                transactionId: payoutForm.transactionId,
                note: payoutForm.note
            });
            showSuccess('Payout recorded');
            setShowPayoutModal(false);
            fetchData();
        } catch (error) {
            showError(error, 'Failed to create payout');
        } finally { setPayoutLoading(false); }
    };

    const filteredInstructors = instructors.filter(i =>
        i.name.toLowerCase().includes(instructorSearch.toLowerCase()) ||
        i.email.toLowerCase().includes(instructorSearch.toLowerCase())
    );
    const instTotalPages = Math.max(1, Math.ceil(filteredInstructors.length / INSTRUCTORS_PER_PAGE));
    const pagedInstructors = filteredInstructors.slice((instructorPage - 1) * INSTRUCTORS_PER_PAGE, instructorPage * INSTRUCTORS_PER_PAGE);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-[3px] border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    const stats = dashboard?.stats || {};

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FaChartLine },
        { id: 'instructors', label: 'Instructors', icon: FaChalkboardTeacher },
        { id: 'payouts', label: 'Payouts', icon: FaMoneyCheckAlt },
        { id: 'users', label: 'Users', icon: FaShieldAlt },
        { id: 'impersonate', label: 'Login As', icon: FaUserSecret },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

            {/* ── Page Header ──────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your platform, users & payouts</p>
                </div>
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-800">
                    <FaShieldAlt className="text-[10px]" /> Admin
                </span>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                                        activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <Icon className="text-sm" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Tab Content ──────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard icon={FaUsers}           label="Total Users"  value={stats.totalUsers}   color="blue" />
                            <StatCard icon={FaChalkboardTeacher} label="Instructors" value={stats.totalInstructors} color="purple" />
                            <StatCard icon={FaGraduationCap}   label="Students"     value={stats.totalStudents} color="green" />
                            <StatCard icon={FaBook}            label="Courses"       value={`${stats.publishedCourses ?? 0}/${stats.totalCourses ?? 0}`} sub="published / total" color="orange" />
                        </div>

                        {/* Revenue */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { icon: FaRupeeSign, label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), sub: `${stats.totalSales ?? 0} sales`, bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' },
                                { icon: FaMoneyCheckAlt, label: 'Total Paid Out', value: formatCurrency(stats.totalPaidOut), sub: 'To instructors', bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30' },
                                { icon: FaExclamationCircle, label: 'Pending Payout', value: formatCurrency(stats.pendingPayout), sub: 'Owed to instructors', bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' },
                            ].map(r => (
                                <div key={r.label} className={`rounded-xl border p-5 flex items-center gap-4 ${r.light}`}>
                                    <div className={`w-11 h-11 rounded-xl ${r.bg} flex items-center justify-center shrink-0 shadow`}>
                                        <r.icon className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{r.label}</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">{r.value}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent activity */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Recent Sales */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Recent Sales</h2>
                                    <Link to="/admin/activities" className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1 font-medium">
                                        View all <FaArrowRight className="text-[10px]" />
                                    </Link>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                    {(dashboard?.recentPurchases || []).slice(0, 5).map(p => (
                                        <div key={p._id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <Avatar name={p.user?.name} color="slate" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.user?.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.course?.title}</p>
                                            </div>
                                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(p.amount)}</span>
                                        </div>
                                    ))}
                                    {(!dashboard?.recentPurchases || dashboard.recentPurchases.length === 0) && (
                                        <p className="px-5 py-10 text-center text-sm text-slate-400">No sales yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Recent Payouts */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Recent Payouts</h2>
                                    <button onClick={() => setActiveTab('payouts')} className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1 font-medium">
                                        View all <FaArrowRight className="text-[10px]" />
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                    {(dashboard?.recentPayouts || []).map(p => (
                                        <div key={p._id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <Avatar name={p.instructor?.name} color="indigo" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.instructor?.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                                    {p.method?.replace('_', ' ')} &middot; {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className={`text-sm font-semibold ${p.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {formatCurrency(p.amount)}
                                            </span>
                                        </div>
                                    ))}
                                    {(!dashboard?.recentPayouts || dashboard.recentPayouts.length === 0) && (
                                        <p className="px-5 py-10 text-center text-sm text-slate-400">No payouts yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── INSTRUCTORS TAB ──────────────────────────────────────── */}
                {activeTab === 'instructors' && (
                    <div className="space-y-4">
                        <div className="relative max-w-sm">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                            <input
                                type="text"
                                placeholder="Search instructors…"
                                value={instructorSearch}
                                onChange={e => setInstructorSearch(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {filteredInstructors.length} instructor{filteredInstructors.length !== 1 ? 's' : ''}
                            {instructorSearch && <> matching &quot;<span className="font-medium">{instructorSearch}</span>&quot;</>}
                        </p>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wide">
                                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Instructor</th>
                                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Courses</th>
                                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Sales</th>
                                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Earned</th>
                                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Paid</th>
                                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Pending</th>
                                            <th className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Bank</th>
                                            <th className="text-right px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {pagedInstructors.map(inst => (
                                            <tr key={inst._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={inst.name} color="indigo" />
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white">{inst.name}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">{inst.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">{inst.courseCount}</td>
                                                <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{inst.totalSales}</td>
                                                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{formatCurrency(inst.totalEarnings)}</td>
                                                <td className="px-5 py-4 text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(inst.totalPaidOut)}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`font-semibold ${inst.pendingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                                                        {formatCurrency(inst.pendingAmount)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {inst.hasBankDetails
                                                        ? <Badge variant="active"><FaCheckCircle className="text-[9px]" /> Added</Badge>
                                                        : <span className="text-xs text-slate-400">—</span>
                                                    }
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    {inst.pendingAmount > 0 && (
                                                        <button
                                                            onClick={() => openPayoutModal(inst)}
                                                            className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                                        >
                                                            Pay Now
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {pagedInstructors.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="px-5 py-16 text-center">
                                                    <FaChalkboardTeacher className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                                    <p className="text-slate-500 dark:text-slate-400 font-medium">No instructors found</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={instructorPage} totalPages={instTotalPages} onPageChange={setInstructorPage} />
                        </div>
                    </div>
                )}

                {/* ── PAYOUTS TAB ───────────────────────────────────────────── */}
                {activeTab === 'payouts' && <PayoutsTab />}

                {/* ── USERS TAB ────────────────────────────────────────────── */}
                {activeTab === 'users' && <UsersTab />}

                {/* ── IMPERSONATE TAB ─────────────────────────────────────── */}
                {activeTab === 'impersonate' && <ImpersonateTab />}

            </div>{/* end tab content */}

            {/* ── Payout Modal ─────────────────────────────────────────────── */}
            {showPayoutModal && selectedInstructor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-2xl">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <FaMoneyCheckAlt className="text-indigo-500 text-sm" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white">Record Payout</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {selectedInstructor.name} &middot; Pending: <span className="font-semibold text-amber-500">{formatCurrency(selectedInstructor.pendingAmount)}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowPayoutModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handlePayout} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={payoutForm.amount}
                                    onChange={e => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                                    max={selectedInstructor.pendingAmount}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter amount"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Method</label>
                                <select
                                    value={payoutForm.method}
                                    onChange={e => setPayoutForm({ ...payoutForm, method: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="upi">UPI</option>
                                    <option value="paypal">PayPal</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Transaction ID</label>
                                <input
                                    type="text"
                                    value={payoutForm.transactionId}
                                    onChange={e => setPayoutForm({ ...payoutForm, transactionId: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Optional reference ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Note</label>
                                <input
                                    type="text"
                                    value={payoutForm.note}
                                    onChange={e => setPayoutForm({ ...payoutForm, note: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Optional note"
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowPayoutModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={payoutLoading}
                                    className="flex-1 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    {payoutLoading ? 'Processing…' : 'Record Payout'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
