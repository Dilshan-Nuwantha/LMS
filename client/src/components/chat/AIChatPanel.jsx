import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { FaRobot, FaPaperPlane, FaSpinner, FaPaperclip, FaTimes, FaFilePdf, FaImage, FaTrash, FaPlus, FaKey, FaUserTie, FaExclamationTriangle, FaBan, FaLock, FaPencilAlt, FaCheck } from 'react-icons/fa';
import { showError } from '../../utils/toast';

const AIChatPanel = ({ courseId, courseTitle }) => {
    const [aiStatus, setAiStatus] = useState(null); // { hasOwnKey, allowStudentAI, isBlocked, instructorHasKey }
    const [selectedSource, setSelectedSource] = useState(null); // 'own' | 'instructor'
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const titleInputRef = useRef(null);

    useEffect(() => { loadAIStatus(); }, []);
    useEffect(() => { if (selectedSource) loadConversations(); }, [selectedSource]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const loadAIStatus = async () => {
        try {
            if (courseId) {
                const res = await api.get(`/student-ai/course/${courseId}/ai-status`);
                setAiStatus(res.data);
                // Auto-select if only one option available
                if (res.data.hasOwnKey && !res.data.allowStudentAI) setSelectedSource('own');
                else if (!res.data.hasOwnKey && res.data.instructorHasKey && !res.data.isBlocked) setSelectedSource('instructor');
                // If both available — show choice UI (selectedSource stays null)
            } else {
                const res = await api.get('/student-ai/config');
                setAiStatus({ hasOwnKey: !!res.data, allowStudentAI: false, isBlocked: false, instructorHasKey: false });
                if (res.data) setSelectedSource('own');
            }
        } catch {
            setAiStatus({ hasOwnKey: false, allowStudentAI: false, isBlocked: false, instructorHasKey: false });
        } finally { setLoading(false); }
    };

    const loadConversations = async () => {
        try {
            const res = await api.get(`/student-ai/conversations?courseId=${courseId}`);
            setConversations(res.data);
            if (res.data.length > 0 && !activeConvo) loadConversation(res.data[0]._id);
        } catch { }
    };

    const loadConversation = async (id) => {
        try {
            const res = await api.get(`/student-ai/conversations/${id}`);
            setActiveConvo(res.data);
            setMessages(res.data.messages || []);
        } catch { showError('Failed to load conversation'); }
    };

    const createNew = async () => {
        try {
            const body = { courseId, useInstructorKey: selectedSource === 'instructor' };
            const res = await api.post('/student-ai/conversations', body);
            setActiveConvo(res.data);
            setMessages([]);
            loadConversations();
        } catch { showError('Failed to create conversation'); }
    };

    const deleteConvo = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this conversation?')) return;
        try {
            await api.delete(`/student-ai/conversations/${id}`);
            if (activeConvo?._id === id) { setActiveConvo(null); setMessages([]); }
            loadConversations();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to delete';
            showError(msg);
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !file) return;
        if (!activeConvo) {
            try {
                const body = { courseId, useInstructorKey: selectedSource === 'instructor' };
                const res = await api.post('/student-ai/conversations', body);
                setActiveConvo(res.data);
                setMessages([]);
                await sendToConvo(res.data._id);
                loadConversations();
                return;
            } catch { showError('Failed to create conversation'); return; }
        }
        await sendToConvo(activeConvo._id);
        loadConversations();
    };

    const sendToConvo = async (convoId) => {
        setSending(true);
        const tempUserMsg = { role: 'user', content: input || (file ? `[Uploaded: ${file.name}]` : ''), _id: 'temp-user' };
        setMessages(prev => [...prev, tempUserMsg]);
        const currentInput = input;
        setInput('');
        const formData = new FormData();
        if (currentInput) formData.append('message', currentInput);
        if (file) formData.append('file', file);
        setFile(null);
        try {
            const res = await api.post(`/student-ai/conversations/${convoId}/messages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessages(prev => {
                const filtered = prev.filter(m => m._id !== 'temp-user');
                return [...filtered, res.data.userMessage, res.data.assistantMessage];
            });
        } catch (err) {
            setMessages(prev => prev.filter(m => m._id !== 'temp-user'));
            setInput(currentInput);
            const msg = err.response?.data?.message || 'Failed to get response';
            showError(msg);
        } finally { setSending(false); }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const startEditTitle = () => {
        setTitleInput(activeConvo?.title || '');
        setEditingTitle(true);
        setTimeout(() => titleInputRef.current?.focus(), 50);
    };

    const saveTitle = async () => {
        if (!titleInput.trim() || !activeConvo) { setEditingTitle(false); return; }
        try {
            await api.put(`/student-ai/conversations/${activeConvo._id}/title`, { title: titleInput });
            setActiveConvo(prev => ({ ...prev, title: titleInput.trim() }));
            setConversations(prev => prev.map(c => c._id === activeConvo._id ? { ...c, title: titleInput.trim() } : c));
        } catch { showError('Failed to rename'); }
        setEditingTitle(false);
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') saveTitle();
        if (e.key === 'Escape') setEditingTitle(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-2xl text-purple-500" />
        </div>
    );

    // Blocked state
    if (aiStatus?.isBlocked) return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <FaBan className="text-2xl text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">AI Access Restricted</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                Your instructor has restricted your access to AI chat for this course. Please contact your instructor for more information.
            </p>
        </div>
    );

    // No access at all
    if (!aiStatus?.hasOwnKey && !aiStatus?.instructorHasKey) return (
        <div className="text-center py-16 space-y-4 px-6">
            <FaKey className="text-4xl text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Set Up AI First</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">Configure your own API key to start chatting with the AI assistant.</p>
            <Link to="/ai-settings" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                <FaKey /> Configure AI Key
            </Link>
        </div>
    );

    // Source selection — both options available
    if (!selectedSource && aiStatus?.hasOwnKey && aiStatus?.instructorHasKey) return (
        <div className="flex flex-col items-center justify-center py-12 space-y-6 px-6">
            <div className="text-center">
                <FaRobot className="text-4xl text-purple-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Choose AI Source</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Which API key would you like to use for this chat?</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button
                    onClick={() => setSelectedSource('own')}
                    className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all group"
                >
                    <FaKey className="text-xl text-slate-400 group-hover:text-purple-500 transition-colors" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">My API Key</span>
                    <span className="text-[11px] text-slate-400 text-center">Private — only you can see your chats</span>
                </button>
                <button
                    onClick={() => setSelectedSource('instructor')}
                    className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group"
                >
                    <FaUserTie className="text-xl text-slate-400 group-hover:text-amber-500 transition-colors" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Instructor's Key</span>
                    <span className="text-[11px] text-slate-400 text-center">Instructor can view your conversations</span>
                </button>
            </div>
        </div>
    );

    const isUsingInstructorKey = selectedSource === 'instructor';

    return (
        <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FaRobot className="text-purple-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">AI Assistant</span>
                    {courseTitle && <span className="text-xs text-slate-400">• {courseTitle}</span>}
                    {/* Source badge */}
                    {aiStatus?.hasOwnKey && aiStatus?.instructorHasKey && (
                        <button
                            onClick={() => { setSelectedSource(null); setActiveConvo(null); setMessages([]); }}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${isUsingInstructorKey
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                            }`}
                            title="Switch AI source"
                        >
                            {isUsingInstructorKey ? "Instructor's Key" : 'My Key'}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Editable conversation title */}
                    {activeConvo && (
                        editingTitle ? (
                            <div className="flex items-center gap-1">
                                <input
                                    ref={titleInputRef}
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    onKeyDown={handleTitleKeyDown}
                                    onBlur={saveTitle}
                                    className="text-xs bg-white dark:bg-slate-800 border border-purple-400 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 outline-none w-40"
                                />
                                <button onClick={saveTitle} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors">
                                    <FaCheck size={10} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 group">
                                {conversations.length > 1 ? (
                                    <select
                                        className="text-xs bg-transparent border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-400 max-w-[140px]"
                                        value={activeConvo._id}
                                        onChange={(e) => loadConversation(e.target.value)}
                                    >
                                        {conversations.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                                    </select>
                                ) : (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[140px] truncate">{activeConvo.title}</span>
                                )}
                                <button onClick={startEditTitle} className="p-1 text-slate-300 hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-all rounded" title="Rename conversation">
                                    <FaPencilAlt size={10} />
                                </button>
                            </div>
                        )
                    )}
                    <button onClick={createNew} className="p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="New conversation">
                        <FaPlus size={12} />
                    </button>
                </div>
            </div>

            {/* Instructor key warning */}
            {isUsingInstructorKey && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                    <FaExclamationTriangle className="shrink-0" />
                    <span>Using instructor's API key — your conversations are visible to the instructor and cannot be deleted.</span>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <FaRobot className="text-3xl mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm">Ask a question or upload a PDF/image to get started</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={msg._id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                            ? 'bg-purple-600 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
                        }`}>
                            {msg.attachment && (
                                <div className={`flex items-center gap-1.5 text-xs mb-2 ${msg.role === 'user' ? 'text-purple-200' : 'text-slate-400'}`}>
                                    {msg.attachment.fileType === 'pdf' ? <FaFilePdf /> : <FaImage />}
                                    {msg.attachment.fileName}
                                </div>
                            )}
                            <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                            <FaSpinner className="animate-spin text-purple-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* File preview */}
            {file && (
                <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 w-fit">
                        {file.type === 'application/pdf' ? <FaFilePdf className="text-red-500" /> : <FaImage className="text-blue-500" />}
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 ml-1"><FaTimes size={10} /></button>
                    </div>
                </div>
            )}

            {/* Conversation list delete buttons — shown only for own-key conversations */}
            {conversations.length > 0 && activeConvo && !activeConvo.useInstructorKey && (
                <div className="px-3 py-1.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end">
                    <button
                        onClick={(e) => deleteConvo(activeConvo._id, e)}
                        className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition-colors"
                        title="Delete this conversation"
                    >
                        <FaTrash size={10} /> Delete conversation
                    </button>
                </div>
            )}
            {activeConvo?.useInstructorKey && (
                <div className="px-3 py-1.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-1 text-[11px] text-slate-400">
                    <FaLock size={10} /> Deletion disabled for instructor-key chats
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-end gap-2">
                    <button onClick={() => fileInputRef.current?.click()} disabled={sending}
                        className="p-2.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors disabled:opacity-40">
                        <FaPaperclip />
                    </button>
                    <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
                        onChange={(e) => { setFile(e.target.files[0]); e.target.value = ''; }} />
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder="Ask a question..." rows={1} disabled={sending}
                        className="flex-1 resize-none bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50" />
                    <button onClick={handleSend} disabled={sending || (!input.trim() && !file)}
                        className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChatPanel;
