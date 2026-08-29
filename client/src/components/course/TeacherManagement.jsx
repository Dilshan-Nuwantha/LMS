import { useState, useEffect, useContext } from 'react';
import { FaUserTie, FaPlus, FaTrash, FaCrown, FaSearch, FaTimes, FaEdit, FaUser } from 'react-icons/fa';
import Modal from '../ui/Modal';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../api/axios';
import AuthContext from '../../context/AuthContext';

// Permission configuration ordered by priority (highest first)
const PERMISSIONS_CONFIG = [
    {
        key: 'full_access',
        label: 'Full Access',
        description: 'All permissions including course settings',
        badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        borderColor: 'border-purple-500',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
        key: 'manage_teachers',
        label: 'Manage Teachers',
        description: 'Add/remove other teachers (except creator)',
        badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        borderColor: 'border-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
        key: 'manage_students',
        label: 'Manage Students',
        description: 'Enroll/remove students, view progress',
        badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        borderColor: 'border-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
        key: 'manage_content',
        label: 'Manage Content',
        description: 'Add, edit, delete lectures and sections',
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        borderColor: 'border-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    }
];

const TeacherManagement = ({
    courseId,
    canManageTeachers = false,
    isOwner = false
}) => {
    const { user } = useContext(AuthContext);
    const currentUserId = user?._id;

    // Only owners (admin/creator) can grant full_access and manage_teachers
    const canGrantAdvancedPermissions = isOwner;

    const [teachers, setTeachers] = useState([]);
    const [creator, setCreator] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [newTeacher, setNewTeacher] = useState({
        email: '',
        permissions: {
            manage_content: false,
            manage_students: false,
            full_access: false,
            manage_teachers: false
        }
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch teachers
    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/courses/${courseId}/teachers`);
            setCreator(res.data.creator);
            setTeachers(res.data.teachers);
        } catch {
            showError('Failed to load teachers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    // Filter teachers by search (ensure teachers is always an array)
    const filteredTeachers = (teachers || []).filter((t) =>
        searchQuery === '' ||
        t.teacher?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.teacher?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Add teacher
    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newTeacher.email.trim()) {
            showError('Please enter an email');
            return;
        }

        // Check if at least one permission is selected
        const hasPermission = Object.values(newTeacher.permissions).some(v => v);
        if (!hasPermission) {
            showError('Please select at least one permission');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/courses/${courseId}/teachers`, newTeacher);
            setNewTeacher({
                email: '',
                permissions: {
                    manage_content: false,
                    manage_students: false,
                    full_access: false,
                    manage_teachers: false
                }
            });
            setIsAddModalOpen(false);
            fetchTeachers();
            showSuccess('Teacher added!');
        } catch (error) {
            showError(error, 'Error adding teacher');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update teacher permissions
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingTeacher) return;

        const hasPermission = Object.values(editingTeacher.permissions).some(v => v);
        if (!hasPermission) {
            showError('Please select at least one permission');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.put(`/courses/${courseId}/teachers/${editingTeacher.teacher._id}`, {
                permissions: editingTeacher.permissions
            });
            setIsEditModalOpen(false);
            setEditingTeacher(null);
            fetchTeachers();
            showSuccess('Permissions updated!');
        } catch (error) {
            showError(error, 'Error updating permissions');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Remove teacher
    const handleRemove = async (teacherId) => {
        if (!confirm('Are you sure you want to remove this teacher?')) return;
        try {
            await api.delete(`/courses/${courseId}/teachers/${teacherId}`);
            fetchTeachers();
            showSuccess('Teacher removed');
        } catch (error) {
            showError(error, 'Error removing teacher');
        }
    };

    // Permission checkbox handler for new teacher
    const handleNewPermissionChange = (permission) => {
        setNewTeacher(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permission]: !prev.permissions[permission]
            }
        }));
    };

    // Permission checkbox handler for editing teacher
    const handleEditPermissionChange = (permission) => {
        setEditingTeacher(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permission]: !prev.permissions[permission]
            }
        }));
    };

    // Permission badge component
    const PermissionBadge = ({ permissionKey, active }) => {
        if (!active) return null;
        const config = PERMISSIONS_CONFIG.find(p => p.key === permissionKey);
        if (!config) return null;

        return (
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.badgeColor}`}>
                {config.label.replace('Manage ', '')}
            </span>
        );
    };

    // Permission checkbox component for modal
    const PermissionCheckbox = ({ permissionKey, checked, onChange }) => {
        const config = PERMISSIONS_CONFIG.find(p => p.key === permissionKey);
        if (!config) return null;

        return (
            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                checked
                    ? `${config.borderColor} ${config.bgColor}`
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
            }`}>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(permissionKey)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                    <div className="font-medium text-slate-800 dark:text-white text-sm">{config.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{config.description}</div>
                </div>
            </label>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <FaUserTie className="text-indigo-600" />
                    <h3 className="font-semibold text-slate-800 dark:text-white">
                        Course Teachers ({(teachers || []).length + 1})
                    </h3>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-none">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-2 w-full sm:w-48 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <FaTimes className="text-xs" />
                            </button>
                        )}
                    </div>
                    {/* Add button */}
                    {canManageTeachers && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            <FaPlus className="text-xs" />
                            <span className="hidden sm:inline">Add Teacher</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Teachers List */}
            <div className="space-y-2">
                {/* Course Creator */}
                {creator && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                                {creator.name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-800 dark:text-white">{creator.name}</span>
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                        <FaCrown className="text-[10px]" />
                                        Creator
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">{creator.email}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Added Teachers */}
                {filteredTeachers.length === 0 && (teachers || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <FaUserTie className="mx-auto text-3xl mb-2 opacity-30" />
                        <p>No additional teachers added yet</p>
                    </div>
                ) : filteredTeachers.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                        No teachers match your search
                    </div>
                ) : (
                    filteredTeachers.map((t) => {
                        const isCurrentUser = t.teacher?._id === currentUserId;
                        return (
                            <div
                                key={t._id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                    isCurrentUser
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                        isCurrentUser ? 'bg-indigo-600' : 'bg-indigo-500'
                                    }`}>
                                        {t.teacher?.name?.charAt(0).toUpperCase() || 'T'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-800 dark:text-white">{t.teacher?.name}</span>
                                            {isCurrentUser && (
                                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                    <FaUser className="text-[10px]" />
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">{t.teacher?.email}</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {/* Show badges in priority order */}
                                            {PERMISSIONS_CONFIG.map(p => (
                                                <PermissionBadge key={p.key} permissionKey={p.key} active={t.permissions?.[p.key]} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Only show edit/delete for other teachers, not for self */}
                                {canManageTeachers && !isCurrentUser && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingTeacher(t);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                            title="Edit permissions"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            onClick={() => handleRemove(t.teacher._id)}
                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Remove teacher"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Teacher Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Teacher">
                <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={newTeacher.email}
                            onChange={(e) => setNewTeacher(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="teacher@example.com"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Permissions <span className="text-xs text-slate-400 font-normal">(select at least one)</span>
                        </label>
                        <div className="space-y-2">
                            {/* Render permissions in priority order, filter advanced permissions for non-owners */}
                            {PERMISSIONS_CONFIG
                                .filter(p => canGrantAdvancedPermissions || (p.key !== 'full_access' && p.key !== 'manage_teachers'))
                                .map(p => (
                                    <PermissionCheckbox
                                        key={p.key}
                                        permissionKey={p.key}
                                        checked={newTeacher.permissions[p.key]}
                                        onChange={handleNewPermissionChange}
                                    />
                                ))}
                        </div>
                        {!canGrantAdvancedPermissions && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">
                                Note: Only the course creator can grant Full Access or Manage Teachers permissions.
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Teacher'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Permissions Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Permissions">
                {editingTeacher && (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                {editingTeacher.teacher?.name?.charAt(0).toUpperCase() || 'T'}
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 dark:text-white">{editingTeacher.teacher?.name}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">{editingTeacher.teacher?.email}</div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Permissions <span className="text-xs text-slate-400 font-normal">(select at least one)</span>
                            </label>
                            <div className="space-y-2">
                                {/* Render permissions in priority order, filter advanced permissions for non-owners */}
                                {PERMISSIONS_CONFIG
                                    .filter(p => canGrantAdvancedPermissions || (p.key !== 'full_access' && p.key !== 'manage_teachers'))
                                    .map(p => (
                                        <PermissionCheckbox
                                            key={p.key}
                                            permissionKey={p.key}
                                            checked={editingTeacher.permissions?.[p.key] || false}
                                            onChange={handleEditPermissionChange}
                                        />
                                    ))}
                            </div>
                            {!canGrantAdvancedPermissions && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">
                                    Note: Only the course creator can grant Full Access or Manage Teachers permissions.
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default TeacherManagement;
