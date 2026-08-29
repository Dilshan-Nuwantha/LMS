import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaEdit, FaTrash, FaChevronDown, FaBook, FaClipboardList, FaSearch, FaUserGraduate, FaCheckCircle, FaPlayCircle, FaClock, FaTimes, FaFilter, FaBell } from 'react-icons/fa';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

const CurriculumTab = ({
    courseId,
    course,
    expandedSections,
    toggleSection,
    isOwner,
    userPermissions,
    // Section handlers
    onOpenSectionModal,
    onEditSection,
    onDeleteSection,
    onToggleSectionVisibility,
    // Lecture handlers
    onOpenLectureModal,
    onEditLecture,
    onDeleteLecture,
    onToggleLectureVisibility,
    // Toggles
    onTogglePeerProgress,
    onToggleStudentAI,
    // Student progress overlay
    selectedStudentId,
    selectedStudentName,
    studentProgressData,
    studentProgressLoading,
    sectionProgressMap,
    lectureProgressMap,
    onSelectStudent,
    onClearStudent,
    getProgressStatusIcon,
    getProgressStatusColor,
    onSendNotification,
}) => {
    const navigate = useNavigate();

    // Curriculum filters
    const [currVisibility, setCurrVisibility] = useState('all');
    const [currImportance, setCurrImportance] = useState('all');
    const [lectureSearch, setLectureSearch] = useState('');

    // Student selector state
    const [showStudentSelector, setShowStudentSelector] = useState(false);
    const [progressStudentKeyword, setProgressStudentKeyword] = useState('');
    const [debouncedProgressKeyword, setDebouncedProgressKeyword] = useState('');
    const [progressStudentList, setProgressStudentList] = useState([]);
    const studentSelectorRef = useRef(null);

    // Debounce progress student search keyword
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedProgressKeyword(progressStudentKeyword), 400);
        return () => clearTimeout(timer);
    }, [progressStudentKeyword]);

    // Close student selector on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (studentSelectorRef.current && !studentSelectorRef.current.contains(e.target)) {
                setShowStudentSelector(false);
            }
        };
        if (showStudentSelector) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showStudentSelector]);

    // Fetch student list for progress selector
    const fetchProgressStudentList = async (keyword = '') => {
        try {
            const res = await api.get(`/courses/${courseId}/enrolled-students?keyword=${keyword}`);
            setProgressStudentList(res.data || []);
        } catch (err) {
            console.error("Failed to fetch student list for progress", err);
        }
    };

    useEffect(() => {
        if (showStudentSelector) {
            fetchProgressStudentList(debouncedProgressKeyword);
        }
    }, [showStudentSelector, debouncedProgressKeyword]);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Sections Header & Add Form */}
            <div className="flex items-start sm:items-end justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Course Curriculum</h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Organize your course content into sections and lectures</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSendNotification}
                        className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors h-8 sm:h-9"
                        title="Send notification to students"
                    >
                        <FaBell className="text-slate-400" size={10} /> <span className="hidden xs:inline">Notify</span>
                    </button>
                    <button
                        onClick={() => navigate(`/admin/course/${courseId}/quizzes`)}
                        className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors h-8 sm:h-9"
                    >
                        <FaClipboardList className="text-slate-400" size={10} /> <span className="hidden xs:inline">Quizzes</span>
                    </button>
                    <button
                        onClick={onOpenSectionModal}
                        className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors h-8 sm:h-9"
                    >
                        + Add Section
                    </button>
                </div>
            </div>

            {/* Student Progress & Peer Settings */}
            {(isOwner || userPermissions.permissions.manage_students || userPermissions.permissions.full_access) && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg">
                {!selectedStudentId ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                        {/* Student Selector */}
                        <div className="relative" ref={studentSelectorRef}>
                            <button
                                onClick={() => {
                                    setShowStudentSelector(!showStudentSelector);
                                    setProgressStudentKeyword('');
                                }}
                                className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                            >
                                <FaUserGraduate className="text-slate-400" size={11} />
                                <span>View Student Progress</span>
                                <FaChevronDown className={`text-slate-400 text-[9px] transition-transform ${showStudentSelector ? 'rotate-180' : ''}`} />
                            </button>
                            {showStudentSelector && (
                                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                    <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                                        <div className="relative">
                                            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                                            <input
                                                type="text"
                                                placeholder="Search students..."
                                                value={progressStudentKeyword}
                                                onChange={(e) => setProgressStudentKeyword(e.target.value)}
                                                className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {progressStudentList.length > 0 ? (
                                            progressStudentList.map(s => (
                                                <button
                                                    key={s._id}
                                                    onClick={() => {
                                                        onSelectStudent(s._id, s.name);
                                                        setShowStudentSelector(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                        {s.name?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-4 text-xs text-slate-400 text-center italic">No students found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Toggles Group */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">Peer Progress</span>
                                <button
                                    type="button"
                                    onClick={onTogglePeerProgress}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${course.allowPeerProgress ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    title={course.allowPeerProgress ? 'Students can view peer progress (click to disable)' : 'Students cannot view peer progress (click to enable)'}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${course.allowPeerProgress ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                                </button>
                            </div>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">Student AI</span>
                                <button
                                    type="button"
                                    onClick={onToggleStudentAI}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${course.allowStudentAI ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    title={course.allowStudentAI ? 'AI Access: ON — Students without their own API key will use yours for AI chat in this course. Click to disable.' : 'AI Access: OFF — Students need their own API key for AI chat. Click to let them use yours.'}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${course.allowStudentAI ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-2">
                        <FaUserGraduate className="text-blue-500 shrink-0" size={12} />
                        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                {selectedStudentName}
                            </span>
                            {studentProgressData && (
                                <span className="text-[10px] font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                                    {studentProgressData.progress.completedLectures}/{studentProgressData.progress.totalLectures} completed ({studentProgressData.progress.progressPercent}%)
                                </span>
                            )}
                            {studentProgressLoading && (
                                <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>
                            )}
                        </div>
                        <button
                            onClick={onClearStudent}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                            title="Clear"
                        >
                            <FaTimes size={11} />
                        </button>
                    </div>
                )}
            </div>
            )}

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
                {/* Visibility Group — Left */}
                <div className="flex items-center shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mr-1">Visibility</span>
                    {[{ v: 'all', l: 'All' }, { v: 'public', l: 'Public' }, { v: 'hidden', l: 'Hidden' }].map(f => (
                        <button key={f.v} onClick={() => setCurrVisibility(f.v)}
                            className={`px-3 py-2.5 text-[11px] sm:text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${currVisibility === f.v
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

            {/* Sections List */}
            <div className="space-y-4">
                {course.sections && course.sections.length > 0 ? (
                    course.sections
                    .filter(section => {
                        if (currVisibility === 'public' && !section.isPublic) return false;
                        if (currVisibility === 'hidden' && section.isPublic) return false;
                        if (currImportance !== 'all') {
                            const secImp = section.importance || '';
                            if (secImp !== currImportance) return false;
                        }
                        if (lectureSearch.trim()) {
                            const q = lectureSearch.trim().toLowerCase();
                            const titleMatch = section.title.toLowerCase().includes(q);
                            const lectureMatch = section.lectures?.some(l => l.title.toLowerCase().includes(q));
                            if (!titleMatch && !lectureMatch) return false;
                        }
                        return true;
                    })
                    .map((section, sectionIndex) => (
                        <div key={section._id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden group transition-colors duration-300">
                            <div
                                className="bg-gray-50/50 dark:bg-slate-950/50 px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center gap-2 transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50"
                                onClick={() => toggleSection(section._id)}
                            >
                                <h3 className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-1.5 sm:gap-2 select-none min-w-0">
                                    <div className={`transition-transform duration-200 shrink-0 ${expandedSections[section._id] ? 'rotate-180' : ''}`}>
                                        <FaChevronDown className="text-slate-400 text-xs" />
                                    </div>
                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-[10px] sm:text-xs font-bold text-white dark:text-slate-900 shrink-0">
                                        {sectionIndex + 1}
                                    </div>
                                    <span className="truncate">{section.title}</span>
                                    {section.isPreview && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wide shrink-0">
                                            Preview
                                        </span>
                                    )}
                                    <span className="text-[10px] sm:text-xs text-slate-400 font-normal shrink-0">({section.lectures?.length || 0})</span>
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
                                    {selectedStudentId && sectionProgressMap[section._id] && (
                                        <span className="flex items-center gap-1.5 shrink-0 ml-1">
                                            <span className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 hidden sm:block">
                                                <span
                                                    className="bg-green-500 h-1.5 rounded-full block transition-all"
                                                    style={{ width: `${sectionProgressMap[section._id].progressPercent}%` }}
                                                />
                                            </span>
                                            <span className="text-[9px] font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                                                {sectionProgressMap[section._id].completedCount}/{sectionProgressMap[section._id].totalCount}
                                            </span>
                                        </span>
                                    )}
                                </h3>
                                <div className="flex items-center gap-1 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => onToggleSectionVisibility(section._id, section.isPublic)}
                                        className="p-1 sm:p-1.5 transition-colors"
                                        title={section.isPublic ? "Public (Click to Hide)" : "Hidden (Click to Make Public)"}
                                    >
                                        {section.isPublic ? <FaEye className="text-green-500" size={12} /> : <FaEyeSlash className="text-slate-400" size={12} />}
                                    </button>
                                    <button
                                        onClick={() => onEditSection(section)}
                                        className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                        title="Edit Section"
                                    >
                                        <FaEdit size={11} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteSection(section._id)}
                                        className="p-1 sm:p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Delete Section"
                                    >
                                        <FaTrash size={11} />
                                    </button>
                                    <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-0.5 sm:mx-1 hidden xs:block"></div>
                                    <button
                                        onClick={() => onOpenLectureModal(section._id, (section.lectures?.length || 0) + 1)}
                                        className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium transition-colors bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-sm whitespace-nowrap"
                                    >
                                        + <span className="hidden xs:inline">Add </span>Lecture
                                    </button>
                                </div>
                            </div>

                            {/* Lectures List */}
                            {expandedSections[section._id] && (
                                <div className="divide-y divide-gray-100 dark:divide-slate-800 animate-in slide-in-from-top-2 duration-200">
                                    {section.lectures && section.lectures.length > 0 ? (
                                        [...section.lectures].sort((a, b) => a.number - b.number).map((lec) => (
                                            <div key={lec._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm shrink-0">
                                                        {lec.number}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <a
                                                            href={`/course/${courseId}/lecture/${lec._id}`}
                                                            className="font-medium text-xs sm:text-sm text-slate-900 dark:text-white hover:underline decoration-slate-400 transition-all cursor-pointer line-clamp-1"
                                                        >
                                                            {lec.title}
                                                        </a>
                                                        <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
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
                                                            {lec.dueDate && (
                                                                <span className="text-[9px] sm:text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1 sm:px-1.5 py-0.5 rounded font-medium">
                                                                    Due {new Date(lec.dueDate).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            {lec.resourceUrl && (
                                                                <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 hidden xs:inline">Resource Attached</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {selectedStudentId && lectureProgressMap[lec._id] && (
                                                    <span
                                                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                                                        style={{
                                                            backgroundColor: `${getProgressStatusColor(lectureProgressMap[lec._id].status)}15`,
                                                            color: getProgressStatusColor(lectureProgressMap[lec._id].status)
                                                        }}
                                                    >
                                                        {getProgressStatusIcon(lectureProgressMap[lec._id].status)}
                                                        <span className="hidden sm:inline">{lectureProgressMap[lec._id].status}</span>
                                                    </span>
                                                )}
                                                {selectedStudentId && !lectureProgressMap[lec._id] && (
                                                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-400">
                                                        <FaClock className="text-slate-400" size={10} />
                                                        <span className="hidden sm:inline">Not Started</span>
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button
                                                        onClick={() => onToggleLectureVisibility(lec._id, lec.isPublic)}
                                                        className="p-1.5 sm:p-2 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                                        title={lec.isPublic ? "Public (Click to Hide)" : "Hidden (Click to Make Public)"}
                                                    >
                                                        {lec.isPublic ? <FaEye className="text-green-500" size={11} /> : <FaEyeSlash className="text-slate-400" size={11} />}
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        {lec.isPreview && (
                                                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                                Preview
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => onEditLecture(lec, section._id)}
                                                            className="p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <FaEdit size={11} />
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteLecture(lec._id)}
                                                            className="p-1.5 sm:p-2 text-red-300 dark:text-red-900/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <FaTrash size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center">
                                            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No lectures yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 border-dashed transition-colors">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FaBook className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white">Start your curriculum</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add a section to organize your lectures.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurriculumTab;
