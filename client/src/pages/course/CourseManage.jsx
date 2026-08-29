import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { FaEye, FaEyeSlash, FaEdit, FaTrash, FaChevronDown, FaBook, FaCog, FaUsers, FaBullhorn, FaUserTie, FaTimes, FaSignOutAlt, FaChartBar, FaClipboardList, FaSearch, FaUserPlus, FaHistory, FaRobot, FaUserGraduate, FaCheckCircle, FaPlayCircle, FaClock, FaGripVertical, FaGripHorizontal, FaFolderOpen, FaBan, FaComments, FaChevronRight, FaUser, FaFilter, FaBell, FaPaperPlane, FaCheck } from 'react-icons/fa';
import Modal from '../../components/ui/Modal';
import BroadcastList from '../../components/broadcast/BroadcastList';
import TeacherManagement from '../../components/course/TeacherManagement';
import CurriculumTab from '../../components/course/CurriculumTab';
import StudentsTab from '../../components/course/StudentsTab';
import AINotesGenerator from '../../components/course/AINotesGenerator';
import ResourceManager from '../../components/course/ResourceManager';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import AuthContext from '../../context/AuthContext';

const CourseManage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useContext(AuthContext);

    // Active tab from URL or default to 'curriculum'
    const activeTab = searchParams.get('tab') || 'curriculum';

    // Tab layout orientation (vertical sidebar or horizontal tabs)
    const [tabLayout, setTabLayout] = useState(() => {
        return localStorage.getItem('courseManageTabLayout') || 'vertical';
    });
    const toggleTabLayout = () => {
        const next = tabLayout === 'vertical' ? 'horizontal' : 'vertical';
        setTabLayout(next);
        localStorage.setItem('courseManageTabLayout', next);
    };

    const [sidebarHovered, setSidebarHovered] = useState(false);

    const [course, setCourse] = useState(null);
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [newSectionIsPublic, setNewSectionIsPublic] = useState(true);
    const [newSectionIsPreview, setNewSectionIsPreview] = useState(false);
    const [newSectionImportance, setNewSectionImportance] = useState('');
    const [expandedSections, setExpandedSections] = useState({});

    // Section State
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [editingSectionId, setEditingSectionId] = useState(null);
    const [sectionBroadcast, setSectionBroadcast] = useState({ enabled: false, message: '', priority: 'normal' });

    // Lecture State
    const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [editingLectureId, setEditingLectureId] = useState(null);
    const [newLecture, setNewLecture] = useState({ title: '', number: '', resourceUrl: '', description: '', dueDate: '', status: 'Pending', isPublic: true, isPreview: false });
    const [lectureBroadcast, setLectureBroadcast] = useState({ enabled: false, message: '', priority: 'normal' });


    // Send Notification Modal State
    const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [notifPriority, setNotifPriority] = useState('normal');
    const [sendingNotif, setSendingNotif] = useState(false);
    const [notifTarget, setNotifTarget] = useState('all'); // 'all' | 'specific'
    const [notifStudentSearch, setNotifStudentSearch] = useState('');
    const [notifStudentList, setNotifStudentList] = useState([]);
    const [notifSelectedStudents, setNotifSelectedStudents] = useState([]); // [{ _id, name, email }]

    const fetchNotifStudents = async (keyword = '') => {
        try {
            const res = await api.get(`/courses/${id}/enrolled-students?keyword=${keyword}`);
            setNotifStudentList(res.data || []);
        } catch {}
    };

    useEffect(() => {
        if (notifTarget === 'specific' && isNotifModalOpen) {
            const timer = setTimeout(() => fetchNotifStudents(notifStudentSearch), 300);
            return () => clearTimeout(timer);
        }
    }, [notifStudentSearch, notifTarget, isNotifModalOpen]);

    const handleSendNotification = async () => {
        if (!notifTitle.trim()) return showError('Title is required');
        if (notifTarget === 'specific' && notifSelectedStudents.length === 0) return showError('Select at least one student');
        setSendingNotif(true);
        try {
            await api.post(`/notifications/course/${id}/send`, {
                title: notifTitle,
                message: notifMessage,
                priority: notifPriority,
                studentIds: notifTarget === 'specific' ? notifSelectedStudents.map(s => s._id) : undefined
            });
            showSuccess(notifTarget === 'specific' ? `Notification sent to ${notifSelectedStudents.length} student(s)` : 'Notification sent to all students');
            setNotifTitle('');
            setNotifMessage('');
            setNotifPriority('normal');
            setNotifTarget('all');
            setNotifSelectedStudents([]);
            setIsNotifModalOpen(false);
        } catch { showError('Failed to send notification'); }
        finally { setSendingNotif(false); }
    };

    // AI Chat Viewer State (instructor view of student conversations using instructor key)
    const [aiChatDrawerOpen, setAiChatDrawerOpen] = useState(false);
    const [aiChatViewStudent, setAiChatViewStudent] = useState(null); // { _id, name, email }
    const [aiChatConversations, setAiChatConversations] = useState([]);
    const [aiChatLoading, setAiChatLoading] = useState(false);
    const [aiChatSelectedConv, setAiChatSelectedConv] = useState(null);

    // Student Progress Overlay State (used by CurriculumTab)
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [selectedStudentName, setSelectedStudentName] = useState('');
    const [studentProgressData, setStudentProgressData] = useState(null);
    const [studentProgressLoading, setStudentProgressLoading] = useState(false);

    // Shrink header on scroll (lock prevents layout-shift feedback loop)
    const [headerScrolled, setHeaderScrolled] = useState(false);
    const headerScrolledRef = useRef(false);
    const scrollLockRef = useRef(false);
    useEffect(() => {
        const onScroll = () => {
            if (scrollLockRef.current) return;
            const y = window.scrollY;
            if (!headerScrolledRef.current && y > 80) {
                headerScrolledRef.current = true;
                scrollLockRef.current = true;
                setHeaderScrolled(true);
                setTimeout(() => { scrollLockRef.current = false; }, 600);
            } else if (headerScrolledRef.current && y < 20) {
                headerScrolledRef.current = false;
                scrollLockRef.current = true;
                setHeaderScrolled(false);
                setTimeout(() => { scrollLockRef.current = false; }, 600);
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);


    // Broadcast State
    const [broadcasts, setBroadcasts] = useState([]);
    const [broadcastsLoaded, setBroadcastsLoaded] = useState(false);
    const [allowStudentBroadcasts, setAllowStudentBroadcasts] = useState(false);
    const [broadcastPage, setBroadcastPage] = useState(1);
    const [broadcastPagination, setBroadcastPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0);

    // User permissions state
    const [userPermissions, setUserPermissions] = useState({
        isAdmin: false,
        isCreator: false,
        isTeacher: false,
        permissions: {
            manage_content: false,
            manage_students: false,
            full_access: false,
            manage_teachers: false
        }
    });

    // Check if user can manage teachers
    const canManageTeachers = userPermissions.isAdmin || userPermissions.isCreator ||
        userPermissions.permissions.manage_teachers || userPermissions.permissions.full_access;

    // Check if user is owner (admin or creator)
    const isOwner = userPermissions.isAdmin || userPermissions.isCreator;

    // State for dismissing teacher permissions banner
    const [showPermissionsBanner, setShowPermissionsBanner] = useState(true);

    // Tab configuration - Curriculum, Broadcasts, Students, Teachers, AI Notes
    const tabs = [
        { id: 'curriculum', label: 'Curriculum', icon: FaBook },
        { id: 'broadcasts', label: 'Broadcasts', icon: FaBullhorn },
        { id: 'students', label: 'Students', icon: FaUsers },
        { id: 'teachers', label: 'Teachers', icon: FaUserTie },
        { id: 'resources', label: 'Resources', icon: FaFolderOpen },
        { id: 'ai-notes', label: 'AI Notes', icon: FaRobot },
    ];

    const setActiveTab = (tabId) => {
        setSearchParams({ tab: tabId });
    };

    // Fetch course data (always needed for header)
    const fetchCourse = async (preserveExpanded = false) => {
        try {
            const res = await api.get(`/courses/${id}`);
            setCourse(res.data);
            // Initialize expanded sections - all collapsed by default, but preserve state on re-fetch
            if (res.data.sections && res.data.sections.length > 0 && !preserveExpanded) {
                const initialExpanded = {};
                res.data.sections.forEach((section) => {
                    initialExpanded[section._id] = false;
                });
                setExpandedSections(initialExpanded);
            }
        } catch (err) {
            console.error("Failed to fetch course", err);
        }
    };

    // Fetch selected student's progress
    const fetchStudentProgress = async (studentId) => {
        setStudentProgressLoading(true);
        try {
            const res = await api.get(`/courses/${id}/progress/${studentId}`);
            setStudentProgressData(res.data);
        } catch (err) {
            console.error("Failed to fetch student progress", err);
            showError('Failed to load student progress');
            setSelectedStudentId(null);
            setStudentProgressData(null);
        } finally {
            setStudentProgressLoading(false);
        }
    };

    // When a student is selected, fetch their progress
    useEffect(() => {
        if (selectedStudentId) {
            fetchStudentProgress(selectedStudentId);
        } else {
            setStudentProgressData(null);
        }
    }, [selectedStudentId]);

    // Build lookup maps from progress data
    const lectureProgressMap = {};
    const sectionProgressMap = {};
    if (studentProgressData) {
        studentProgressData.sections.forEach(section => {
            sectionProgressMap[section._id] = {
                completedCount: section.completedCount,
                totalCount: section.totalCount,
                progressPercent: section.progressPercent
            };
            section.lectures.forEach(lec => {
                lectureProgressMap[lec._id] = {
                    status: lec.status,
                    statusDate: lec.statusDate
                };
            });
        });
    }

    // Helper: get status icon for progress overlay
    const getProgressStatusIcon = (status) => {
        const completedStatus = studentProgressData?.course?.completedStatus || course?.completedStatus || 'Completed';
        if (status === completedStatus || status === 'Completed') {
            return <FaCheckCircle className="text-green-500" size={12} />;
        } else if (status === 'In Progress') {
            return <FaPlayCircle className="text-amber-500" size={12} />;
        }
        return <FaClock className="text-slate-400" size={12} />;
    };

    // Helper: get status badge color
    const getProgressStatusColor = (status) => {
        const statuses = studentProgressData?.course?.lectureStatuses || course?.lectureStatuses || [];
        const config = statuses.find(s => s.label === status);
        if (config?.color) return config.color;
        if (status === 'Completed') return '#10b981';
        if (status === 'In Progress') return '#f59e0b';
        return '#94a3b8';
    };

    // Fetch broadcasts (lazy load)
    const fetchBroadcasts = async (page = 1) => {
        try {
            const res = await api.get(`/broadcasts/course/${id}?page=${page}&limit=5`);
            setBroadcasts(res.data.broadcasts);
            setBroadcastPagination(res.data.pagination);
            setBroadcastPage(page);
            setBroadcastsLoaded(true);
        } catch (err) {
            console.error("Failed to fetch broadcasts", err);
        }
    };

    const fetchBroadcastSettings = async () => {
        try {
            const res = await api.get(`/broadcasts/course/${id}/can-broadcast`);
            setAllowStudentBroadcasts(res.data.allowStudentBroadcasts || false);
        } catch (err) {
            console.error("Failed to fetch broadcast settings", err);
        }
    };

    // Fetch unread broadcast count
    const fetchUnreadCount = async () => {
        try {
            const res = await api.get(`/broadcasts/course/${id}/unread-count`);
            setUnreadBroadcastCount(res.data.unreadCount || 0);
        } catch (err) {
            console.error("Failed to fetch unread count", err);
        }
    };

    // Mark broadcasts as read
    const markBroadcastsAsRead = async () => {
        try {
            await api.post(`/broadcasts/course/${id}/mark-read`);
            setUnreadBroadcastCount(0);
        } catch (err) {
            console.error("Failed to mark broadcasts as read", err);
        }
    };

    // Fetch user permissions for this course
    const fetchUserPermissions = async () => {
        try {
            const res = await api.get(`/courses/${id}/my-permissions`);
            setUserPermissions(res.data);
        } catch (err) {
            console.error("Failed to fetch user permissions", err);
        }
    };

    // Initial load - fetch course, unread count, and permissions
    useEffect(() => {
        fetchCourse();
        fetchUnreadCount();
        fetchUserPermissions();
    }, [id]);

    // Lazy load data based on active tab
    useEffect(() => {
        if (activeTab === 'broadcasts') {
            if (!broadcastsLoaded) {
                fetchBroadcasts();
                fetchBroadcastSettings();
            }
            // Mark broadcasts as read when viewing the tab
            if (unreadBroadcastCount > 0) {
                markBroadcastsAsRead();
            }
        }
    }, [activeTab, broadcastsLoaded, unreadBroadcastCount]);

    const handleSaveSection = async (e) => {
        e.preventDefault();
        try {
            if (editingSectionId) {
                await api.put(`/courses/${id}/sections/${editingSectionId}`, { title: newSectionTitle, isPublic: newSectionIsPublic, isPreview: newSectionIsPreview, importance: newSectionImportance });
            } else {
                await api.post(`/courses/${id}/sections`, { title: newSectionTitle, isPublic: newSectionIsPublic, isPreview: newSectionIsPreview, importance: newSectionImportance });
                if (sectionBroadcast.enabled) {
                    const broadcastMsg = sectionBroadcast.message || `📚 New section added: "${newSectionTitle}"`;
                    await api.post(`/broadcasts/course/${id}`, {
                        title: `New Section: ${newSectionTitle}`,
                        message: broadcastMsg,
                        priority: sectionBroadcast.priority
                    }).catch(() => showError('Section saved but broadcast failed'));
                }
            }
            setNewSectionTitle('');
            setNewSectionIsPublic(true);
            setNewSectionIsPreview(false);
            setNewSectionImportance('');
            setEditingSectionId(null);
            setSectionBroadcast({ enabled: false, message: '', priority: 'normal' });
            fetchCourse(true);
            showSuccess(editingSectionId ? 'Section updated!' : 'Section added!');
        } catch (error) {
            showError('Error saving section');
        }
    };

    const handleDeleteSection = async (sectionId) => {
        if (!window.confirm('Are you sure? This will delete the section and ALL its lectures.')) return;
        try {
            await api.delete(`/courses/${id}/sections/${sectionId}`);
            fetchCourse(true);
            showSuccess('Section deleted');
        } catch (error) {
            showError('Error deleting section');
        }
    };

    const handleSaveLecture = async (e) => {
        e.preventDefault();
        try {
            if (editingLectureId) {
                await api.put(`/courses/lectures/${editingLectureId}`, newLecture);
            } else {
                if (!activeSectionId) return showWarning('Select a section first');
                const { data: createdLecture } = await api.post(`/courses/${id}/sections/${activeSectionId}/lectures`, newLecture);
                if (lectureBroadcast.enabled) {
                    const sectionTitle = course?.sections?.find(s => s._id === activeSectionId)?.title || '';
                    const lectureLink = createdLecture?._id ? `${window.location.origin}/course/${id}/lecture/${createdLecture._id}` : '';
                    const defaultMsg = `🎬 New lecture added: "${newLecture.title}"${sectionTitle ? ` in "${sectionTitle}"` : ''}${lectureLink ? `\n🔗 ${lectureLink}` : ''}`;
                    const broadcastMsg = lectureBroadcast.message + (lectureLink ? `\n🔗 ${lectureLink}` : '');
                    await api.post(`/broadcasts/course/${id}`, {
                        title: `New Lecture: ${newLecture.title}`,
                        message: broadcastMsg || defaultMsg,
                        priority: lectureBroadcast.priority
                    }).catch(() => showError('Lecture saved but broadcast failed'));
                }
            }

            setNewLecture({ title: '', number: '', resourceUrl: '', description: '', dueDate: '', status: 'Pending', isPublic: true, importance: '' });
            setActiveSectionId(null);
            setEditingLectureId(null);
            setLectureBroadcast({ enabled: false, message: '', priority: 'normal' });
            fetchCourse(true);
            showSuccess(editingLectureId ? 'Lecture updated!' : 'Lecture added!');
        } catch (error) {
            if (!error.handled) {
                showError(error, 'Error saving lecture');
            }
        }
    };

    const handleEditClick = (lec, sectionId) => {
        setNewLecture({
            title: lec.title,
            number: lec.number,
            resourceUrl: lec.resourceUrl,
            description: lec.description,
            dueDate: lec.dueDate ? lec.dueDate.split('T')[0] : '',
            status: lec.status || 'Pending',
            isPublic: lec.isPublic,
            isPreview: lec.isPreview,
            importance: lec.importance || ''
        });
        setEditingLectureId(lec._id);
        setActiveSectionId(sectionId);
    };

    const handleDeleteLecture = async (lectureId) => {
        if (!window.confirm('Are you sure you want to delete this lecture?')) return;
        try {
            await api.delete(`/courses/lectures/${lectureId}`);
            fetchCourse(true);
            showSuccess('Lecture deleted');
        } catch (error) {
            showError('Error deleting lecture');
        }
    };

    const handleToggleSectionVisibility = async (sectionId, currentStatus) => {
        try {
            await api.put(`/courses/${id}/sections/${sectionId}`, { isPublic: !currentStatus });
            fetchCourse(true);
            showSuccess(currentStatus ? 'Section hidden' : 'Section is now Public');
        } catch (error) {
            showError('Error updating visibility');
        }
    };

    const handleToggleLectureVisibility = async (lectureId, currentStatus) => {
        try {
            await api.put(`/courses/lectures/${lectureId}`, { isPublic: !currentStatus });
            fetchCourse(true);
            showSuccess(currentStatus ? 'Lecture hidden' : 'Lecture is now Public');
        } catch (error) {
            showError('Error updating visibility');
        }
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // Toggle student broadcasts
    const handleToggleStudentBroadcasts = async () => {
        try {
            const res = await api.put(`/broadcasts/course/${id}/settings`);
            setAllowStudentBroadcasts(res.data.allowStudentBroadcasts);
            showSuccess(res.data.allowStudentBroadcasts ? 'Students can now broadcast' : 'Student broadcasts disabled');
        } catch (error) {
            showError('Error updating broadcast settings');
        }
    };

    // Leave course (for teachers)
    const handleLeaveCourse = async () => {
        if (!window.confirm('Are you sure you want to leave this course? You will lose access to manage this course.')) return;
        try {
            await api.delete(`/courses/${id}/teachers/leave`);
            showSuccess('You have left the course');
            navigate('/dashboard');
        } catch (error) {
            if (!error.handled) {
                showError(error, 'Error leaving course');
            }
        }
    };

    // Toggle AI block for a specific student
    const handleToggleAIBlock = async (studentId) => {
        try {
            const res = await api.put(`/courses/${id}/ai-block/${studentId}`);
            fetchCourse(true);
            showSuccess(res.data.blocked ? 'Student blocked from using your AI key' : 'Student AI access restored');
        } catch (error) {
            showError('Failed to update AI block');
        }
    };

    // Open AI chat viewer drawer for a student
    const handleViewStudentAIChats = async (student) => {
        setAiChatViewStudent(student);
        setAiChatSelectedConv(null);
        setAiChatConversations([]);
        setAiChatDrawerOpen(true);
        setAiChatLoading(true);
        try {
            const res = await api.get(`/ai/course/${id}/student-conversations`);
            const filtered = res.data.filter(c => c.user?._id === student._id || c.user === student._id);
            setAiChatConversations(filtered);
        } catch {
            showError('Failed to load student conversations');
        } finally {
            setAiChatLoading(false);
        }
    };

    // Toggle student AI access
    const handleToggleStudentAI = async () => {
        try {
            const res = await api.put(`/courses/${id}/toggle-student-ai`);
            fetchCourse(true);
            showSuccess(res.data.allowStudentAI ? 'Students can now use your AI key' : 'Student AI access disabled');
        } catch (error) {
            showError('Error updating AI access setting');
        }
    };

    // Toggle peer progress setting
    const handleTogglePeerProgress = async () => {
        try {
            const newValue = !course.allowPeerProgress;
            await api.put(`/courses/${id}`, { allowPeerProgress: newValue });
            setCourse({ ...course, allowPeerProgress: newValue });
            showSuccess(newValue ? 'Students can now view peer progress' : 'Peer progress viewing disabled');
        } catch (err) {
            showError('Failed to update setting');
        }
    };

    if (!course) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading Course...</div>;

    // Render Broadcasts Tab Content (using shared component)
    const renderBroadcastsTab = () => {
        if (!broadcastsLoaded) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
                </div>
            );
        }

        return (
            <BroadcastList
                courseId={id}
                broadcasts={broadcasts}
                pagination={broadcastPagination}
                currentPage={broadcastPage}
                onPageChange={fetchBroadcasts}
                onRefresh={() => fetchBroadcasts(broadcastPage)}
                canBroadcast={true}
                isOwner={isOwner}
                allowStudentBroadcasts={allowStudentBroadcasts}
                onToggleStudentBroadcasts={handleToggleStudentBroadcasts}
                currentUserId={user?._id}
            />
        );
    };

    // Render Teachers Tab Content
    const renderTeachersTab = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Course Teachers</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage teachers and their permissions for this course</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
                <TeacherManagement
                    courseId={id}
                    canManageTeachers={canManageTeachers}
                    isOwner={isOwner}
                />
            </div>
        </div>
    );



    return (
        <div className={`min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 transition-all duration-300 ${tabLayout === 'vertical' ? `pb-20 md:pb-12 glass-content-area ${sidebarHovered ? 'glass-content-expanded' : ''}` : 'pb-12'}`}>

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-navbar z-30 transition-all duration-300 shadow-sm">
                <div className="container mx-auto px-3 sm:px-4">
                    <div className={`flex items-center justify-between gap-2 transition-all duration-300 ${headerScrolled ? 'py-1.5' : 'py-3 sm:py-4'}`}>
                        <div className="min-w-0 flex-1">
                            <h1 className={`font-bold text-slate-900 dark:text-white leading-tight truncate transition-all duration-300 ${headerScrolled ? 'text-sm' : 'text-base sm:text-lg'}`}>{course.title}</h1>
                            {course.description && (
                                <p className={`text-xs text-slate-500 dark:text-slate-400 line-clamp-1 transition-all duration-300 overflow-hidden ${headerScrolled ? 'max-h-0 opacity-0 mt-0' : 'max-h-10 opacity-100 mt-1 hidden sm:block'}`}>{course.description}</p>
                            )}
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 shrink-0">
                            <button
                                onClick={() => navigate(`/course/${id}`)}
                                className={`flex items-center gap-1 sm:gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-300 ${headerScrolled ? 'px-2 py-1' : 'px-2 sm:px-3 py-1 sm:py-1.5'}`}
                            >
                                <FaEye className="text-slate-400" size={10} /> <span className={`hidden xs:inline transition-all duration-300 ${headerScrolled ? 'sm:inline' : ''}`}>Preview</span>
                            </button>
                            <button
                                onClick={() => navigate(`/admin/course/${id}/analytics`)}
                                className={`flex items-center gap-1 sm:gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-300 ${headerScrolled ? 'px-2 py-1' : 'px-2 sm:px-3 py-1 sm:py-1.5'}`}
                            >
                                <FaChartBar className="text-slate-400" size={10} /> <span className={`hidden xs:inline transition-all duration-300 ${headerScrolled ? 'sm:inline' : ''}`}>Analytics</span>
                            </button>
                            <button
                                onClick={() => navigate(`/admin/course/${id}/settings`)}
                                className={`flex items-center gap-1 sm:gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-[10px] sm:text-xs font-medium hover:opacity-90 transition-all duration-300 ${headerScrolled ? 'px-2 py-1' : 'px-2 sm:px-3 py-1 sm:py-1.5'}`}
                            >
                                <FaCog size={10} /> <span className={`hidden xs:inline transition-all duration-300 ${headerScrolled ? 'sm:inline' : ''}`}>Settings</span>
                            </button>
                        </div>
                    </div>

                    {/* Horizontal Tabs (when horizontal layout) */}
                    {tabLayout === 'horizontal' && (
                        <div className="flex items-center -mb-px overflow-x-auto scrollbar-hide">
                            <div className="flex flex-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const showBadge = tab.id === 'broadcasts' && unreadBroadcastCount > 0;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-1 sm:gap-2 font-medium border-b-2 transition-all duration-300 whitespace-nowrap ${headerScrolled ? 'px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs' : 'px-3 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-sm'} ${activeTab === tab.id
                                                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            <Icon className={`shrink-0 transition-all duration-300 ${headerScrolled ? 'text-[10px] sm:text-xs' : 'text-[12px] sm:text-sm'}`} />
                                            {tab.label}
                                            {showBadge && (
                                                <span className="bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full min-w-[16px] sm:min-w-[18px] text-center">
                                                    {unreadBroadcastCount > 99 ? '99+' : unreadBroadcastCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={toggleTabLayout}
                                className="p-1.5 ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
                                title="Switch to vertical sidebar"
                            >
                                <FaGripVertical size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Teacher Permissions Banner - Compact & Mobile Friendly */}
            {userPermissions.isTeacher && !isOwner && showPermissionsBanner && (
                <div className="container mx-auto px-4 pt-3">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5">
                        <div className="flex items-center justify-between gap-2">
                            {/* Left: Icon + Text */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                                    <FaUserTie className="text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white whitespace-nowrap">You're a Teacher</span>
                                        <span className="hidden sm:inline text-slate-400 dark:text-slate-500">|</span>
                                        <div className="flex flex-wrap gap-1">
                                            {userPermissions.permissions.full_access ? (
                                                <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">
                                                    Full Access
                                                </span>
                                            ) : (
                                                <>
                                                    {userPermissions.permissions.manage_content && (
                                                        <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                                                            Content
                                                        </span>
                                                    )}
                                                    {userPermissions.permissions.manage_students && (
                                                        <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium">
                                                            Students
                                                        </span>
                                                    )}
                                                    {userPermissions.permissions.manage_teachers && (
                                                        <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium">
                                                            Teachers
                                                        </span>
                                                    )}
                                                    {!userPermissions.permissions.manage_content &&
                                                        !userPermissions.permissions.manage_students &&
                                                        !userPermissions.permissions.manage_teachers && (
                                                            <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-medium">
                                                                View Only
                                                            </span>
                                                        )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Right: Actions */}
                            <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                    onClick={handleLeaveCourse}
                                    className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-medium text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                    title="Leave this course"
                                >
                                    <FaSignOutAlt size={10} />
                                    <span className="hidden xs:inline">Leave</span>
                                </button>
                                <button
                                    onClick={() => setShowPermissionsBanner(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
                                    title="Dismiss"
                                >
                                    <FaTimes size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile bottom nav bar when vertical layout is active */}
            {tabLayout === 'vertical' && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 safe-area-bottom">
                    <div className="flex items-stretch">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const showBadge = tab.id === 'broadcasts' && unreadBroadcastCount > 0;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors ${isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-slate-400 dark:text-slate-500'
                                        }`}
                                >
                                    {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
                                    <Icon className="text-[17px]" />
                                    <span className="text-[9px] font-semibold leading-tight">{tab.label}</span>
                                    {showBadge && (
                                        <span className="absolute top-1 right-1/2 translate-x-3 bg-red-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                                            {unreadBroadcastCount > 9 ? '9+' : unreadBroadcastCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        <Link
                            to="/ai-chat"
                            className="relative flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 text-slate-400 dark:text-slate-500"
                        >
                            <FaRobot className="text-[17px]" />
                            <span className="text-[9px] font-semibold leading-tight">AI Chat</span>
                        </Link>
                    </div>
                </div>
            )}

            {/* Vertical Sidebar - Glass effect, icon-only → expands on hover */}
            {tabLayout === 'vertical' && (
                <div
                    className="glass-sidebar hidden md:flex fixed left-0 bottom-0 z-40 flex-col pt-4 pb-4 top-navbar"
                    onMouseEnter={() => setSidebarHovered(true)}
                    onMouseLeave={() => setSidebarHovered(false)}
                >
                    <div className="flex flex-col gap-1 flex-1 px-1.5">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const showBadge = tab.id === 'broadcasts' && unreadBroadcastCount > 0;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`glass-nav-item relative ${isActive
                                        ? 'glass-nav-active text-white'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                        }`}
                                >
                                    <Icon className="glass-nav-icon text-[18px]" />
                                    <span className="glass-nav-label text-[12px] font-semibold">{tab.label}</span>
                                    {showBadge && (
                                        <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                                            {unreadBroadcastCount > 9 ? '9+' : unreadBroadcastCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex flex-col gap-1 px-1.5">
                        <Link
                            to="/ai-chat"
                            className="glass-nav-item text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="AI Chat Assistant"
                        >
                            <FaRobot className="glass-nav-icon text-[18px]" />
                            <span className="glass-nav-label text-[12px] font-semibold">AI Chat</span>
                        </Link>
                        <button
                            onClick={toggleTabLayout}
                            className="glass-nav-item text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400"
                            title="Switch to horizontal tabs"
                        >
                            <FaGripHorizontal className="glass-nav-icon text-sm" />
                            <span className="glass-nav-label text-[11px] font-medium">Layout</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Content */}
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
                {activeTab === 'curriculum' && (
                    <CurriculumTab
                        courseId={id}
                        course={course}
                        expandedSections={expandedSections}
                        toggleSection={toggleSection}
                        isOwner={isOwner}
                        userPermissions={userPermissions}
                        onOpenSectionModal={() => {
                            setEditingSectionId(null);
                            setNewSectionTitle('');
                            setNewSectionIsPublic(true);
                            setNewSectionIsPreview(false);
                            setNewSectionImportance('');
                            setIsSectionModalOpen(true);
                        }}
                        onEditSection={(section) => {
                            setEditingSectionId(section._id);
                            setNewSectionTitle(section.title);
                            setNewSectionIsPublic(section.isPublic);
                            setNewSectionIsPreview(section.isPreview || false);
                            setNewSectionImportance(section.importance || '');
                            setIsSectionModalOpen(true);
                        }}
                        onDeleteSection={handleDeleteSection}
                        onToggleSectionVisibility={handleToggleSectionVisibility}
                        onOpenLectureModal={(sectionId, nextNum) => {
                            setActiveSectionId(sectionId);
                            setEditingLectureId(null);
                            setNewLecture({ title: '', number: nextNum, resourceUrl: '', description: '', dueDate: '', status: 'Pending', isPublic: true, importance: '' });
                            setIsLectureModalOpen(true);
                        }}
                        onEditLecture={(lec, sectionId) => {
                            handleEditClick(lec, sectionId);
                            setIsLectureModalOpen(true);
                        }}
                        onDeleteLecture={handleDeleteLecture}
                        onToggleLectureVisibility={handleToggleLectureVisibility}
                        onTogglePeerProgress={handleTogglePeerProgress}
                        onToggleStudentAI={handleToggleStudentAI}
                        selectedStudentId={selectedStudentId}
                        selectedStudentName={selectedStudentName}
                        studentProgressData={studentProgressData}
                        studentProgressLoading={studentProgressLoading}
                        sectionProgressMap={sectionProgressMap}
                        lectureProgressMap={lectureProgressMap}
                        onSelectStudent={(studentId, name) => {
                            setSelectedStudentId(studentId);
                            setSelectedStudentName(name);
                        }}
                        onClearStudent={() => {
                            setSelectedStudentId(null);
                            setSelectedStudentName('');
                            setStudentProgressData(null);
                        }}
                        getProgressStatusIcon={getProgressStatusIcon}
                        getProgressStatusColor={getProgressStatusColor}
                        onSendNotification={() => setIsNotifModalOpen(true)}
                    />
                )}
                {activeTab === 'broadcasts' && renderBroadcastsTab()}
                {activeTab === 'students' && (
                    <StudentsTab
                        courseId={id}
                        course={course}
                        onViewStudentAIChats={handleViewStudentAIChats}
                        onToggleAIBlock={handleToggleAIBlock}
                    />
                )}
                {activeTab === 'teachers' && renderTeachersTab()}
                {activeTab === 'resources' && <ResourceManager courseId={id} isTeacher={true} sections={course?.sections || []} />}
                {activeTab === 'ai-notes' && <AINotesGenerator courseId={id} />}
            </div>

            {/* Section Modal */}
            <Modal
                isOpen={isSectionModalOpen}
                onClose={() => setIsSectionModalOpen(false)}
                title={editingSectionId ? "Edit Section" : "Add New Section"}
            >
                <form onSubmit={(e) => {
                    handleSaveSection(e);
                    setIsSectionModalOpen(false);
                }} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Visible to Students</label>
                        <button
                            type="button"
                            onClick={() => setNewSectionIsPublic(!newSectionIsPublic)}
                            className={`w-9 h-5 rounded-full flex items-center transition-colors px-1 ${newSectionIsPublic ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${newSectionIsPublic ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Section Title</label>
                        <input
                            type="text"
                            className="w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-white"
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            placeholder="e.g. Introduction to React"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2 px-1 mb-2">
                        <input
                            type="checkbox"
                            id="isSectionPreview"
                            checked={newSectionIsPreview}
                            onChange={(e) => setNewSectionIsPreview(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="isSectionPreview" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer">
                            Free Preview Section
                        </label>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Importance</label>
                        <select
                            className="w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-white"
                            value={newSectionImportance}
                            onChange={(e) => setNewSectionImportance(e.target.value)}
                        >
                            <option value="">None</option>
                            <option value="Optional">Optional</option>
                            <option value="Normal">Normal</option>
                            <option value="Important">Important</option>
                            <option value="Very Important">Very Important</option>
                        </select>
                    </div>

                    {/* Auto-broadcast toggle — only for new sections */}
                    {!editingSectionId && (
                        <div className={`rounded-lg border transition-colors ${sectionBroadcast.enabled ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50'}`}>
                            <button
                                type="button"
                                onClick={() => setSectionBroadcast(prev => ({
                                    ...prev,
                                    enabled: !prev.enabled,
                                    message: !prev.enabled ? `📚 New section added: "${newSectionTitle}"` : prev.message
                                }))}
                                className="w-full flex items-center justify-between px-4 py-3"
                            >
                                <div className="flex items-center gap-2.5">
                                    <FaBullhorn className={`text-sm ${sectionBroadcast.enabled ? 'text-indigo-500' : 'text-slate-400'}`} />
                                    <span className={`text-xs font-bold uppercase tracking-wide ${sectionBroadcast.enabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        Notify Students via Broadcast
                                    </span>
                                </div>
                                <div className={`w-9 h-5 rounded-full flex items-center px-1 transition-colors ${sectionBroadcast.enabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${sectionBroadcast.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>
                            {sectionBroadcast.enabled && (
                                <div className="px-4 pb-4 space-y-3 border-t border-indigo-200 dark:border-indigo-800/50 pt-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Message</label>
                                        <textarea
                                            rows={2}
                                            className="w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                            placeholder="Broadcast message..."
                                            value={sectionBroadcast.message}
                                            onChange={(e) => setSectionBroadcast(prev => ({ ...prev, message: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Priority</label>
                                        <select
                                            className="w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            value={sectionBroadcast.priority}
                                            onChange={(e) => setSectionBroadcast(prev => ({ ...prev, priority: e.target.value }))}
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="important">Important</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all transform hover:-translate-y-0.5">
                            {editingSectionId ? "Update Section" : "Add Section"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Lecture Modal */}
            <Modal
                isOpen={isLectureModalOpen}
                onClose={() => setIsLectureModalOpen(false)}
                title={editingLectureId ? 'Edit Lecture' : 'New Lecture'}
            >
                <form onSubmit={(e) => { handleSaveLecture(e); setIsLectureModalOpen(false); }} className="space-y-5">

                    {/* Row 1: Number + Title */}
                    <div className="flex gap-3">
                        <div className="w-20 flex-shrink-0">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">#</label>
                            <input
                                type="number"
                                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                value={newLecture.number}
                                onChange={(e) => setNewLecture({ ...newLecture, number: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Title *</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                value={newLecture.title}
                                onChange={(e) => {
                                    const title = e.target.value;
                                    setNewLecture({ ...newLecture, title });
                                    if (lectureBroadcast.enabled) {
                                        const sectionTitle = course?.sections?.find(s => s._id === activeSectionId)?.title || '';
                                        const expectedMsg = `🎬 New lecture added: "${newLecture.title}"${sectionTitle ? ` in "${sectionTitle}"` : ''}`;
                                        if (lectureBroadcast.message === expectedMsg) {
                                            setLectureBroadcast(prev => ({ ...prev, message: `🎬 New lecture added: "${title}"${sectionTitle ? ` in "${sectionTitle}"` : ''}` }));
                                        }
                                    }
                                }}
                                placeholder="Lecture title..."
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Resource URL + Due Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Resource URL</label>
                            <input
                                type="url"
                                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                value={newLecture.resourceUrl}
                                onChange={(e) => setNewLecture({ ...newLecture, resourceUrl: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Due Date</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                value={newLecture.dueDate}
                                onChange={(e) => setNewLecture({ ...newLecture, dueDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Row 3: Description */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Description</label>
                        <textarea
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                            value={newLecture.description}
                            onChange={(e) => setNewLecture({ ...newLecture, description: e.target.value })}
                            placeholder="What will students learn in this lecture?"
                        />
                    </div>

                    {/* Row 4: Importance pills */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Importance</label>
                        <div className="flex flex-wrap gap-2">
                            {[{ value: '', label: 'Inherit' }, { value: 'None', label: 'None' }, { value: 'Optional', label: 'Optional' }, { value: 'Normal', label: 'Normal' }, { value: 'Important', label: 'Important' }, { value: 'Very Important', label: 'Very Important' }].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setNewLecture({ ...newLecture, importance: opt.value })}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${(newLecture.importance || '') === opt.value
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Row 5: Toggles — Visible & Free Preview */}
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setNewLecture({ ...newLecture, isPublic: !newLecture.isPublic })}
                            className="flex items-center gap-2 flex-1"
                        >
                            <div className={`w-8 h-4.5 h-[18px] rounded-full flex items-center px-0.5 transition-colors ${newLecture.isPublic ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${newLecture.isPublic ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                            </div>
                            <span className={`text-xs font-semibold ${newLecture.isPublic ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                                Visible to Students
                            </span>
                        </button>
                        <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
                        <button
                            type="button"
                            onClick={() => setNewLecture({ ...newLecture, isPreview: !newLecture.isPreview })}
                            className="flex items-center gap-2 flex-1"
                        >
                            <div className={`w-8 h-[18px] rounded-full flex items-center px-0.5 transition-colors ${newLecture.isPreview ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${newLecture.isPreview ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                            </div>
                            <span className={`text-xs font-semibold ${newLecture.isPreview ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                                Free Preview
                            </span>
                        </button>
                    </div>

                    {/* Row 6: Auto-broadcast — only for new lectures */}
                    {!editingLectureId && (
                        <div className={`rounded-lg border transition-all ${lectureBroadcast.enabled ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800'}`}>
                            <button
                                type="button"
                                onClick={() => {
                                    const sectionTitle = course?.sections?.find(s => s._id === activeSectionId)?.title || '';
                                    setLectureBroadcast(prev => ({
                                        ...prev,
                                        enabled: !prev.enabled,
                                        message: !prev.enabled ? `🎬 New lecture added: "${newLecture.title}"${sectionTitle ? ` in "${sectionTitle}"` : ''}` : prev.message
                                    }));
                                }}
                                className="w-full flex items-center justify-between px-4 py-3"
                            >
                                <div className="flex items-center gap-2.5">
                                    <FaBullhorn className={`text-sm ${lectureBroadcast.enabled ? 'text-indigo-500' : 'text-slate-400'}`} />
                                    <span className={`text-xs font-bold uppercase tracking-wide ${lectureBroadcast.enabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        Notify Students via Broadcast
                                    </span>
                                </div>
                                <div className={`w-9 h-5 rounded-full flex items-center px-1 transition-colors ${lectureBroadcast.enabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${lectureBroadcast.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>
                            {lectureBroadcast.enabled && (
                                <div className="px-4 pb-4 space-y-3 border-t border-indigo-200 dark:border-indigo-800/50 pt-3">
                                    <textarea
                                        rows={2}
                                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                        placeholder="Broadcast message..."
                                        value={lectureBroadcast.message}
                                        onChange={(e) => setLectureBroadcast(prev => ({ ...prev, message: e.target.value }))}
                                    />
                                    <div className="flex gap-2">
                                        {['normal', 'important', 'urgent'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setLectureBroadcast(prev => ({ ...prev, priority: p }))}
                                                className={`flex-1 py-1.5 rounded-full text-xs font-bold capitalize border transition-all ${lectureBroadcast.priority === p
                                                    ? p === 'urgent' ? 'bg-red-500 border-red-500 text-white'
                                                        : p === 'important' ? 'bg-amber-500 border-amber-500 text-white'
                                                            : 'bg-indigo-500 border-indigo-500 text-white'
                                                    : 'border-gray-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end pt-1">
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg transition-all transform hover:-translate-y-0.5">
                            {editingLectureId ? 'Update Lecture' : 'Save Lecture'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Send Notification Modal */}
            <Modal
                isOpen={isNotifModalOpen}
                onClose={() => setIsNotifModalOpen(false)}
                title="Send Notification"
            >
                <div className="space-y-4">
                    {/* Target: All or Specific */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Send To</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setNotifTarget('all'); setNotifSelectedStudents([]); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${notifTarget === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'border-gray-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'}`}>
                                All Students
                            </button>
                            <button type="button" onClick={() => setNotifTarget('specific')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${notifTarget === 'specific' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'border-gray-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'}`}>
                                Specific Students
                            </button>
                        </div>
                    </div>

                    {/* Student Picker (when specific) */}
                    {notifTarget === 'specific' && (
                        <div>
                            {/* Selected chips */}
                            {notifSelectedStudents.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {notifSelectedStudents.map(s => (
                                        <span key={s._id} className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium px-2 py-1 rounded-full">
                                            {s.name}
                                            <button onClick={() => setNotifSelectedStudents(prev => prev.filter(x => x._id !== s._id))} className="hover:text-red-500 transition-colors">
                                                <FaTimes size={8} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* Search */}
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                                <input
                                    type="text"
                                    value={notifStudentSearch}
                                    onChange={(e) => setNotifStudentSearch(e.target.value)}
                                    placeholder="Search students..."
                                    className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            {/* Student list */}
                            <div className="max-h-36 overflow-y-auto mt-2 border border-gray-200 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-800">
                                {notifStudentList.length > 0 ? notifStudentList.map(s => {
                                    const isSelected = notifSelectedStudents.some(x => x._id === s._id);
                                    return (
                                        <button key={s._id} onClick={() => {
                                            if (isSelected) {
                                                setNotifSelectedStudents(prev => prev.filter(x => x._id !== s._id));
                                            } else {
                                                setNotifSelectedStudents(prev => [...prev, { _id: s._id, name: s.name, email: s.email }]);
                                            }
                                        }} className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-slate-600'}`}>
                                                {isSelected && <FaCheck size={8} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                                            </div>
                                        </button>
                                    );
                                }) : (
                                    <div className="px-3 py-4 text-xs text-slate-400 text-center">No students found</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Title *</label>
                        <input
                            type="text"
                            value={notifTitle}
                            onChange={(e) => setNotifTitle(e.target.value)}
                            placeholder="Notification title..."
                            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Message</label>
                        <textarea
                            rows={3}
                            value={notifMessage}
                            onChange={(e) => setNotifMessage(e.target.value)}
                            placeholder="Optional message..."
                            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Priority</label>
                        <div className="flex gap-2">
                            {['normal', 'important', 'urgent'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setNotifPriority(p)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize border transition-all ${notifPriority === p
                                        ? p === 'urgent' ? 'bg-red-500 border-red-500 text-white'
                                        : p === 'important' ? 'bg-amber-500 border-amber-500 text-white'
                                        : 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'border-gray-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleSendNotification}
                        disabled={sendingNotif || !notifTitle.trim() || (notifTarget === 'specific' && notifSelectedStudents.length === 0)}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaPaperPlane size={12} /> {sendingNotif ? 'Sending...' : notifTarget === 'specific' ? `Send to ${notifSelectedStudents.length} Student(s)` : 'Send to All Students'}
                    </button>
                </div>
            </Modal>

            {/* AI Chat Viewer Drawer */}
            {aiChatDrawerOpen && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAiChatDrawerOpen(false)} />

                    {/* Drawer */}
                    <div className="relative ml-auto w-full max-w-3xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <FaRobot className="text-indigo-500" size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {aiChatViewStudent?.name}'s AI Conversations
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">{aiChatViewStudent?.email} · Using your API key</p>
                            </div>
                            <button onClick={() => setAiChatDrawerOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                                <FaTimes size={16} />
                            </button>
                        </div>

                        <div className="flex flex-1 min-h-0">
                            {/* Conversation List */}
                            <div className="w-56 shrink-0 border-r border-gray-200 dark:border-slate-800 flex flex-col">
                                <div className="px-3 py-2.5 border-b border-gray-100 dark:border-slate-800">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Conversations</p>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {aiChatLoading ? (
                                        <div className="flex items-center justify-center py-10">
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : aiChatConversations.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                            <FaComments className="text-slate-300 dark:text-slate-600 mb-2" size={24} />
                                            <p className="text-xs text-slate-400">No conversations yet</p>
                                            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">Student hasn't used your AI key</p>
                                        </div>
                                    ) : (
                                        aiChatConversations.map(conv => (
                                            <button
                                                key={conv._id}
                                                onClick={() => setAiChatSelectedConv(conv)}
                                                className={`w-full text-left px-3 py-3 border-b border-gray-100 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${aiChatSelectedConv?._id === conv._id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500' : ''}`}
                                            >
                                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{conv.title || 'Untitled'}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{conv.messages?.length || 0} messages · {new Date(conv.updatedAt).toLocaleDateString()}</p>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Messages Panel */}
                            <div className="flex-1 flex flex-col min-w-0">
                                {!aiChatSelectedConv ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                                        <FaChevronRight className="text-slate-200 dark:text-slate-700 mb-3" size={28} />
                                        <p className="text-sm text-slate-400">Select a conversation</p>
                                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">to view messages</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{aiChatSelectedConv.title}</p>
                                            <p className="text-[10px] text-slate-400">{aiChatSelectedConv.messages?.length || 0} messages · Read-only</p>
                                        </div>
                                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                                            {(aiChatSelectedConv.messages || []).map((msg, i) => (
                                                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                        {msg.role === 'user' ? <FaUser size={10} /> : <FaRobot size={10} />}
                                                    </div>
                                                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-sm'}`}>
                                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManage;
