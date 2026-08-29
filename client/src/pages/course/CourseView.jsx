import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import { FaPlayCircle, FaChevronDown, FaChevronUp, FaArrowLeft, FaClock, FaBars, FaTimes, FaStepBackward, FaStepForward, FaStickyNote, FaSave, FaLock, FaUserGraduate, FaCheckCircle, FaSearch, FaBookmark, FaRegBookmark, FaFolderOpen, FaDownload, FaFilePdf, FaImage, FaFileAlt, FaLink as FaLinkIcon, FaEye } from 'react-icons/fa';
import StatusSelector from '../../components/ui/StatusSelector';
import LectureSidebarItem from '../../components/course/LectureSidebarItem';
import Pagination from '../../components/ui/Pagination';
import { showSuccess, showError, showWarning } from '../../utils/toast';

const getYouTubeEmbedUrl = (url) => {
    try {
        const parsed = new URL(url);
        let videoId = null;
        if (parsed.hostname === 'youtu.be') {
            videoId = parsed.pathname.slice(1);
        } else {
            videoId = parsed.searchParams.get('v');
        }
        if (!videoId) return null;
        return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3`;
    } catch {
        return null;
    }
};

const CourseView = () => {
    const { id, lectureId } = useParams(); // Get lectureId from URL
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [course, setCourse] = useState(null);
    const [selectedLecture, setSelectedLecture] = useState(null);
    const [progressMap, setProgressMap] = useState({});
    const [isEnrolled, setIsEnrolled] = useState(false);

    // Comments state
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [notes, setNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);

    // State to toggle section accordion
    const [expandedSections, setExpandedSections] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar
    const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Desktop sidebar toggle - open by default
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'notes' | 'discussion' | 'resources'

    // Hidden/unavailable lecture
    const [lectureNotAvailable, setLectureNotAvailable] = useState(false);

    // Lecture-linked resources
    const [lectureResources, setLectureResources] = useState([]);
    const [lectureResourcesLoading, setLectureResourcesLoading] = useState(false);
    const [viewingResource, setViewingResource] = useState(null);
    const [viewTextContent, setViewTextContent] = useState(null);
    const [viewUrl, setViewUrl] = useState(null);
    const [resourceCounts, setResourceCounts] = useState({}); // lectureId -> count

    // Peer progress state
    const [showPeerSelector, setShowPeerSelector] = useState(false);
    const [peerList, setPeerList] = useState([]);
    const [peerKeyword, setPeerKeyword] = useState('');
    const [debouncedPeerKeyword, setDebouncedPeerKeyword] = useState('');
    const [selectedPeerId, setSelectedPeerId] = useState(null);
    const [selectedPeerName, setSelectedPeerName] = useState('');
    const [peerProgressData, setPeerProgressData] = useState(null);
    const [peerProgressLoading, setPeerProgressLoading] = useState(false);
    const peerSelectorRef = useRef(null);

    // Navigation Helpers
    const getFlattenedLectures = () => {
        if (!course || !course.sections) return [];
        return course.sections
            .filter(s => s.isPublic !== false)
            .flatMap(section => section.lectures?.filter(l => l.isPublic !== false) || []);
    };

    const handleNextLecture = () => {
        const lectures = getFlattenedLectures();
        const currentIndex = lectures.findIndex(l => l._id === selectedLecture._id);
        if (currentIndex < lectures.length - 1) {
            handleSelectLecture(lectures[currentIndex + 1]);
        }
    };

    const handlePrevLecture = () => {
        const lectures = getFlattenedLectures();
        const currentIndex = lectures.findIndex(l => l._id === selectedLecture._id);
        if (currentIndex > 0) {
            handleSelectLecture(lectures[currentIndex - 1]);
        }
    };

    useEffect(() => {
        if (course) {
            document.title = `Skill Path | ${course.title}`;
        }
        return () => {
            document.title = 'Skill Path';
        };
    }, [course]);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const res = await api.get(`/courses/${id}`);
                const courseData = res.data;
                setCourse(courseData);

                // All sections collapsed by default
                if (courseData.sections && courseData.sections.length > 0) {
                    setExpandedSections({});
                    // Select first lecture if available
                    if (courseData.sections && courseData.sections.length > 0 && courseData.sections[0].lectures.length > 0) {
                        const firstLec = courseData.sections[0].lectures[0];
                        setSelectedLecture(firstLec);
                        fetchComments(firstLec._id);
                    }
                }
                
                // Fetch resource counts for this course
                try {
                    const countsRes = await api.get(`/resources/${id}/counts`);
                    setResourceCounts(countsRes.data.counts || {});
                } catch (err) {
                    console.warn('Failed to fetch resource counts', err);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchCourse();
    }, [id]);

    useEffect(() => {
        const fetchProgress = async () => {
            if (!user) return; // Skip if guest
            try {
                const res = await api.get(`/courses/${id}/my-progress`);

                if (res.data && res.data.enrolled !== false) {
                    setIsEnrolled(true);
                    const map = {};
                    if (res.data.completedLectures) {
                        res.data.completedLectures.forEach(item => {
                            map[item.lecture] = {
                                status: item.status,
                                notes: item.notes,
                                completedAt: item.completedAt,
                                markedForRevision: item.markedForRevision || false
                            };
                        });
                    }
                    setProgressMap(map);
                } else {
                    setIsEnrolled(false);
                }
            } catch (err) {
                console.error(err);
                setIsEnrolled(false);
            }
        };
        fetchProgress();
    }, [id]);

    const fetchComments = async (lectureId) => {
        try {
            const res = await api.get(`/courses/lectures/${lectureId}/comments`);
            setComments(res.data);
        } catch (err) {
            console.error("Failed to fetch comments");
        }
    };

    // Show toast reminder once when a lecture is manually selected and its status hasn't been updated
    useEffect(() => {
        if (user && selectedLecture && isEnrolled) {
            const status = progressMap[selectedLecture._id]?.status;
            const defaultStatus = course?.lectureStatuses?.[0]?.label || 'Not Started';
            if (!status || status === defaultStatus) {
                showWarning('Don\'t forget to update your lecture status!');
            }
        }
    }, [selectedLecture?._id]);

    const handleSelectLecture = (lecture) => {
        setSelectedLecture(lecture);
        setCurrentPage(1);
        fetchComments(lecture._id);
        navigate(`/course/${id}/lecture/${lecture._id}`, { replace: true });

        // Sync Notes from progress map
        const lectureProgress = progressMap[lecture._id];
        setNotes(lectureProgress?.notes || '');

        // Reset lecture resources when switching lectures
        setLectureResources([]);
        if (activeTab === 'resources') {
            fetchLectureResources(lecture._id);
        }

        // Auto-expand the section containing this lecture
        if (course && course.sections) {
            const section = course.sections.find(s => s.lectures.some(l => l._id === lecture._id));
            if (section) {
                setExpandedSections({ [section._id]: true });
            }
        }
    };

    // Fetch resources linked to a lecture
    const fetchLectureResources = async (lecId) => {
        setLectureResourcesLoading(true);
        try {
            const res = await api.get(`/resources/${id}/lecture/${lecId}`);
            setLectureResources(res.data.resources || []);
        } catch {
            setLectureResources([]);
        } finally {
            setLectureResourcesLoading(false);
        }
    };

    // Handle resource download
    const handleResourceDownload = async (resource) => {
        if (resource.fileType === 'link') {
            window.open(resource.url, '_blank');
            return;
        }
        try {
            const res = await api.get(`/resources/${id}/${resource._id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', resource.fileName || 'download');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            showError('Download failed');
        }
    };

    // Handle inline view
    const handleResourceView = async (resource) => {
        if (resource.fileType === 'link') {
            window.open(resource.url, '_blank');
            return;
        }
        try {
            const res = await api.get(`/resources/${id}/${resource._id}/view`, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: resource.mimeType });
            
            if (resource.mimeType?.includes('csv') || resource.mimeType?.includes('txt') || resource.mimeType?.includes('text')) {
                const text = await blob.text();
                setViewTextContent(text);
            } else {
                setViewTextContent(null);
            }

            const blobUrl = window.URL.createObjectURL(blob);
            setViewUrl(blobUrl);
            setViewingResource(resource);
        } catch {
            showError('Failed to load resource');
        }
    };

    const closeViewer = () => {
        if (viewUrl) window.URL.revokeObjectURL(viewUrl);
        setViewUrl(null);
        setViewingResource(null);
        setViewTextContent(null);
    };

    const FILE_TYPE_ICONS = { pdf: FaFilePdf, image: FaImage, document: FaFileAlt, link: FaLinkIcon };
    const FILE_TYPE_COLORS = { pdf: 'text-red-500', image: 'text-blue-500', document: 'text-amber-500', link: 'text-indigo-500' };
    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Fetch resources when switching to resources tab
    useEffect(() => {
        if (activeTab === 'resources' && selectedLecture?._id && lectureResources.length === 0 && !lectureResourcesLoading) {
            fetchLectureResources(selectedLecture._id);
        }
    }, [activeTab, selectedLecture?._id]);

    // Initialize View based on URL or Default
    useEffect(() => {
        if (course && course.sections?.length > 0) {
            let targetLecture = null;
            let targetSectionId = null;

            if (lectureId) {
                // Find specific lecture from URL
                for (const sec of course.sections) {
                    const found = sec.lectures.find(l => l._id === lectureId);
                    if (found) {
                        targetLecture = found;
                        targetSectionId = sec._id;
                        setNotes(progressMap[found._id]?.notes || '');
                        break;
                    }
                }

                // Lecture ID in URL but not found in visible sections = hidden/unavailable
                if (!targetLecture) {
                    setLectureNotAvailable(true);
                    return;
                }
                setLectureNotAvailable(false);
            }

            // Fallback to first lecture if no URL param
            if (!targetLecture && !selectedLecture) {
                targetLecture = course.sections[0].lectures[0];
                targetSectionId = course.sections[0]._id;
            }

            if (targetLecture && (!selectedLecture || selectedLecture._id !== targetLecture._id)) {
                setSelectedLecture(targetLecture);
                fetchComments(targetLecture._id);
                setExpandedSections({ [targetSectionId]: true });
            }
        }
    }, [course, lectureId]);

    const handleSaveNotes = async () => {
        if (!selectedLecture || isSavingNotes) return;
        setIsSavingNotes(true);
        try {
            await api.put(`/courses/lectures/${selectedLecture._id}/progress`, {
                notes: notes
            });

            // Update local progress map
            setProgressMap(prev => ({
                ...prev,
                [selectedLecture._id]: {
                    ...prev[selectedLecture._id],
                    notes: notes
                }
            }));
            showSuccess('Notes saved!');
        } catch (error) {
            showError('Failed to save notes');
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleUpdateProgress = async (newStatus, targetLectureId) => {
        const lecId = targetLectureId || selectedLecture?._id;
        if (!lecId) return;
        if (!isEnrolled) {
            showError("You are in Preview Mode (Not Enrolled). Progress cannot be saved.");
            return;
        }
        try {
            const existingNotes = progressMap[lecId]?.notes || '';
            const payload = { courseId: id, status: newStatus, notes: existingNotes };
            await api.put(`/courses/lectures/${lecId}/progress`, payload);

            setProgressMap(prev => ({
                ...prev,
                [lecId]: { status: newStatus, notes: existingNotes }
            }));
            showSuccess('Progress saved!');
        } catch (err) {
            console.error("Failed to update progress", err);
            showError('Failed to save progress');
        }
    };

    const handleToggleRevision = async () => {
        if (!selectedLecture) return;
        if (!isEnrolled) {
            showError("You are in Preview Mode (Not Enrolled). Cannot mark for revision.");
            return;
        }
        try {
            const res = await api.put(`/courses/lectures/${selectedLecture._id}/toggle-revision`);
            const { markedForRevision } = res.data;
            setProgressMap(prev => ({
                ...prev,
                [selectedLecture._id]: {
                    ...prev[selectedLecture._id],
                    markedForRevision
                }
            }));
            showSuccess(markedForRevision ? 'Marked for revision!' : 'Removed from revision list');
        } catch (err) {
            showError('Failed to update revision mark');
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await api.post(`/courses/lectures/${selectedLecture._id}/comments`, {
                content: newComment,
                courseId: id
            });

            setNewComment('');
            fetchComments(selectedLecture._id);
            showSuccess('Comment posted!');
        } catch (error) {
            showError('Error posting comment');
        }
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // Peer progress: debounce keyword
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedPeerKeyword(peerKeyword), 400);
        return () => clearTimeout(timer);
    }, [peerKeyword]);

    // Peer progress: fetch peer list when selector opens
    useEffect(() => {
        if (showPeerSelector && course?.allowPeerProgress) {
            api.get(`/courses/${id}/peers?keyword=${debouncedPeerKeyword}`)
                .then(res => setPeerList(res.data || []))
                .catch(() => setPeerList([]));
        }
    }, [showPeerSelector, debouncedPeerKeyword]);

    // Peer progress: fetch selected peer's progress
    useEffect(() => {
        if (selectedPeerId) {
            setPeerProgressLoading(true);
            api.get(`/courses/${id}/peers/${selectedPeerId}/progress`)
                .then(res => setPeerProgressData(res.data))
                .catch(() => { setPeerProgressData(null); setSelectedPeerId(null); showError('Failed to load peer progress'); })
                .finally(() => setPeerProgressLoading(false));
        } else {
            setPeerProgressData(null);
        }
    }, [selectedPeerId]);

    // Peer progress: click outside to close selector
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
        peerProgressData.sections.forEach(sec => {
            peerSectionMap[sec._id] = { completedCount: sec.completedCount, totalCount: sec.totalCount, progressPercent: sec.progressPercent };
            sec.lectures.forEach(lec => { peerLectureMap[lec._id] = { status: lec.status }; });
        });
    }

    if (!course) return <div className="flex justify-center items-center h-screen text-slate-500 font-medium bg-gray-50 dark:bg-slate-950 dark:text-slate-400">Loading Experience...</div>;


    // Check access
    const hasAccess = isEnrolled || (user && user.role === 'admin') || (course && user && course.user === user._id) || (selectedLecture && selectedLecture.isPreview);


    return (
        <div className="bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 font-sans transition-colors duration-300 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Resource Viewer Modal */}
            {viewingResource && viewUrl && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeViewer}>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{viewingResource.title}</h3>
                                {viewingResource.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{viewingResource.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                                <button
                                    onClick={() => handleResourceDownload(viewingResource)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-all"
                                >
                                    <FaDownload size={10} /> Download
                                </button>
                                <button onClick={closeViewer} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                                    <FaTimes size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-1 bg-slate-100 dark:bg-slate-950" style={{ minHeight: '400px' }}>
                            {viewingResource.fileType === 'pdf' ? (
                                <iframe src={viewUrl} className="w-full h-full min-h-[70vh] rounded-lg" title={viewingResource.title} />
                            ) : viewingResource.fileType === 'image' ? (
                                <div className="flex items-center justify-center p-4 h-full">
                                    <img src={viewUrl} alt={viewingResource.title} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" />
                                </div>
                            ) : viewingResource.mimeType?.includes('csv') && viewTextContent ? (
                                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-lg overflow-x-auto shadow-inner min-h-[70vh]">
                                    <table className="w-full text-left border-collapse min-w-max text-xs md:text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 shadow-sm">
                                            <tr>
                                                {viewTextContent.split('\n')[0]?.split(',').map((header, i) => (
                                                    <th key={i} className="border-b dark:border-slate-700 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                        {header.replace(/^"|"$/g, '')}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                            {viewTextContent.split('\n').slice(1).map((line, i) => line.trim() ? (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    {line.split(',').map((cell, j) => (
                                                        <td key={j} className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                                                            {cell.replace(/^"|"$/g, '')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ) : null)}
                                        </tbody>
                                    </table>
                                </div>
                            ) : viewingResource.mimeType?.includes('text') && viewTextContent ? (
                                <div className="w-full h-full bg-white dark:bg-slate-900 p-6 rounded-lg overflow-auto shadow-inner min-h-[70vh]">
                                    <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                                        {viewTextContent}
                                    </pre>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-20 gap-4 min-h-[70vh]">
                                    <FaFileAlt className="text-slate-300 dark:text-slate-700" size={56} />
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Preview not available for this format.</p>
                                    <button
                                        onClick={() => handleResourceDownload(viewingResource)}
                                        className="flex items-center gap-2 px-6 py-2.5 mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all"
                                    >
                                        <FaDownload size={12} /> Download to View
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Header */}
            <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-3 flex items-center justify-between z-50 sticky top-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/course/${id}`)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                        <FaArrowLeft size={16} />
                    </button>
                    <h1 className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] text-sm">{course?.title}</h1>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-slate-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    {isSidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
                </button>
            </div>

            <div className="flex relative">
                {/* Mobile Sidebar Overlay (Backdrop) */}
                <div
                    className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsSidebarOpen(false)}
                />

                {/* Sidebar (Sheet-like) */}
                <div className={`
                        fixed lg:sticky top-0 inset-y-0 left-0 h-screen z-40 lg:z-10 shrink-0
                        bg-white dark:bg-slate-900 lg:border-r border-gray-100 dark:border-slate-800 shadow-2xl lg:shadow-none
                        flex flex-col transform transition-all duration-300
                        ${isSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0 w-[280px]'}
                        ${!isSidebarVisible ? 'lg:w-16' : 'lg:w-80'}

                    `}>
                    <div className={`p-3 bg-white dark:bg-slate-900 sticky top-0 z-10 hidden lg:flex items-center border-b border-gray-100 dark:border-slate-800 ${!isSidebarVisible ? 'justify-center' : 'justify-between'}`}>
                        {isSidebarVisible ? (
                            <>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => navigate(`/course/${id}`)} className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                                        <FaArrowLeft />
                                    </button>
                                    <h2 className="font-semibold text-slate-900 dark:text-white truncate text-sm" title={course.title}>{course.title}</h2>
                                </div>
                                <button
                                    onClick={() => setIsSidebarVisible(false)}
                                    className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
                                    title="Minimize sidebar"
                                >
                                    <FaBars size={18} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsSidebarVisible(true)}
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
                                title="Expand sidebar"
                            >
                                <FaBars size={18} />
                            </button>
                        )}
                    </div>

                    {/* Mobile Sidebar Header (Close button) */}
                    <div className="lg:hidden p-3 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
                        <h2 className="font-bold text-slate-900 dark:text-white text-lg">Course Content</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                            <FaTimes size={20} />
                        </button>
                    </div>

                    <div className={`px-1 py-1 space-y-0.5 flex-1 overflow-y-auto ${!isSidebarVisible ? 'hidden' : ''}`}>
                        {/* Peer Progress Selector */}
                        {course.allowPeerProgress && (isEnrolled || (user && (user.role === 'admin' || course.user === user._id))) && (
                            <div className="px-2 py-2" ref={peerSelectorRef}>
                                {!selectedPeerId ? (
                                    <div className="relative">
                                        <button
                                            onClick={() => { setShowPeerSelector(!showPeerSelector); setPeerKeyword(''); }}
                                            className="flex items-center gap-2 w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                                        >
                                            <FaUserGraduate size={10} className="text-slate-400" />
                                            <span>View Peer Progress</span>
                                            <FaChevronDown className={`text-slate-400 text-[8px] ml-auto transition-transform ${showPeerSelector ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showPeerSelector && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-30 overflow-hidden">
                                                <div className="p-1.5 border-b border-gray-100 dark:border-slate-700">
                                                    <div className="relative">
                                                        <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={9} />
                                                        <input
                                                            type="text"
                                                            placeholder="Search..."
                                                            value={peerKeyword}
                                                            onChange={(e) => setPeerKeyword(e.target.value)}
                                                            className="w-full pl-6 pr-2 py-1 text-[11px] bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-36 overflow-y-auto">
                                                    {peerList.length > 0 ? peerList.map(s => (
                                                        <button
                                                            key={s._id}
                                                            onClick={() => { setSelectedPeerId(s._id); setSelectedPeerName(s.name); setShowPeerSelector(false); }}
                                                            className="w-full px-2.5 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                                        >
                                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                                                                {s.name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                                                            </div>
                                                        </button>
                                                    )) : (
                                                        <div className="px-2.5 py-3 text-[11px] text-slate-400 text-center italic">No students found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5">
                                        <FaUserGraduate className="text-blue-500 shrink-0" size={10} />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 truncate block">{selectedPeerName}</span>
                                            {peerProgressData && (
                                                <span className="text-[9px] text-blue-500 dark:text-blue-400">
                                                    {peerProgressData.progress.progressPercent}% complete
                                                </span>
                                            )}
                                        </div>
                                        {peerProgressLoading && <span className="text-[9px] text-blue-400 animate-pulse">...</span>}
                                        <button onClick={() => { setSelectedPeerId(null); setSelectedPeerName(''); }} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded text-blue-500"><FaTimes size={10} /></button>
                                    </div>
                                )}
                            </div>
                        )}

                        {course.sections && course.sections.filter(s => s.isPublic !== false).map((section) => {
                            // Section Progress Logic
                            const visibleLectures = section.lectures ? section.lectures.filter(l => l.isPublic !== false) : [];
                            const totalSecLectures = visibleLectures.length;
                            const completionLabel = course.completedStatus || 'Completed';
                            const completedSecLectures = visibleLectures.filter(l => progressMap[l._id]?.status === completionLabel).length;
                            const secPercent = totalSecLectures > 0 ? Math.round((completedSecLectures / totalSecLectures) * 100) : 0;

                            return (
                                <div key={section._id}>
                                    <div className="px-2 pt-1 pb-0.5">
                                        <button
                                            onClick={() => toggleSection(section._id)}
                                            className="w-full flex justify-between items-center group mb-1 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-md p-1 -mx-1 transition-colors"
                                        >
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors flex items-center gap-1.5">{section.title}
                                                {section.importance && (
                                                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wide normal-case ${
                                                        section.importance === 'Very Important' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                                                        section.importance === 'Important' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                                                        section.importance === 'Normal' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                                                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        {section.importance}
                                                    </span>
                                                )}
                                            </span>
                                            {expandedSections[section._id] ?
                                                <FaChevronUp className="text-[10px] text-slate-400 dark:text-slate-500" /> :
                                                <FaChevronDown className="text-[10px] text-slate-400 dark:text-slate-500" />
                                            }
                                        </button>
                                        <div className="h-0.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden w-full mb-1">
                                            <div
                                                className="h-full bg-slate-900 dark:bg-blue-600 transition-all duration-500"
                                                style={{ width: `${secPercent}%` }}
                                            ></div>
                                        </div>
                                        {selectedPeerId && peerSectionMap[section._id] && (
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className="h-0.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex-1">
                                                    <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${peerSectionMap[section._id].progressPercent}%` }} />
                                                </div>
                                                <span className="text-[8px] text-purple-500 font-medium">{peerSectionMap[section._id].completedCount}/{peerSectionMap[section._id].totalCount}</span>
                                            </div>
                                        )}
                                    </div>

                                    {expandedSections[section._id] && (
                                        <div className="space-y-0.5 mt-0 mb-3 ml-2 border-l border-gray-100 dark:border-slate-800 pl-2">
                                            {[...section.lectures].filter(l => l.isPublic !== false).sort((a, b) => a.number - b.number).map((lec) => {
                                                const status = progressMap[lec._id]?.status || 'Not Started';
                                                const isSelected = selectedLecture && selectedLecture._id === lec._id;

                                                return (
                                                    <LectureSidebarItem
                                                        key={lec._id}
                                                        lecture={lec}
                                                        isSelected={isSelected}
                                                        onClick={() => {
                                                            handleSelectLecture(lec);
                                                            setIsSidebarOpen(false); // Close sidebar on mobile selection
                                                        }}
                                                        status={status}
                                                        showStatus={true}
                                                        customStatuses={course?.lectureStatuses}
                                                        completedStatus={course?.completedStatus}
                                                        sectionImportance={section.importance}
                                                        peerStatus={selectedPeerId ? (peerLectureMap[lec._id]?.status || 'Not Started') : null}
                                                        markedForRevision={progressMap[lec._id]?.markedForRevision || false}
                                                        resourceCount={resourceCounts[lec._id] || 0}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Minimized Sidebar - Show lecture numbers only */}
                    {!isSidebarVisible && (
                        <div className="hidden lg:flex flex-col items-center gap-2 py-2 flex-1 overflow-y-auto">
                            {course.sections && course.sections.map((section, sectionIndex) => {
                                // Alternate colors: even sections = black, odd sections = white
                                const isEvenSection = sectionIndex % 2 === 0;

                                return (
                                    <div key={section._id} className="w-full flex flex-col items-center">
                                        {/* Horizontal separator between sections */}
                                        {sectionIndex > 0 && (
                                            <div className="w-full h-px bg-slate-300 dark:bg-slate-700 mb-2"></div>
                                        )}

                                        {/* Bordered Container for Section with Lectures */}
                                        <div
                                            className={`w-12 border-2 rounded-lg p-1 flex flex-col items-center gap-1 ${isEvenSection
                                                ? 'border-slate-900 dark:border-white'
                                                : 'border-slate-300 dark:border-slate-700'
                                                }`}
                                            title={section.title}
                                        >
                                            {/* Lecture Numbers inside the bordered box */}
                                            {section.lectures && [...section.lectures].filter(l => l.isPublic !== false).sort((a, b) => a.number - b.number).map((lec) => {
                                                const status = progressMap[lec._id]?.status || 'Not Started';
                                                const isSelected = selectedLecture && selectedLecture._id === lec._id;
                                                const completionLabel = course.completedStatus || 'Completed';
                                                const isCompleted = status === completionLabel;

                                                return (
                                                    <button
                                                        key={lec._id}
                                                        onClick={() => handleSelectLecture(lec)}
                                                        className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold transition-all ${isSelected
                                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                                            : isCompleted
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                            }`}
                                                        title={`${lec.title} (${status})`}
                                                    >
                                                        {lec.number}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-950 transition-colors duration-300">
                    {lectureNotAvailable ? (
                        <div className="flex items-center justify-center h-full min-h-[60vh]">
                            <div className="text-center px-6">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <svg className="w-7 h-7 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Lecture not available</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This lecture is hidden or doesn't exist.</p>
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Go Back
                                    </button>
                                    {course?.sections?.[0]?.lectures?.[0] && (
                                        <button
                                            onClick={() => {
                                                const firstLec = course.sections[0].lectures[0];
                                                setLectureNotAvailable(false);
                                                setSelectedLecture(firstLec);
                                                fetchComments(firstLec._id);
                                                navigate(`/course/${id}/lecture/${firstLec._id}`, { replace: true });
                                            }}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                        >
                                            Go to First Lecture
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : selectedLecture ? (
                        <div className="w-full max-w-[1800px] mx-auto">

                            {/* Video Player - Full Width */}
                            <div className="bg-black w-full" style={{ aspectRatio: '16/9', maxHeight: '65vh' }}>
                                <div className="w-full h-full relative">
                                    {hasAccess ? (
                                        selectedLecture.resourceUrl ? (
                                            selectedLecture.resourceUrl.includes('youtube') || selectedLecture.resourceUrl.includes('youtu.be') ? (
                                                <iframe
                                                    src={getYouTubeEmbedUrl(selectedLecture.resourceUrl)}
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    title="Video"
                                                ></iframe>
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                                    <a href={selectedLecture.resourceUrl} target="_blank" rel="noreferrer" className="text-white hover:text-blue-400 flex flex-col items-center gap-3 transition-colors p-4">
                                                        <FaPlayCircle className="text-5xl" />
                                                        <span className="text-base font-medium text-center">Open External Resource</span>
                                                    </a>
                                                </div>
                                            )
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500 flex-col p-4">
                                                <span className="text-5xl mb-3">📚</span>
                                                <span className="font-medium text-base">No Video Resource</span>
                                            </div>
                                        )
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xl z-10 p-6 text-center">
                                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 text-white/80 shadow-2xl backdrop-blur-md border border-white/20">
                                                <FaLock size={32} />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">Premium Content Locked</h3>
                                            <p className="text-slate-300 mb-8 max-w-md text-sm leading-relaxed">
                                                This lecture is part of the full course experience. Enroll now to unlock all high-quality modules.
                                            </p>
                                            {!user ? (
                                                <button onClick={() => navigate('/login')} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/30 text-sm hover:-translate-y-0.5">
                                                    Login to Enroll
                                                </button>
                                            ) : (
                                                <button onClick={() => navigate(`/marketplace/course/${id}`)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/30 text-sm hover:-translate-y-0.5">
                                                    Unlock Full Course
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lecture Info Bar */}
                            <div className="px-4 sm:px-6 lg:px-4 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    {/* Title and meta */}
                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">{selectedLecture.title}</h1>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Lecture {selectedLecture.number}</span>
                                            {(() => {
                                                const parentSection = course?.sections?.find(s => s.lectures?.some(l => l._id === selectedLecture._id));
                                                const imp = selectedLecture.importance === 'None' ? '' : (selectedLecture.importance || parentSection?.importance || '');
                                                return imp && imp !== 'None' ? (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                                        imp === 'Very Important' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                                                        imp === 'Important' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                                                        imp === 'Normal' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                                                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        {imp}
                                                    </span>
                                                ) : null;
                                            })()}
                                            {selectedLecture.resourceUrl && (
                                                <a href={selectedLecture.resourceUrl} target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-bold transition-all border border-blue-100 dark:border-blue-800/50">
                                                    <FaPlayCircle className="text-xs" /> Open URL
                                                </a>
                                            )}
                                            {selectedLecture.dueDate && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium">
                                                    <FaClock className="text-xs" /> Due {new Date(selectedLecture.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status + Navigation */}
                                    <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                                        <div className="flex-1 sm:flex-initial">
                                            <StatusSelector
                                                status={progressMap[selectedLecture._id]?.status || 'Not Started'}
                                                onChange={(newStatus) => handleUpdateProgress(newStatus)}
                                                disabled={false}
                                                customStatuses={course?.lectureStatuses}
                                            />
                                        </div>
                                        {isEnrolled && (
                                            <button
                                                onClick={handleToggleRevision}
                                                title={progressMap[selectedLecture._id]?.markedForRevision ? 'Remove from revision list' : 'Mark for revision'}
                                                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                                    progressMap[selectedLecture._id]?.markedForRevision
                                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400'
                                                }`}
                                            >
                                                {progressMap[selectedLecture._id]?.markedForRevision
                                                    ? <FaBookmark size={12} />
                                                    : <FaRegBookmark size={12} />
                                                }
                                                <span className="hidden sm:inline">Revision</span>
                                            </button>
                                        )}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={handlePrevLecture}
                                                disabled={getFlattenedLectures().findIndex(l => l._id === selectedLecture._id) === 0}
                                                className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                            >
                                                <FaStepBackward className="group-hover:-translate-x-0.5 transition-transform text-xs" />
                                                <span className="hidden sm:inline">Previous</span>
                                            </button>
                                            <button
                                                onClick={handleNextLecture}
                                                disabled={getFlattenedLectures().findIndex(l => l._id === selectedLecture._id) === getFlattenedLectures().length - 1}
                                                className="group flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-20 disabled:scale-100 disabled:cursor-not-allowed transition-all"
                                            >
                                                <span>Next</span>
                                                <FaStepForward className="group-hover:translate-x-0.5 transition-transform text-xs" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tab Strip */}
                            <div className="flex border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4">
                                {[
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'resources', label: 'Resources', icon: <FaFolderOpen className="text-emerald-400 text-[10px]" />, badge: resourceCounts[selectedLecture?._id] > 0 ? resourceCounts[selectedLecture._id] : null },
                                    { id: 'notes', label: 'Notes', icon: <FaStickyNote className="text-amber-400 text-[10px]" /> },
                                    { id: 'discussion', label: `Discussion${comments.length > 0 ? ` (${comments.length})` : ''}` },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                            ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                        {tab.badge && (
                                            <span className="ml-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-red-500 text-white shadow-sm">
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="px-4 sm:px-6 lg:px-4 py-5 pb-8">

                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div>
                                        {selectedLecture.description ? (
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedLecture.description}</p>
                                        ) : (
                                            <p className="text-sm text-slate-400 dark:text-slate-500">No description for this lecture.</p>
                                        )}
                                    </div>
                                )}

                                {/* Resources Tab */}
                                {activeTab === 'resources' && (
                                    <div className="space-y-3">
                                        {lectureResourcesLoading ? (
                                            <div className="py-12 flex flex-col items-center justify-center space-y-3">
                                                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-xs text-slate-500 animate-pulse">Loading resources...</p>
                                            </div>
                                        ) : lectureResources.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <FaFolderOpen className="text-emerald-400" size={24} />
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">No Resources</h3>
                                                <p className="text-xs text-slate-400">No resources have been linked to this lecture yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {lectureResources.map(resource => {
                                                    const Icon = FILE_TYPE_ICONS[resource.fileType] || FaFileAlt;
                                                    const iconColor = FILE_TYPE_COLORS[resource.fileType] || 'text-slate-500';
                                                    const canView = resource.fileType === 'pdf' || resource.fileType === 'image' || resource.mimeType?.includes('csv') || resource.mimeType?.includes('text') || resource.mimeType?.includes('txt');
                                                    return (
                                                        <div key={resource._id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3 group hover:shadow-sm transition-all">
                                                            <div className={`w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 ${iconColor}`}>
                                                                <Icon size={18} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{resource.title}</h4>
                                                                {resource.description && (
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{resource.description}</p>
                                                                )}
                                                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                                                    <span>{resource.uploadedBy?.name || 'Unknown'}</span>
                                                                    <span>{new Date(resource.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                    {resource.fileSize && <span>{formatFileSize(resource.fileSize)}</span>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {canView && (
                                                                    <button
                                                                        onClick={() => handleResourceView(resource)}
                                                                        className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                                        title="View"
                                                                    >
                                                                        <FaEye size={13} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleResourceDownload(resource)}
                                                                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                                    title={resource.fileType === 'link' ? 'Open Link' : 'Download'}
                                                                >
                                                                    {resource.fileType === 'link' ? <FaLinkIcon size={12} /> : <FaDownload size={12} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Notes Tab */}
                                {activeTab === 'notes' && (
                                    <div>
                                        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                            {/* Notes card header */}
                                            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20">
                                                <div className="flex items-center gap-2">
                                                    <FaStickyNote className="text-amber-500 text-sm" />
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">My Notes</span>
                                                    <span className="text-[10px] text-slate-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-full">Private</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {notes.length > 0 && (
                                                        <span className="text-[10px] text-slate-400 hidden sm:block">{notes.length.toLocaleString()} chars</span>
                                                    )}
                                                    <button
                                                        onClick={handleSaveNotes}
                                                        disabled={isSavingNotes}
                                                        className="flex items-center gap-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
                                                    >
                                                        {isSavingNotes ? (
                                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <FaSave className="text-xs" />
                                                        )}
                                                        <span>{isSavingNotes ? 'Saving…' : 'Save'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Textarea */}
                                            <textarea
                                                className="w-full min-h-[300px] bg-white dark:bg-slate-900/50 p-5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none resize-y placeholder:text-slate-300 dark:placeholder:text-slate-600 leading-7"
                                                placeholder={`Jot down notes for this lecture…\n\n• Key concepts\n• Timestamps e.g. [2:30]\n• Questions to revisit`}
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Discussion Tab */}
                                {activeTab === 'discussion' && (
                                    <div className="space-y-4">
                                        {/* Comment Input */}
                                        <form onSubmit={handleAddComment} className="flex gap-3 items-start">
                                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase shrink-0">
                                                {user?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="flex-1 flex gap-2 items-center bg-slate-50 dark:bg-slate-900 rounded-full px-4 py-2 border border-gray-200 dark:border-slate-700">
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                                                    placeholder="Add a comment…"
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!newComment.trim()}
                                                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                                                >
                                                    Post
                                                </button>
                                            </div>
                                        </form>

                                        {/* Comments List */}
                                        {comments.length > 0 ? (
                                            <>
                                                <div className="space-y-3">
                                                    {comments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((comment) => (
                                                        <div key={comment._id} className="flex gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 uppercase">
                                                                {(comment.user?.name || comment.student?.name || '?').charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                        {(comment.user?._id || comment.student?._id) === user?._id ? 'You' : (comment.user?.name || comment.student?.name || 'Unknown')}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">{comment.details}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Pagination
                                                    currentPage={currentPage}
                                                    totalPages={Math.ceil(comments.length / itemsPerPage)}
                                                    totalItems={comments.length}
                                                    itemsPerPage={itemsPerPage}
                                                    onPageChange={(newPage) => setCurrentPage(newPage)}
                                                    onLimitChange={(newLimit) => { setItemsPerPage(newLimit); setCurrentPage(1); }}
                                                    compact={true}
                                                />
                                            </>
                                        ) : (
                                            <div className="py-8 text-center">
                                                <p className="text-sm text-slate-400 dark:text-slate-500">No comments yet. Be the first!</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center h-full text-slate-400 dark:text-slate-500 space-y-4 p-4">
                            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl">👈</div>
                            <p className="text-base font-medium text-slate-600 dark:text-slate-400 text-center">Select a lecture from the sidebar to start learning.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseView;
