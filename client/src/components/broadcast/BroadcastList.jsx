import { useState, useMemo } from 'react';
import { FaBullhorn, FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaSearch, FaTimes } from 'react-icons/fa';
import Modal from '../ui/Modal';
import Pagination from '../ui/Pagination';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../api/axios';

const BroadcastList = ({
    courseId,
    broadcasts,
    pagination,
    currentPage,
    onPageChange,
    onRefresh,
    canBroadcast = false,
    isOwner = false,
    allowStudentBroadcasts = false,
    onToggleStudentBroadcasts,
    currentUserId
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBroadcast, setEditingBroadcast] = useState(null);
    const [newBroadcast, setNewBroadcast] = useState({ title: '', message: '', priority: 'normal' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // Filter broadcasts
    const filteredBroadcasts = useMemo(() => {
        return broadcasts.filter((broadcast) => {
            // Search filter
            const matchesSearch = searchQuery === '' ||
                broadcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                broadcast.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                broadcast.createdBy?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            // Priority filter
            const matchesPriority = priorityFilter === 'all' || broadcast.priority === priorityFilter;

            return matchesSearch && matchesPriority;
        });
    }, [broadcasts, searchQuery, priorityFilter]);

    // Check if filters are active
    const hasActiveFilters = searchQuery !== '' || priorityFilter !== 'all';

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setPriorityFilter('all');
    };

    // Create broadcast
    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/broadcasts/course/${courseId}`, newBroadcast);
            setNewBroadcast({ title: '', message: '', priority: 'normal' });
            setIsCreateModalOpen(false);
            onRefresh();
            showSuccess('Broadcast sent!');
        } catch (error) {
            showError(error, 'Error sending broadcast');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update broadcast
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingBroadcast) return;
        setIsSubmitting(true);
        try {
            await api.put(`/broadcasts/${editingBroadcast._id}`, {
                title: editingBroadcast.title,
                message: editingBroadcast.message,
                priority: editingBroadcast.priority,
                isActive: editingBroadcast.isActive
            });
            setIsEditModalOpen(false);
            setEditingBroadcast(null);
            onRefresh();
            showSuccess('Broadcast updated!');
        } catch (error) {
            showError(error, 'Error updating broadcast');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete broadcast
    const handleDelete = async (broadcastId) => {
        if (!confirm('Are you sure you want to delete this broadcast?')) return;
        try {
            await api.delete(`/broadcasts/${broadcastId}`);
            onRefresh();
            showSuccess('Broadcast deleted!');
        } catch (error) {
            showError(error, 'Error deleting broadcast');
        }
    };

    // Check if user can edit/delete a broadcast
    const canEditBroadcast = (broadcast) => {
        if (!currentUserId) return false;
        return isOwner || broadcast.createdBy?._id === currentUserId;
    };

    // Priority indicator
    const getPriorityIndicator = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-500';
            case 'important':
                return 'bg-amber-500';
            default:
                return 'bg-slate-300 dark:bg-slate-600';
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    {isOwner ? 'Broadcasts' : 'Announcements'}
                </h2>
                <div className="flex items-center gap-2">
                    {isOwner && onToggleStudentBroadcasts && (
                        <button
                            onClick={onToggleStudentBroadcasts}
                            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md font-medium border transition-all ${allowStudentBroadcasts
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                            title={allowStudentBroadcasts ? 'Students can post' : 'Only you can post'}
                        >
                            {allowStudentBroadcasts ? <FaToggleOn size={12} /> : <FaToggleOff size={12} />}
                            <span className="hidden sm:inline">Students</span>
                        </button>
                    )}
                    {canBroadcast && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/20"
                        >
                            <FaPlus size={10} /> New
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            {broadcasts.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={12} />
                        <input
                            type="text"
                            placeholder="Search announcements..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Priority Filter */}
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
                    >
                        <option value="all">All</option>
                        <option value="urgent">Urgent</option>
                        <option value="important">Important</option>
                        <option value="normal">Normal</option>
                    </select>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Clear filters"
                        >
                            <FaTimes size={12} />
                        </button>
                    )}
                </div>
            )}

            {/* Broadcast List */}
            {broadcasts.length > 0 ? (
                <>
                    {filteredBroadcasts.length > 0 ? (
                        <div className="space-y-3">
                            {filteredBroadcasts.map((broadcast) => {
                                const borderColor = broadcast.priority === 'urgent' ? 'border-l-red-500' : broadcast.priority === 'important' ? 'border-l-amber-500' : 'border-l-slate-300 dark:border-l-slate-700';
                                return (
                                <div
                                    key={broadcast._id}
                                    className={`group bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 border-l-[3px] ${borderColor} rounded-xl p-4 hover:shadow-md dark:hover:border-slate-700 transition-all ${broadcast.isActive === false ? 'opacity-50' : ''}`}
                                >
                                    {/* Top row: Title + Priority + Actions */}
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${getPriorityIndicator(broadcast.priority)}`} />
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {broadcast.title}
                                            </h4>
                                            {broadcast.isActive === false && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        {canEditBroadcast(broadcast) && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setEditingBroadcast({ ...broadcast });
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                >
                                                    <FaEdit size={11} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(broadcast._id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <FaTrash size={11} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Message - with truncated URLs */}
                                    <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3 pl-[18px]">
                                        {broadcast.message.split(/(\bhttps?:\/\/\S+)/g).map((part, i) => {
                                            if (/^https?:\/\//.test(part)) {
                                                // Extract a friendly label from the URL
                                                let label;
                                                try {
                                                    const urlObj = new URL(part);
                                                    const path = urlObj.pathname.replace(/\/$/, '');
                                                    const lastSegment = path.split('/').filter(Boolean).pop();
                                                    label = lastSegment ? `${urlObj.hostname}/…/${decodeURIComponent(lastSegment).substring(0, 30)}` : urlObj.hostname;
                                                } catch {
                                                    label = part.substring(0, 40) + '…';
                                                }
                                                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-400 hover:underline font-medium" onClick={e => e.stopPropagation()}>🔗 {label}</a>;
                                            }
                                            return part;
                                        })}
                                    </p>

                                    {/* Footer - inline */}
                                    <div className="flex items-center justify-between pl-[18px]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                                <span className="text-[10px] font-bold text-white">
                                                    {broadcast.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                {broadcast.createdBy?.name || 'Unknown'}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                            {new Date(broadcast.createdAt).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400">No broadcasts match your filters</p>
                            <button
                                onClick={clearFilters}
                                className="mt-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}

                    {/* Pagination - compact (only show if no filters applied) */}
                    {!hasActiveFilters && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={pagination.pages}
                                totalItems={pagination.total}
                                itemsPerPage={pagination.limit || 5}
                                onPageChange={(newPage) => onPageChange(newPage)}
                                showLimitSelector={false}
                            />
                        </div>
                    )}

                    {/* Filter results count */}
                    {hasActiveFilters && (
                        <div className="mt-3 text-center">
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                {filteredBroadcasts.length} of {broadcasts.length} shown
                            </span>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <FaBullhorn className="text-indigo-400 dark:text-indigo-500/80" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Announcements</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">Stay tuned! Important updates from the instructor will appear here.</p>
                    {canBroadcast && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                        >
                            <FaPlus size={10} /> Create Announcement
                        </button>
                    )}
                </div>
            )}

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="New Broadcast"
            >
                <form onSubmit={handleCreate} className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                            value={newBroadcast.title}
                            onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                            placeholder="Brief title..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                            Message
                        </label>
                        <textarea
                            className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 min-h-[80px] resize-none"
                            value={newBroadcast.message}
                            onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                            placeholder="Your message..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                            Priority
                        </label>
                        <select
                            className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                            value={newBroadcast.priority}
                            onChange={(e) => setNewBroadcast({ ...newBroadcast, priority: e.target.value })}
                        >
                            <option value="normal">Normal</option>
                            <option value="important">Important</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingBroadcast(null);
                }}
                title="Edit Broadcast"
            >
                {editingBroadcast && (
                    <form onSubmit={handleUpdate} className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                                Title
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                                value={editingBroadcast.title}
                                onChange={(e) => setEditingBroadcast({ ...editingBroadcast, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                                Message
                            </label>
                            <textarea
                                className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 min-h-[80px] resize-none"
                                value={editingBroadcast.message}
                                onChange={(e) => setEditingBroadcast({ ...editingBroadcast, message: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                                    Priority
                                </label>
                                <select
                                    className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                                    value={editingBroadcast.priority}
                                    onChange={(e) => setEditingBroadcast({ ...editingBroadcast, priority: e.target.value })}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="important">Important</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                                    Status
                                </label>
                                <select
                                    className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                                    value={editingBroadcast.isActive ? 'active' : 'inactive'}
                                    onChange={(e) => setEditingBroadcast({ ...editingBroadcast, isActive: e.target.value === 'active' })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingBroadcast(null);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default BroadcastList;
