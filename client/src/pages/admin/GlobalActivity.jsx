import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FaHistory, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/ui/Pagination';
import ActivityFilters from '../../components/activity/ActivityFilters';
import ActivityDetailDrawer from '../../components/activity/ActivityDetailDrawer';
import { getActionIcon, getActionBadgeClass, getResourceLabel, ALL_ACTIONS_ADMIN } from '../../utils/activityUtils';

const GlobalActivity = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState(15);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [debouncedUser, setDebouncedUser] = useState('');
    const [selectedActions, setSelectedActions] = useState([]);
    const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
    const [actionSearch, setActionSearch] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('');
    const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);
    const [datePreset, setDatePreset] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

    // Detail drawer
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedUser(userFilter), 500);
        return () => clearTimeout(timer);
    }, [userFilter]);

    useEffect(() => {
        const fetchActivities = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    page, limit,
                    search: debouncedSearch,
                    action: selectedActions.length > 0 ? selectedActions.join(',') : '',
                    user: debouncedUser,
                    ...(selectedMethod && { method: selectedMethod }),
                    ...(dateFrom && { dateFrom }),
                    ...(dateTo && { dateTo }),
                };
                const res = await api.get('/activities', { params });
                setActivities(res.data.activities);
                setTotalPages(res.data.pages);
                setTotal(res.data.total || 0);
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to load logs');
            } finally {
                setLoading(false);
            }
        };
        fetchActivities();
    }, [page, limit, debouncedSearch, selectedActions, debouncedUser, selectedMethod, dateFrom, dateTo]);

    const handleReset = () => {
        setSearchTerm(''); setSelectedActions([]); setUserFilter('');
        setSelectedMethod(''); setDatePreset('all'); setDateFrom(''); setDateTo(''); setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 pb-12 transition-colors duration-300">
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-navbar z-10">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FaHistory className="text-slate-400" />
                            Global Activity Log
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time student actions across all courses</p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <ActivityFilters
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    userFilter={userFilter} setUserFilter={setUserFilter}
                    selectedActions={selectedActions} setSelectedActions={setSelectedActions}
                    actionSearch={actionSearch} setActionSearch={setActionSearch}
                    selectedMethod={selectedMethod} setSelectedMethod={setSelectedMethod}
                    datePreset={datePreset} setDatePreset={setDatePreset}
                    dateFrom={dateFrom} setDateFrom={setDateFrom}
                    dateTo={dateTo} setDateTo={setDateTo}
                    actionDropdownOpen={actionDropdownOpen} setActionDropdownOpen={setActionDropdownOpen}
                    methodDropdownOpen={methodDropdownOpen} setMethodDropdownOpen={setMethodDropdownOpen}
                    dateDropdownOpen={dateDropdownOpen} setDateDropdownOpen={setDateDropdownOpen}
                    onReset={handleReset} setPage={setPage}
                    actions={ALL_ACTIONS_ADMIN}
                />

                {loading ? (
                    <div className="flex justify-center items-center h-64 text-slate-400 animate-pulse">Loading Logs...</div>
                ) : error ? (
                    <div className="text-center py-20 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="text-red-500 dark:text-red-400 font-bold mb-2">Error Loading Activity</div>
                        <div className="text-sm text-red-400 dark:text-red-300">{error}</div>
                    </div>
                ) : activities.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-slate-950 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-gray-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 w-[250px]">User</th>
                                        <th className="px-6 py-4 w-[150px]">Action</th>
                                        <th className="px-6 py-4 w-[250px]">Resource</th>
                                        <th className="px-6 py-4 w-[200px]">Details</th>
                                        <th className="px-6 py-4 w-[150px]">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {activities.map((log) => {
                                        const user = log.user || log.student;
                                        return (
                                            <tr key={log._id} onClick={() => setSelectedLog(log)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs uppercase shrink-0">
                                                            {user?.name ? user.name.charAt(0) : <FaUser />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{user?.name || 'Unknown User'}</div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-xs text-slate-500 dark:text-slate-500 truncate max-w-[120px]">{user?.email}</div>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                                    {user?.role || 'user'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                                    <div className="flex items-center gap-2">
                                                        {getActionIcon(log.action)}
                                                        <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${getActionBadgeClass(log.action)}`}>
                                                            {log.action}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        {log.course ? (
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate hover:underline cursor-pointer block"
                                                                title={log.course.title}
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/course/${log.course._id}`); }}>
                                                                {log.course.title}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">{getResourceLabel(log)}</span>
                                                        )}
                                                        {log.lecture && (
                                                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                                <span className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 px-1 rounded">Lec</span>
                                                                <span className="text-xs truncate max-w-[180px]" title={log.lecture.title}>{log.lecture.title}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="max-w-[200px] min-w-0">
                                                        <div className="line-clamp-2 break-words text-xs leading-relaxed text-slate-700 dark:text-slate-300" title={log.details || ''}>
                                                            {log.details || 'No details'}
                                                        </div>
                                                        {log.url && (
                                                            <div className="mt-1 text-[10px] text-slate-400 font-mono truncate cursor-help" title={`${log.method} ${log.url}`}>
                                                                <span className={`font-bold mr-1 ${log.method === 'POST' ? 'text-emerald-500' : log.method === 'PUT' ? 'text-amber-500' : log.method === 'DELETE' ? 'text-red-500' : 'text-violet-500'}`}>{log.method}</span>
                                                                {log.url}
                                                            </div>
                                                        )}
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
                        <Pagination
                            currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={limit}
                            onPageChange={(p) => setPage(p)}
                            onLimitChange={(l) => { setLimit(l); setPage(1); }}
                        />
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 border-dashed">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaHistory className="text-slate-300 dark:text-slate-600 text-2xl" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No activity yet</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Students activity will appear here.</p>
                    </div>
                )}
            </div>

            {selectedLog && <ActivityDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
        </div>
    );
};

export default GlobalActivity;
