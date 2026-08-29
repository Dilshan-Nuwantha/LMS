import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { FaRobot, FaPaperPlane, FaSpinner, FaPaperclip, FaTimes, FaFilePdf, FaImage, FaTrash, FaPlus, FaKey, FaCog, FaBars, FaComments, FaExclamationTriangle } from 'react-icons/fa';
import { showError } from '../../utils/toast';

const AIChatPage = () => {
    const [searchParams] = useSearchParams();
    const initialCourseId = searchParams.get('courseId');

    const [hasConfig, setHasConfig] = useState(null);
    const [usingInstructorKey, setUsingInstructorKey] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => { checkConfig(); }, []);
    useEffect(() => { if (hasConfig) loadConversations(); }, [hasConfig]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const checkConfig = async () => {
        try {
            const res = await api.get('/student-ai/config');
            if (res.data) {
                setHasConfig(true);
            } else if (initialCourseId) {
                // No own key — check if course instructor allows student AI
                try {
                    const courseRes = await api.get(`/courses/${initialCourseId}`);
                    if (courseRes.data?.allowStudentAI) {
                        setHasConfig(true);
                        setUsingInstructorKey(true);
                    } else {
                        setHasConfig(false);
                    }
                } catch { setHasConfig(false); }
            } else {
                setHasConfig(false);
            }
        } catch { setHasConfig(false); }
        finally { setLoading(false); }
    };

    const loadConversations = async () => {
        try {
            const res = await api.get('/student-ai/conversations');
            setConversations(res.data);
        } catch { }
    };

    const loadConversation = async (id) => {
        try {
            const res = await api.get(`/student-ai/conversations/${id}`);
            setActiveConvo(res.data);
            setMessages(res.data.messages || []);
            setSidebarOpen(false);
        } catch { showError('Failed to load conversation'); }
    };

    const createNew = async () => {
        try {
            const body = {};
            if (initialCourseId) body.courseId = initialCourseId;
            const res = await api.post('/student-ai/conversations', body);
            setActiveConvo(res.data);
            setMessages([]);
            loadConversations();
            setSidebarOpen(false);
        } catch { showError('Failed to create conversation'); }
    };

    const deleteConvo = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this conversation?')) return;
        try {
            await api.delete(`/student-ai/conversations/${id}`);
            if (activeConvo?._id === id) { setActiveConvo(null); setMessages([]); }
            loadConversations();
        } catch { showError('Failed to delete'); }
    };

    const handleSend = async () => {
        if (!input.trim() && !file) return;
        if (!activeConvo) {
            try {
                const body = {};
                if (initialCourseId) body.courseId = initialCourseId;
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
            if (res.data.source === 'instructor') setUsingInstructorKey(true);
            setMessages(prev => {
                const filtered = prev.filter(m => m._id !== 'temp-user');
                return [...filtered, res.data.userMessage, res.data.assistantMessage];
            });
        } catch (err) {
            setMessages(prev => prev.filter(m => m._id !== 'temp-user'));
            setInput(currentInput);
            const msg = err.response?.data?.message || 'Failed to get response';
            if (msg.includes('No AI configuration')) showError('Set up your API key first');
            else showError(msg);
        } finally { setSending(false); }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
            <FaSpinner className="animate-spin text-3xl text-purple-500" />
        </div>
    );

    if (hasConfig === false) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
            <div className="text-center space-y-4">
                <FaKey className="text-5xl text-slate-300 dark:text-slate-600 mx-auto" />
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Set Up AI First</h2>
                <p className="text-sm text-slate-500 max-w-md">Configure your API key to start chatting with the AI assistant.</p>
                <Link to="/ai-settings" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all">
                    <FaKey /> Configure AI Key
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-navbar z-10">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden">
                            <FaBars />
                        </button>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <FaRobot className="text-purple-500" /> AI Chat
                        </h1>
                        {activeConvo?.course && (
                            <span className="text-xs text-slate-400 hidden sm:inline">• {activeConvo.course.title}</span>
                        )}
                    </div>
                    <Link to="/ai-settings" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-500 transition-colors">
                        <FaCog /> Settings
                    </Link>
                </div>
            </div>

            {/* Instructor Key Warning Banner */}
            {usingInstructorKey && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <FaExclamationTriangle className="shrink-0" />
                    <span>This chat uses your instructor's AI key. Your conversations are visible to the instructor and subject to their usage policies.</span>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed lg:static inset-y-0 left-0 z-20 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col transition-transform lg:transition-none pt-[7.5rem] lg:pt-0`}>
                    <div className="p-3 border-b border-gray-100 dark:border-slate-800">
                        <button onClick={createNew} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all">
                            <FaPlus /> New Chat
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {conversations.length === 0 && (
                            <p className="text-center text-xs text-slate-400 py-8">No conversations yet</p>
                        )}
                        {conversations.map(c => (
                            <button key={c._id} onClick={() => loadConversation(c._id)}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all group flex items-center justify-between ${activeConvo?._id === c._id
                                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">{c.title}</p>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                        {c.messageCount} messages
                                    </p>
                                </div>
                                <button onClick={(e) => deleteConvo(c._id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-all">
                                    <FaTrash size={10} />
                                </button>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Overlay for mobile sidebar */}
                {sidebarOpen && (
                    <div className="fixed inset-0 bg-black/30 z-10 lg:hidden" onClick={() => setSidebarOpen(false)} />
                )}

                {/* Chat area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {!activeConvo && messages.length === 0 && (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center space-y-3">
                                    <FaComments className="text-4xl text-slate-300 dark:text-slate-600 mx-auto" />
                                    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Start a conversation</h3>
                                    <p className="text-sm text-slate-400 max-w-sm">Ask questions, upload PDFs or images, and get AI-powered study help.</p>
                                </div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={msg._id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white rounded-br-md'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md border border-gray-200 dark:border-slate-700'
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
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <FaSpinner className="animate-spin text-purple-500" /> Thinking...
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* File preview */}
                    {file && (
                        <div className="px-4 sm:px-6 py-2 bg-gray-50/80 dark:bg-slate-950/50 border-t border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 w-fit border border-gray-200 dark:border-slate-700">
                                {file.type === 'application/pdf' ? <FaFilePdf className="text-red-500" /> : <FaImage className="text-blue-500" />}
                                <span className="truncate max-w-[200px]">{file.name}</span>
                                <span className="text-slate-300">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                                <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 ml-1"><FaTimes size={10} /></button>
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="max-w-3xl mx-auto flex items-end gap-2">
                            <button onClick={() => fileInputRef.current?.click()} disabled={sending}
                                className="p-2.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors disabled:opacity-40" title="Upload PDF or image">
                                <FaPaperclip />
                            </button>
                            <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
                                onChange={(e) => { if (e.target.files[0]) setFile(e.target.files[0]); e.target.value = ''; }} />
                            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                                placeholder="Ask a question..." rows={1} disabled={sending}
                                className="flex-1 resize-none bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 max-h-32" />
                            <button onClick={handleSend} disabled={sending || (!input.trim() && !file)}
                                className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIChatPage;
