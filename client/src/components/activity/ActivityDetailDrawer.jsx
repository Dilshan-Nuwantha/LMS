import { useState } from 'react';
import { FaTimes, FaCalendarAlt } from 'react-icons/fa';
import { getActionIcon, getMethodColor } from '../../utils/activityUtils';

const ActivityDetailDrawer = ({ log, onClose }) => {
    const [view, setView] = useState('simple');

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        {getActionIcon(log.action)}
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{log.action}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            log.method === 'POST' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            log.method === 'PUT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            log.method === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                        }`}>{log.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 text-xs font-medium">
                            <button onClick={() => setView('simple')} className={`px-3 py-1.5 transition-colors ${view === 'simple' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>Simple</button>
                            <button onClick={() => setView('json')} className={`px-3 py-1.5 transition-colors ${view === 'json' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>JSON</button>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><FaTimes /></button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {view === 'simple' ? (
                        <div className="p-5 space-y-5">
                            {/* User (only if present — admin view) */}
                            {log.user && (
                                <section>
                                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">User</h3>
                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3">
                                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-600 dark:text-slate-300 shrink-0 uppercase">
                                            {log.user?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-slate-900 dark:text-white">{log.user?.name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">{log.user?.email}</div>
                                        </div>
                                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded font-bold uppercase ${log.user?.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : log.user?.role === 'instructor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            {log.user?.role}
                                        </span>
                                    </div>
                                </section>
                            )}

                            {/* Resource */}
                            {(log.course || log.lecture) && (
                                <section>
                                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Resource</h3>
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 space-y-2">
                                        {log.course && (
                                            <div className="flex items-start gap-2">
                                                <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0 mt-0.5">Course</span>
                                                <span className="text-sm text-slate-800 dark:text-slate-200">{log.course.title}</span>
                                            </div>
                                        )}
                                        {log.lecture && (
                                            <div className="flex items-start gap-2">
                                                <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0 mt-0.5">Lecture</span>
                                                <span className="text-sm text-slate-800 dark:text-slate-200">#{log.lecture.number} — {log.lecture.title}</span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Details */}
                            <section>
                                <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Details</h3>
                                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 space-y-2">
                                    <p className="text-sm text-slate-800 dark:text-slate-200">{log.details || '—'}</p>
                                    {log.url && (
                                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded px-2.5 py-1.5 break-all">
                                            <span className={`font-bold mr-2 ${getMethodColor(log.method)}`}>{log.method}</span>
                                            {log.url}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Request Data */}
                            {log.data && Object.keys(log.data).length > 0 && (
                                <section>
                                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Request Data</h3>
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 divide-y divide-gray-100 dark:divide-slate-700">
                                        {Object.entries(log.data).filter(([, v]) => v !== '' && v !== null && v !== undefined).map(([key, value]) => (
                                            <div key={key} className="py-2 first:pt-0 last:pb-0 flex gap-3 items-start">
                                                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0 min-w-[120px]">{key}</span>
                                                <div className="text-xs text-slate-800 dark:text-slate-200 break-all flex-1">
                                                    {typeof value === 'boolean' ? (
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${value ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                            {value ? 'true' : 'false'}
                                                        </span>
                                                    ) : Array.isArray(value) ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {value.map((v, i) => (
                                                                <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                                    {typeof v === 'object' ? (v.label || v.title || v.name || JSON.stringify(v)) : String(v)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : typeof value === 'object' ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(value).map(([k, v]) => (
                                                                <span key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${v === true ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : v === false ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                                                                    {k}: {String(v)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : String(value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Timestamp */}
                            <section>
                                <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Timestamp</h3>
                                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <FaCalendarAlt className="text-slate-400 shrink-0" />
                                    {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' })}
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="p-5">
                            <pre className="text-xs font-mono bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-4 overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all leading-relaxed">
                                {JSON.stringify(log, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityDetailDrawer;
