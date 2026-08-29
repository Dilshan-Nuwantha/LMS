import { FaPlayCircle, FaCheckCircle, FaRegCircle, FaLock, FaBookmark, FaFolderOpen } from 'react-icons/fa';

const LectureSidebarItem = ({
    lecture,
    isSelected,
    onClick,
    status = null,
    showStatus = false,
    customStatuses = [],
    completedStatus = 'Completed',
    sectionImportance = '',
    peerStatus = null,
    markedForRevision = false,
    resourceCount = 0
}) => {
    // Resolve lecture importance (own or inherited from section)
    const importance = lecture.importance === 'None' ? '' : (lecture.importance || sectionImportance);

    // Find the student-set progress status details
    const studentStatusInfo = customStatuses.find(s => s.label === status);

    // Find the admin-set lecture status details (we'll reuse the same color mapping if possible, 
    // or just use the label if no color is found)
    const lectureStatusInfo = customStatuses.find(s => s.label === lecture.status);

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between group mb-1 ${isSelected
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                {/* Icon Section */}
                <div className="shrink-0 flex items-center justify-center w-4">
                    {showStatus ? (
                        <div style={{ color: studentStatusInfo?.color || (isSelected ? '#fff' : '#94a3b8') }}>
                            {status === completedStatus ? <FaCheckCircle size={13} /> : <FaRegCircle size={13} />}
                        </div>
                    ) : (
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-400 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                            {lecture.number}
                        </span>
                    )}
                </div>

                {/* Title */}
                <span className="truncate flex-1 leading-tight">{lecture.title}</span>
            </div>

            {/* Right Side Indicators & Chips */}
            <div className="shrink-0 ml-2 flex items-center gap-1.5 pt-0.5">
                {resourceCount > 0 && (
                    <span 
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-tight bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        title={`${resourceCount} Resource(s)`}
                    >
                        <FaFolderOpen size={8} /> {resourceCount}
                    </span>
                )}
                {importance && importance !== 'None' && (
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wide leading-none ${
                        importance === 'Very Important' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                        importance === 'Important' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                        importance === 'Normal' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                        {importance === 'Very Important' ? 'V.Imp' : importance === 'Important' ? 'Imp' : importance}
                    </span>
                )}
                {showStatus && (
                    <span
                        className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter border transition-colors`}
                        style={{
                            backgroundColor: `${studentStatusInfo?.color || '#94a3b8'}20`,
                            borderColor: `${studentStatusInfo?.color || '#94a3b8'}40`,
                            color: studentStatusInfo?.color || (isSelected ? '#fff' : '#64748b')
                        }}
                    >
                        {status || 'Not Started'}
                    </span>
                )}
                {peerStatus && (
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        title={`Peer: ${peerStatus}`}
                        style={{ backgroundColor: peerStatus === completedStatus ? '#a855f7' : peerStatus === 'In Progress' ? '#c084fc' : '#d4d4d8' }}
                    />
                )}
                {markedForRevision && (
                    <FaBookmark
                        size={9}
                        className={`shrink-0 ${isSelected ? 'text-amber-300' : 'text-amber-500'}`}
                        title="Marked for revision"
                    />
                )}
                {isSelected && !showStatus && <FaPlayCircle className="text-[10px] opacity-70" />}
            </div>
        </button>
    );
};

export default LectureSidebarItem;
