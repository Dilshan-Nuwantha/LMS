import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { FaPlayCircle, FaBook, FaCheckCircle, FaChevronDown, FaChevronUp, FaBullhorn, FaClipboardList, FaTrophy, FaClock, FaRedo, FaLock, FaUnlock, FaRobot, FaUserGraduate, FaSearch, FaTimes, FaGripVertical, FaGripHorizontal, FaChartLine, FaFolderOpen, FaBookmark } from 'react-icons/fa';
import BroadcastList from '../../components/broadcast/BroadcastList';
import AIChatPanel from '../../components/chat/AIChatPanel';
import StudentAnalytics from '../../components/course/StudentAnalytics';
import ResourceManager from '../../components/course/ResourceManager';
import AuthContext from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';

const StudentCourseDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'content';
    const { user } = useContext(AuthContext);

    // Tab layout orientation (vertical sidebar or horizontal tabs)
    const [tabLayout, setTabLayout] = useState(() => {
        return localStorage.getItem('studentCourseTabLayout') || 'vertical';
    });
    const toggleTabLayout = () => {
        const next = tabLayout === 'vertical' ? 'horizontal' : 'vertical';
        setTabLayout(next);
        localStorage.setItem('studentCourseTabLayout', next);
    };

    const [sidebarHovered, setSidebarHovered] = useState(false);

    const [course, setCourse] = useState(null);
    const [progressMap, setProgressMap] = useState({});
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});

    // Curriculum filters (student)
    const [currStatus, setCurrStatus] = useState('all');
    const [currImportance, setCurrImportance] = useState('all');
    const [lectureSearch, setLectureSearch] = useState('');

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
    const [canBroadcast, setCanBroadcast] = useState(false);
    const [broadcastPage, setBroadcastPage] = useState(1);
    const [broadcastPagination, setBroadcastPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0);

    // Revision badge toggle (controls the count badge on the Revision tab)
    const [showRevisionCountBadge, setShowRevisionCountBadge] = useState(true);

    // Quiz State
    const [quizzes, setQuizzes] = useState([]);
    const [quizzesLoaded, setQuizzesLoaded] = useState(false);

    // Peer Progress State
    const [showPeerSelector, setShowPeerSelector] = useState(false);
    const [peerList, setPeerList] = useState([]);
    const [peerListLoading, setPeerListLoading] = useState(false);
    const [peerKeyword, setPeerKeyword] = useState('');
    const [debouncedPeerKeyword, setDebouncedPeerKeyword] = useState('');
    const [selectedPeerId, setSelectedPeerId] = useState(null);
    const [selectedPeerName, setSelectedPeerName] = useState('');
    const [peerProgressData, setPeerProgressData] = useState(null);
    const [peerProgressLoading, setPeerProgressLoading] = useState(false);
    const peerSelectorRef = useRef(null);

    // Debounce peer search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedPeerKeyword(peerKeyword), 400);
        return () => clearTimeout(timer);
    }, [peerKeyword]);

    // Fetch peer list when selector opens
    useEffect(() => {
        if (showPeerSelector && course?.allowPeerProgress) {
            setPeerListLoading(true);
            api.get(`/courses/${id}/peers?keyword=${debouncedPeerKeyword}`)
                .then(res => setPeerList(res.data || []))
                .catch(() => setPeerList([]))
                .finally(() => setPeerListLoading(false));
        }
    }, [showPeerSelector, debouncedPeerKeyword]);

    // Fetch peer progress when selected
    useEffect(() => {
        if (selectedPeerId) {
            setPeerProgressLoading(true);
            api.get(`/courses/${id}/peers/${selectedPeerId}/progress`)
                .then(res => setPeerProgressData(res.data))
                .catch(() => setPeerProgressData(null))
                .finally(() => setPeerProgressLoading(false));
        } else {
            setPeerProgressData(null);
        }
    }, [selectedPeerId]);

    // Close peer selector on outside click
    useEffect(() => {
        if (!showPeerSelector) return;
        const handler = (e) => { if (peerSelectorRef.current && !peerSelectorRef.current.contains(e.target)) setShowPeerSelector(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPeerSelector]);

    // Build peer progress lookup maps
    const peerLectureMap = {};
    const peerSectionMap = {};
    if (peerProgressData) {
        peerProgressData.sections?.forEach(section => {
            peerSectionMap[section._id] = {
                completedCount: section.completedCount,
                totalCount: section.totalCount,
                progressPercent: section.progressPercent
            };
            section.lectures?.filter(l => l.isPublic !== false).forEach(lec => {
                peerLectureMap[lec._id] = { status: lec.status };
            });
        });
    }

    // Count of lectures marked for revision
    const revisionCount = Object.values(progressMap).filter(p => p.markedForRevision).length;

    // Tab definitions
    const tabs = [
        { id: 'content', label: 'Content', icon: FaBook },
        { id: 'revision', label: 'Revision', icon: FaBookmark, badge: showRevisionCountBadge && revisionCount > 0 ? revisionCount : null },
        { id: 'quizzes', label: 'Quizzes', icon: FaClipboardList },
        { id: 'announcements', label: 'Announcements', icon: FaBullhorn },
        { id: 'resources', label: 'Resources', icon: FaFolderOpen },
        { id: 'analytics', label: 'Analytics', icon: FaChartLine },
        { id: 'ai-assistant', label: 'AI Assistant', icon: FaRobot },
    ];

    // Tab change handler
    const handleTabChange = (tabId) => {
        setSearchParams({ tab: tabId });
    };

    // Toggle Section Logic
    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // Set Document Title
    useEffect(() => {
        if (course) {
            document.title = `Skill Path | ${course.title}`;
        }
        return () => {
            document.title = 'Skill Path';
        };
    }, [course]);

    // Fetch Course & Progress (initial load - optimized with parallel requests)
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch course details and progress in parallel (optimized)
                // Wrap progress/unread calls to prevent page crash if they fail (e.g. not enrolled/logged in)
                const [courseRes, progressRes, unreadRes] = await Promise.all([
                    api.get(`/courses/${id}`),
                    api.get(`/courses/${id}/my-progress`).catch(() => ({ data: null })),
                    api.get(`/broadcasts/course/${id}/unread-count`).catch(() => ({ data: { unreadCount: 0 } }))
                ]);

                // 1. Set Course Details
                setCourse(courseRes.data);

                // All sections collapsed by default
                if (courseRes.data.sections) {
                    const initialExpanded = {};
                    courseRes.data.sections.forEach(sec => initialExpanded[sec._id] = false);
                    setExpandedSections(initialExpanded);
                }

                // 2. Set Student's Progress (from optimized endpoint)
                if (progressRes.data && progressRes.data.completedLectures) {
                    setIsEnrolled(true);
                    const map = {};
                    progressRes.data.completedLectures.forEach(item => {
                        map[item.lecture] = {
                            status: item.status,
                            completedAt: item.completedAt,
                            markedForRevision: item.markedForRevision || false
                        };
                    });
                    setProgressMap(map);
                }

                // 3. Set unread broadcast count
                setUnreadBroadcastCount(unreadRes.data.unreadCount || 0);
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        };
        fetchData();
    }, [id]);

    // Lazy load broadcasts when announcements tab is activated
    useEffect(() => {
        if (activeTab === 'announcements' && id) {
            if (!broadcastsLoaded) {
                fetchBroadcasts();
                fetchBroadcastPermission();
            }
            // Mark broadcasts as read when viewing the tab
            if (unreadBroadcastCount > 0) {
                markBroadcastsAsRead();
            }
        }
        // Lazy load quizzes when quizzes tab is activated
        if (activeTab === 'quizzes' && id && !quizzesLoaded) {
            fetchQuizzes();
        }
    }, [activeTab, broadcastsLoaded, id, unreadBroadcastCount, quizzesLoaded]);

    // Fetch quizzes for this course
    const fetchQuizzes = async () => {
        try {
            const res = await api.get(`/quizzes/course/${id}`);
            setQuizzes(res.data);
            setQuizzesLoaded(true);
        } catch (err) {
            console.error("Failed to fetch quizzes", err);
        }
    };

    // Fetch broadcast permission
    const fetchBroadcastPermission = async () => {
        try {
            const permRes = await api.get(`/broadcasts/course/${id}/can-broadcast`);
            setCanBroadcast(permRes.data.canBroadcast);
        } catch (err) {
            console.error("Failed to check broadcast permission", err);
        }
    };

    // Fetch broadcasts
    const fetchBroadcasts = async (page = 1) => {
        try {
            const res = await api.get(`/broadcasts/course/${id}/active?page=${page}&limit=5`);
            setBroadcasts(res.data.broadcasts);
            setBroadcastPagination(res.data.pagination);
            setBroadcastPage(page);
            setBroadcastsLoaded(true);
        } catch (err) {
            console.error("Failed to fetch broadcasts", err);
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

    // Find the lecture to resume from (last accessed, then next if completed)
    const getResumeLecture = () => {
        if (!course?.sections) return null;
        const completionLabel = course.completedStatus || 'Completed';
        const allLectures = [];
        for (const sec of course.sections) {
            if (!sec.isPublic) continue;
            for (const lec of sec.lectures) {
                allLectures.push(lec);
            }
        }
        if (allLectures.length === 0) return null;

        // No progress yet — start from first lecture
        if (Object.keys(progressMap).length === 0) return allLectures[0];

        // Find the most recently accessed lecture by completedAt timestamp
        let lastAccessedId = null;
        let latestTime = 0;
        for (const [lecId, progress] of Object.entries(progressMap)) {
            const t = progress.completedAt ? new Date(progress.completedAt).getTime() : 0;
            if (t >= latestTime) {
                latestTime = t;
                lastAccessedId = lecId;
            }
        }

        const lastIdx = allLectures.findIndex(l => l._id === lastAccessedId);
        if (lastIdx === -1) return allLectures[0];

        // If that lecture is fully completed, go to the next one
        const lastStatus = progressMap[lastAccessedId]?.status;
        if (lastStatus === completionLabel && lastIdx < allLectures.length - 1) {
            return allLectures[lastIdx + 1];
        }

        // Otherwise resume at that lecture
        return allLectures[lastIdx];
    };

    const hasAnyProgress = () => {
        return Object.keys(progressMap).length > 0;
    };

    const getProgressStats = () => {
        if (!course) return { completed: 0, total: 0, percent: 0 };
        let totalLectures = 0;
        course.sections.forEach(s => {
            if (s.isPublic !== false) totalLectures += s.lectures.filter(l => l.isPublic !== false).length;
        });

        let completed = 0;
        const completionLabel = course.completedStatus || 'Completed';
        course.sections.forEach(s => {
            if (s.isPublic !== false) {
                s.lectures.filter(l => l.isPublic !== false).forEach(l => {
                    if (progressMap[l._id]?.status === completionLabel) completed++;
                });
            }
        });

        const percent = totalLectures === 0 ? 0 : Math.round((completed / totalLectures) * 100);
        return { completed, total: totalLectures, percent };
    };

    // Render Content Tab (Curriculum + Progress)
    const renderContentTab = () => {
        const stats = getProgressStats();

        // Determine progress color based on percentage
        const getProgressColor = () => {
            if (stats.percent >= 80) return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-900/30', light: 'bg-green-50 dark:bg-green-900/10' };
            if (stats.percent >= 50) return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/30', light: 'bg-blue-50 dark:bg-blue-900/10' };
            if (stats.percent >= 20) return { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/30', light: 'bg-amber-50 dark:bg-amber-900/10' };
            return { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-900/30', light: 'bg-purple-50 dark:bg-purple-900/10' };
        };

        const getEncouragingMessage = () => {
            if (stats.percent === 100) return "🎉 Course completed! Well done!";
            if (stats.percent >= 80) return "Almost there! Keep pushing forward!";
            if (stats.percent >= 50) return "Great job! You're halfway through!";
            if (stats.percent >= 20) return "Nice start! Keep the momentum going!";
            return "Let's begin your learning journey!";
        };

        const colors = getProgressColor();

        return (
            <div className="space-y-3 sm:space-y-4">
                {/* Progress Card - Compact and prominent */}
                <div className={`bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-lg sm:rounded-xl border ${colors.border} p-3 sm:p-4 shadow-sm hover:shadow transition-all duration-200`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Progress Circle - Smaller */}
                        <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full ${colors.light} flex items-center justify-center shrink-0`}>
                            <div className="text-center">
                                <div className={`text-lg sm:text-xl font-bold ${colors.text}`}>{stats.percent}%</div>
                            </div>
                            {/* Circular progress indicator */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="5"
                                    className="text-gray-200 dark:text-slate-700"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="5"
                                    strokeDasharray={`${stats.percent * 2.827} 283`}
                                    strokeLinecap="round"
                                    className={colors.text.replace('text-', 'stroke-')}
                                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                />
                            </svg>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                            <div>
                                <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your Progress</h2>
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{stats.completed} of {stats.total} Lectures</p>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                                <div
                                    className={`h-full ${colors.bg} rounded-full transition-all duration-500 ease-out`}
                                    style={{ width: `${stats.percent}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {getEncouragingMessage()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Peer Progress Selector */}
                {course.allowPeerProgress && isEnrolled && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg" ref={peerSelectorRef}>
                        {!selectedPeerId ? (
                            <div className="relative flex items-center justify-between gap-2 px-4 py-2.5">
                                <button
                                    onClick={() => { setShowPeerSelector(!showPeerSelector); setPeerKeyword(''); }}
                                    className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                                >
                                    <FaUserGraduate className="text-purple-500" size={12} />
                                    <span>View Peer Progress</span>
                                    <FaChevronDown className={`text-slate-400 text-[9px] transition-transform ${showPeerSelector ? 'rotate-180' : ''}`} />
                                </button>
                                {showPeerSelector && (
                                    <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-30 overflow-hidden">
                                        <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                                            <div className="relative">
                                                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                                                <input
                                                    type="text"
                                                    placeholder="Search peers..."
                                                    value={peerKeyword}
                                                    onChange={(e) => setPeerKeyword(e.target.value)}
                                                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {peerListLoading ? (
                                                <div className="flex items-center justify-center py-5 gap-2 text-xs text-slate-400">
                                                    <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                                    Loading students...
                                                </div>
                                            ) : peerList.length > 0 ? peerList.map(s => (
                                                <button
                                                    key={s._id}
                                                    onClick={() => { setSelectedPeerId(s._id); setSelectedPeerName(s.name); setShowPeerSelector(false); }}
                                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                        {s.name?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</span>
                                                </button>
                                            )) : (
                                                <div className="px-3 py-4 text-xs text-slate-400 text-center italic">No students found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2.5">
                                <FaUserGraduate className="text-purple-500 shrink-0" size={12} />
                                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{selectedPeerName}</span>
                                    {peerProgressData && (
                                        <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                            {peerProgressData.progress.completedLectures}/{peerProgressData.progress.totalLectures} completed ({peerProgressData.progress.progressPercent}%)
                                        </span>
                                    )}
                                    {peerProgressLoading && <span className="text-[10px] text-purple-500 animate-pulse">Loading...</span>}
                                </div>
                                <button
                                    onClick={() => { setSelectedPeerId(null); setSelectedPeerName(''); }}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                                >
                                    <FaTimes size={11} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Curriculum Section */}
                <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-end justify-between border-b border-gray-200 dark:border-slate-800 pb-3 sm:pb-4">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Curriculum</h2>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{course.sections.length} Sections</span>
                    </div>

                    {/* Curriculum Search */}
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
                        <input
                            type="text"
                            placeholder="Search sections or lectures..."
                            value={lectureSearch}
                            onChange={(e) => setLectureSearch(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-colors"
                        />
                    </div>

                    {/* Curriculum Filters */}
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                        {/* Status Group — dynamic from course.lectureStatuses */}
                        <div className="flex items-center shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mr-1">Status</span>
                            {[
                                { v: 'all', l: 'All' },
                                { v: 'not-started', l: 'Not Started' },
                                ...(course.lectureStatuses || []).filter(s => s.label !== 'Not Started').map(s => ({ v: s.label, l: s.label })),
                                { v: 'revision', l: `Revision${revisionCount > 0 ? ` (${revisionCount})` : ''}` }
                            ].map(f => (
                                <button key={f.v} onClick={() => setCurrStatus(f.v)}
                                    className={`px-3 py-2.5 text-[11px] sm:text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${currStatus === f.v
                                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                    {f.l}
                                </button>
                            ))}
                        </div>
                        {/* Importance Group */}
                        <div className="flex items-center shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mr-1">Importance</span>
                            {[{ v: 'all', l: 'All' }, { v: 'Very Important', l: 'Critical' }, { v: 'Important', l: 'Important' }, { v: 'Normal', l: 'Normal' }, { v: 'Optional', l: 'Optional' }].map(f => (
                                <button key={f.v} onClick={() => setCurrImportance(f.v)}
                                    className={`px-3 py-2.5 text-[11px] sm:text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${currImportance === f.v
                                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                    {f.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {course.sections && course.sections.length > 0 ? (
                            course.sections.filter(section => section.isPublic).filter(section => {
                                const visibleLectures = section.lectures ? section.lectures.filter(l => l.isPublic !== false) : [];
                                // Status filter
                                if (currStatus === 'not-started') {
                                    const has = visibleLectures.some(l => !progressMap[l._id]?.status || progressMap[l._id]?.status === 'Not Started');
                                    if (!has) return false;
                                } else if (currStatus === 'revision') {
                                    const has = visibleLectures.some(l => progressMap[l._id]?.markedForRevision);
                                    if (!has) return false;
                                } else if (currStatus !== 'all') {
                                    const has = visibleLectures.some(l => progressMap[l._id]?.status === currStatus);
                                    if (!has) return false;
                                }
                                // Importance filter — section-level only
                                if (currImportance !== 'all') {
                                    const secImp = section.importance || '';
                                    if (secImp !== currImportance) return false;
                                }
                                // Search filter
                                if (lectureSearch.trim()) {
                                    const q = lectureSearch.trim().toLowerCase();
                                    const titleMatch = section.title.toLowerCase().includes(q);
                                    const lectureMatch = visibleLectures.some(l => l.title.toLowerCase().includes(q));
                                    if (!titleMatch && !lectureMatch) return false;
                                }
                                return true;
                            }).map((section) => {
                                // Section Progress Logic
                                const visibleLectures = section.lectures ? section.lectures.filter(l => l.isPublic !== false) : [];
                                const totalSecLectures = visibleLectures.length;
                                const completionLabel = course.completedStatus || 'Completed';
                                const completedSecLectures = visibleLectures.filter(l => progressMap[l._id]?.status === completionLabel).length;
                                const secPercent = totalSecLectures > 0 ? Math.round((completedSecLectures / totalSecLectures) * 100) : 0;
                                const isExpanded = expandedSections[section._id];

                                return (
                                    <div key={section._id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden group transition-colors duration-300">

                                        {/* Section Header (Accordion) */}
                                        <div
                                            onClick={() => toggleSection(section._id)}
                                            className="bg-gray-50/50 dark:bg-slate-950/40 px-5 py-4 border-b border-gray-100 dark:border-white/5 transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/60 flex flex-col gap-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                                    <FaBook className="text-slate-300 dark:text-slate-600 text-xs" />
                                                    {section.title}
                                                    {section.importance && (
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${
                                                            section.importance === 'Very Important' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
                                                            section.importance === 'Important' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                                                            section.importance === 'Normal' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                                                            'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                            {section.importance}
                                                        </span>
                                                    )}
                                                </h3>
                                                {isExpanded ?
                                                    <FaChevronUp className="text-slate-400 text-xs" /> :
                                                    <FaChevronDown className="text-slate-400 text-xs" />
                                                }
                                            </div>

                                            {/* Section Progress Bar */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-gray-200 dark:border-white/5 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${secPercent}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 min-w-[3rem] text-right">
                                                    {completedSecLectures} / {totalSecLectures}
                                                </span>
                                            </div>
                                            {/* Peer Section Progress Bar */}
                                            {selectedPeerId && peerSectionMap[section._id] && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${peerSectionMap[section._id].progressPercent}%` }} />
                                                    </div>
                                                    <span className="text-[9px] font-medium text-purple-500 min-w-[3rem] text-right">
                                                        {peerSectionMap[section._id].completedCount}/{peerSectionMap[section._id].totalCount}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Lectures List (Collapsible) */}
                                        {isExpanded && (
                                            <div className="divide-y divide-gray-100 dark:divide-slate-800 animate-in slide-in-from-top-2 duration-200">
                                                {section.lectures && section.lectures.length > 0 ? (
                                                    [...section.lectures].sort((a, b) => a.number - b.number).map((lec) => {
                                                        const isPreview = lec.isPreview || section.isPreview;
                                                        const progress = progressMap[lec._id] || { status: 'Not Started' };
                                                        const status = progress.status;
                                                        const completedAt = progress.completedAt ? new Date(progress.completedAt) : null;
                                                        const dueDate = lec.dueDate ? new Date(lec.dueDate) : null;

                                                        const completionLabel = course.completedStatus || 'Completed';
                                                        const isLate = status === completionLabel && completedAt && dueDate && completedAt > dueDate;

                                                        return (
                                                            <div
                                                                key={lec._id}
                                                                onClick={() => {
                                                                    if (isEnrolled || isPreview) {
                                                                        navigate(`/course/${id}/lecture/${lec._id}`);
                                                                    }
                                                                }}
                                                                className={`group transition-all duration-200 p-4 flex items-center justify-between ${isEnrolled || isPreview
                                                                    ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'
                                                                    : 'opacity-60 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/50'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="shrink-0">
                                                                        {(status && status !== 'Not Started') ? (
                                                                            <div style={{ color: course?.lectureStatuses?.find(s => s.label === status)?.color || '#10b981' }}>
                                                                                {status === completionLabel ?
                                                                                    <FaCheckCircle size={16} /> :
                                                                                    <FaPlayCircle size={16} />
                                                                                }
                                                                            </div>
                                                                        ) : (
                                                                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-colors shadow-sm ${!isEnrolled && !isPreview
                                                                                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                                                                    : isPreview && !isEnrolled
                                                                                        ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                                                                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                                                                }`}>
                                                                                {!isEnrolled ? (
                                                                                    isPreview ? <FaUnlock size={12} /> : <FaLock size={12} />
                                                                                ) : (
                                                                                    lec.number
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-200 inline-block group-hover:translate-x-1">
                                                                            {lec.title}
                                                                        </span>
                                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                            {/* Preview Badge */}
                                                                            {isPreview && !isEnrolled && (
                                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wide">
                                                                                    Free Preview
                                                                                </span>
                                                                            )}

                                                                            {/* Importance Badge - lecture's own or inherited from section */}
                                                                            {(() => {
                                                                                const imp = lec.importance === 'None' ? '' : (lec.importance || section.importance);
                                                                                return imp && imp !== 'None' ? (
                                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                                                                        imp === 'Very Important' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
                                                                                        imp === 'Important' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                                                                                        imp === 'Normal' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                                                                                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                                                    }`}>
                                                                                        {imp}
                                                                                    </span>
                                                                                ) : null;
                                                                            })()}

                                                                            {lec.dueDate ? (
                                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isLate
                                                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                                                    {isLate ? 'Late Submission: ' : 'Due: '}
                                                                                    {new Date(lec.dueDate).toLocaleDateString()}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">No Due Date</span>
                                                                            )}

                                                                            {/* Status Chip */}
                                                                            <span
                                                                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors`}
                                                                                style={{
                                                                                    backgroundColor: `${course?.lectureStatuses?.find(s => s.label === status)?.color || '#64748b'}20`,
                                                                                    borderColor: `${course?.lectureStatuses?.find(s => s.label === status)?.color || '#64748b'}40`,
                                                                                    color: course?.lectureStatuses?.find(s => s.label === status)?.color || '#64748b'
                                                                                }}
                                                                            >
                                                                                {status}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>


                                                                <div className="flex items-center gap-2">
                                                                    {/* Revision bookmark indicator */}
                                                                    {progressMap[lec._id]?.markedForRevision && (
                                                                        <FaBookmark
                                                                            size={11}
                                                                            className="text-amber-500 dark:text-amber-400 shrink-0"
                                                                            title="Marked for revision"
                                                                        />
                                                                    )}
                                                                    {/* Peer progress indicator */}
                                                                    {selectedPeerId && peerLectureMap[lec._id] && (
                                                                        <span
                                                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                                                            title={`${selectedPeerName}: ${peerLectureMap[lec._id].status}`}
                                                                            style={{ backgroundColor: peerLectureMap[lec._id].status === (course.completedStatus || 'Completed') ? '#a855f7' : peerLectureMap[lec._id].status === 'In Progress' ? '#c084fc' : '#d4d4d8' }}
                                                                        />
                                                                    )}
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-1 rounded-md">
                                                                            Watch
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="p-6 text-center">
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No lectures available.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                        }
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-slate-500 dark:text-slate-400">Course content is being prepared.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        );
    };

    const handleUnmarkRevision = async (lectureId, e) => {
        e.stopPropagation();
        try {
            await api.put(`/courses/lectures/${lectureId}/toggle-revision`);
            setProgressMap(prev => ({
                ...prev,
                [lectureId]: { ...prev[lectureId], markedForRevision: false }
            }));
            showSuccess('Removed from revision list');
        } catch {
            showError('Failed to remove from revision list');
        }
    };

    // Render Revision Tab
    const renderRevisionTab = () => {
        if (!isEnrolled) {
            return (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <FaLock className="text-slate-300 dark:text-slate-600" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Enroll to Start Revising</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">Join this course to bookmark key lectures and build your personal study guide.</p>
                </div>
            );
        }

        // Collect all lectures marked for revision, preserving section context
        const revisionLectures = [];
        if (course?.sections) {
            for (const section of course.sections) {
                for (const lec of section.lectures || []) {
                    if (progressMap[lec._id]?.markedForRevision) {
                        revisionLectures.push({ lec, section });
                    }
                }
            }
        }

        if (revisionLectures.length === 0) {
            return (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <FaBookmark className="text-amber-400 dark:text-amber-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No lectures marked for revision</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Open a lecture and click the <strong>Revision</strong> button to bookmark it here for later review.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FaBookmark className="text-amber-500" size={14} />
                        Marked for Revision
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">({revisionLectures.length})</span>
                    </h2>
                    <button
                        onClick={() => setShowRevisionCountBadge(prev => !prev)}
                        title={showRevisionCountBadge ? 'Hide count badge' : 'Show count badge'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            showRevisionCountBadge
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center transition-colors ${
                            showRevisionCountBadge ? 'bg-amber-500 border-amber-500' : 'bg-transparent border-slate-300 dark:border-slate-600'
                        }`} />
                        Badge {showRevisionCountBadge ? 'On' : 'Off'}
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden">
                    {revisionLectures.map(({ lec, section }) => {
                        const status = progressMap[lec._id]?.status || 'Not Started';
                        const completionLabel = course.completedStatus || 'Completed';
                        const statusColor = course?.lectureStatuses?.find(s => s.label === status)?.color || '#64748b';
                        return (
                            <div
                                key={lec._id}
                                onClick={() => navigate(`/course/${id}/lecture/${lec._id}`)}
                                className="group p-4 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-900/10 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="shrink-0">
                                        {status !== 'Not Started' ? (
                                            <div style={{ color: statusColor }}>
                                                {status === completionLabel
                                                    ? <FaCheckCircle size={16} />
                                                    : <FaPlayCircle size={16} />
                                                }
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {lec.number}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <span className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">{lec.title}</span>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{section.title}</span>
                                            <span
                                                className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                                                style={{
                                                    backgroundColor: `${statusColor}20`,
                                                    borderColor: `${statusColor}40`,
                                                    color: statusColor
                                                }}
                                            >
                                                {status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={(e) => handleUnmarkRevision(lec._id, e)}
                                        title="Remove from revision list"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                    >
                                        <FaBookmark size={10} />
                                        <span className="hidden sm:inline">Unmark</span>
                                    </button>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-1 rounded-md">
                                        Watch
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Render Quizzes Tab
    const renderQuizzesTab = () => {
        if (!quizzesLoaded) {
            return (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500 animate-pulse">Loading Quizzes...</p>
                </div>
            );
        }

        if (quizzes.length === 0) {
            return (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <FaClipboardList className="text-indigo-400 dark:text-indigo-500/80" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Quizzes Yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">The instructor hasn't added any quizzes to this course yet. Check back later to test your knowledge.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-end justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Course Quizzes</h2>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{quizzes.length} Quiz{quizzes.length !== 1 ? 'zes' : ''}</span>
                </div>

                <div className="grid gap-4">
                    {quizzes.map((quiz) => {
                        const canTake = quiz.attemptsAllowed < 0 || quiz.attemptCount < quiz.attemptsAllowed;
                        const attemptsText = quiz.attemptsAllowed < 0 ? 'Unlimited' : `${quiz.attemptCount}/${quiz.attemptsAllowed}`;

                        return (
                            <div
                                key={quiz._id}
                                className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate">{quiz.title}</h3>
                                            {quiz.isRequired && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded font-medium shrink-0">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                        {quiz.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{quiz.description}</p>
                                        )}

                                        {/* Quiz Info */}
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                <FaClipboardList size={10} />
                                                <span>{quiz.questions?.length || 0} Questions</span>
                                            </div>
                                            {quiz.timeLimit > 0 && (
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <FaClock size={10} />
                                                    <span>{quiz.timeLimit} min</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                <FaRedo size={10} />
                                                <span>Attempts: {attemptsText}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                <FaTrophy size={10} />
                                                <span>Pass: {quiz.passingScore}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Status & Action */}
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-3 shrink-0">
                                        {quiz.hasPassed ? (
                                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                <FaCheckCircle size={14} />
                                                <span className="text-xs font-semibold">Passed</span>
                                            </div>
                                        ) : quiz.bestScore > 0 ? (
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Best Score</p>
                                                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{quiz.bestScore}%</p>
                                            </div>
                                        ) : null}

                                        {quiz.hasPassed ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => navigate(`/course/${id}/quiz/${quiz._id}`)}
                                                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                                >
                                                    Review
                                                </button>
                                                {canTake && (
                                                    <button
                                                        onClick={() => navigate(`/course/${id}/quiz/${quiz._id}?retake=true`)}
                                                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1"
                                                    >
                                                        <FaRedo size={10} /> Retake
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => navigate(`/course/${id}/quiz/${quiz._id}`)}
                                                disabled={!canTake}
                                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${canTake
                                                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {canTake ? (quiz.attemptCount > 0 ? 'Retry Quiz' : 'Start Quiz') : 'No Attempts Left'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Render Announcements Tab (using shared component)
    const renderAnnouncementsTab = () => {
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
                canBroadcast={canBroadcast}
                isOwner={false}
                currentUserId={user?._id}
            />
        );
    };

    if (!course) return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500 animate-pulse">Loading Course Data...</p>
        </div>
    );

    return (
        <div className={`min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 ${tabLayout === 'vertical' ? `pb-20 md:pb-12 glass-content-area ${sidebarHovered ? 'glass-content-expanded' : ''}` : 'pb-12'}`}>

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-navbar z-30 transition-all duration-300 shadow-sm">
                <div className={`w-full px-4 md:px-8 xl:px-12 flex items-center justify-between gap-3 transition-all duration-300 ${headerScrolled ? 'py-1.5' : 'py-3 md:py-4'}`}>
                    <div className="min-w-0 flex-1">
                        <h1 className={`font-bold text-slate-900 dark:text-white leading-tight truncate transition-all duration-300 ${headerScrolled ? 'text-sm' : 'text-base sm:text-lg'}`}>{course.title}</h1>
                        <p className={`text-xs text-slate-500 dark:text-slate-400 line-clamp-1 transition-all duration-300 overflow-hidden ${headerScrolled ? 'max-h-0 opacity-0 mt-0' : 'max-h-10 opacity-100 mt-1 hidden sm:block'}`}>{course.description}</p>
                    </div>
                    <button
                        onClick={() => {
                            const resumeLec = getResumeLecture();
                            if (resumeLec) {
                                navigate(`/course/${id}/lecture/${resumeLec._id}`);
                            }
                        }}
                        className={`shrink-0 flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full font-semibold shadow-md shadow-indigo-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${headerScrolled ? 'px-3 py-1.5 text-[10px]' : 'px-4 sm:px-5 py-2.5 text-xs sm:text-sm'}`}
                    >
                        <FaPlayCircle size={headerScrolled ? 11 : 14} /> {hasAnyProgress() ? 'Continue' : 'Start'}
                    </button>
                </div>

                {/* Horizontal Tabs (when horizontal layout) */}
                {tabLayout === 'horizontal' && (
                    <div className="w-full px-4 md:px-8 xl:px-12">
                        <div className="flex items-center gap-0.5 border-t border-gray-100 dark:border-slate-800">
                            <div className="flex flex-1 overflow-x-auto scrollbar-hide">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    const showBadge = tab.id === 'announcements' && unreadBroadcastCount > 0;
                                    const showRevisionBadge = tab.id === 'revision' && tab.badge;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={`flex items-center gap-1.5 font-medium transition-all duration-300 border-b-2 -mb-[1px] whitespace-nowrap ${headerScrolled ? 'px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs' : 'px-3 py-2.5 text-xs sm:text-sm'} ${isActive
                                                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            <Icon size={headerScrolled ? 10 : 12} />
                                            {tab.label}
                                            {showBadge && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {unreadBroadcastCount > 99 ? '99+' : unreadBroadcastCount}
                                                </span>
                                            )}
                                            {showRevisionBadge && (
                                                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {tab.badge > 99 ? '99+' : tab.badge}
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
                    </div>
                )}
            </div>

            {/* Mobile bottom nav bar when vertical layout is active */}
            {tabLayout === 'vertical' && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 safe-area-bottom">
                    <div className="flex items-stretch">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const showBadge = tab.id === 'announcements' && unreadBroadcastCount > 0;
                            const showRevisionBadge = tab.id === 'revision' && tab.badge;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
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
                                    {showRevisionBadge && (
                                        <span className="absolute top-1 right-1/2 translate-x-3 bg-amber-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                                            {tab.badge > 9 ? '9+' : tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        <Link
                            to={`/ai-chat?courseId=${id}`}
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
                            const showBadge = tab.id === 'announcements' && unreadBroadcastCount > 0;
                            const showRevisionBadge = tab.id === 'revision' && tab.badge;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
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
                                    {showRevisionBadge && (
                                        <span className="absolute top-1 right-1 bg-amber-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                                            {tab.badge > 9 ? '9+' : tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex flex-col gap-1 px-1.5">
                        <Link
                            to={`/ai-chat?courseId=${id}`}
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
            <div className="w-full px-4 md:px-8 xl:px-12 py-4 sm:py-6">
                {activeTab === 'content' && renderContentTab()}
                {activeTab === 'revision' && renderRevisionTab()}
                {activeTab === 'quizzes' && renderQuizzesTab()}
                {activeTab === 'announcements' && renderAnnouncementsTab()}
                {activeTab === 'resources' && <ResourceManager courseId={id} userId={user?._id || user?.id} sections={course?.sections || []} />}
                {activeTab === 'analytics' && <StudentAnalytics courseId={id} />}
                {activeTab === 'ai-assistant' && <AIChatPanel courseId={id} courseTitle={course?.title} />}
            </div>
        </div>
    );
};

export default StudentCourseDetails;
