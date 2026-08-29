import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { FaArrowLeft, FaSave, FaTrash, FaRobot, FaKey, FaCheckCircle, FaSpinner, FaFlask } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';

const PROVIDERS = {
    openai: {
        label: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        placeholder: 'sk-...',
        helpUrl: 'https://platform.openai.com/api-keys'
    },
    gemini: {
        label: 'Google Gemini',
        models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash', 'gemini-2.0-flash'],
        placeholder: 'AIza...',
        helpUrl: 'https://aistudio.google.com/apikey'
    },
    anthropic: {
        label: 'Anthropic',
        models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250514'],
        placeholder: 'sk-ant-...',
        helpUrl: 'https://console.anthropic.com/settings/keys'
    }
};

const StudentAISettings = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [hasExisting, setHasExisting] = useState(false);

    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gpt-4o');
    const [maskedKey, setMaskedKey] = useState('');

    useEffect(() => { fetchConfig(); }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/student-ai/config');
            if (res.data) {
                setProvider(res.data.provider);
                setModel(res.data.model);
                setMaskedKey(res.data.apiKeyMasked);
                setHasExisting(true);
            }
        } catch { }
        finally { setLoading(false); }
    };

    const handleProviderChange = (p) => {
        setProvider(p);
        setModel(PROVIDERS[p].models[0]);
        setApiKey('');
        setMaskedKey('');
    };

    const handleSave = async () => {
        if (!apiKey) { showError('Please enter your API key'); return; }
        setSaving(true);
        try {
            const res = await api.post('/student-ai/config', { provider, apiKey, model });
            setMaskedKey(res.data.apiKeyMasked);
            setApiKey('');
            setHasExisting(true);
            showSuccess('AI configuration saved!');
        } catch (err) {
            showError(err, 'Failed to save');
        } finally { setSaving(false); }
    };

    const handleTest = async () => {
        if (!apiKey) { showError('Enter your API key first'); return; }
        setTesting(true);
        try {
            const res = await api.post('/student-ai/test', { provider, apiKey, model });
            if (res.data.success) showSuccess('Connection successful!');
            else showError('Unexpected response');
        } catch (err) {
            const msg = err.response?.data?.message || 'Connection test failed';
            if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                showError('API key valid but quota exhausted. Enable billing or wait.');
            } else showError(msg);
        } finally { setTesting(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Remove your AI configuration?')) return;
        try {
            await api.delete('/student-ai/config');
            setHasExisting(false);
            setApiKey('');
            setMaskedKey('');
            setProvider('openai');
            setModel('gpt-4o');
            showSuccess('AI configuration removed');
        } catch { showError('Failed to delete'); }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
            <div className="animate-pulse text-slate-500">Loading AI settings...</div>
        </div>
    );

    const cur = PROVIDERS[provider];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-12">
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-navbar z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <FaArrowLeft /> <span className="hidden sm:inline">Back</span>
                    </button>
                    <h1 className="text-lg font-bold flex items-center gap-2">
                        <FaRobot className="text-purple-500" /> AI Chat Settings
                    </h1>
                    <div className="w-20" />
                </div>
            </div>

            <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
                {hasExisting && (
                    <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-5 py-4">
                        <FaCheckCircle className="text-green-500 text-lg shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-green-800 dark:text-green-300">AI Connected</p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                                {cur.label} &middot; {model} &middot; Key: {maskedKey}
                            </p>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">AI Provider</h2>
                        <p className="text-xs text-slate-400 mt-1">Choose your AI provider for the chatbot</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(PROVIDERS).map(([key, p]) => (
                                <button key={key} onClick={() => handleProviderChange(key)}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${provider === key
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}>
                                    <span className={`text-sm font-bold ${provider === key ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {p.label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase">Model</label>
                            <select className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                value={model} onChange={(e) => setModel(e.target.value)}>
                                {cur.models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                <FaKey className="text-xs" /> API Key
                            </label>
                            <input type="password"
                                className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                                value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                                placeholder={hasExisting ? `Current: ${maskedKey} (enter new to change)` : cur.placeholder} />
                            <p className="text-[11px] text-slate-400">
                                Get your key from{' '}
                                <a href={cur.helpUrl} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">{cur.label} Dashboard</a>.
                                Your key is encrypted and never shown again.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <button onClick={handleTest} disabled={!apiKey || testing}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                {testing ? <FaSpinner className="animate-spin" /> : <FaFlask />}
                                {testing ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button onClick={handleSave} disabled={!apiKey || saving}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                            {hasExisting && (
                                <button onClick={handleDelete}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ml-auto">
                                    <FaTrash /> Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">How it works</h3>
                    <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                        <li className="flex items-start gap-2"><span className="text-purple-500 mt-0.5 font-bold">1.</span> Enter your API key from any supported provider</li>
                        <li className="flex items-start gap-2"><span className="text-purple-500 mt-0.5 font-bold">2.</span> Your key is encrypted with AES-256 and stored securely</li>
                        <li className="flex items-start gap-2"><span className="text-purple-500 mt-0.5 font-bold">3.</span> Use the AI Chat to ask questions about your courses</li>
                        <li className="flex items-start gap-2"><span className="text-purple-500 mt-0.5 font-bold">4.</span> Upload PDFs or images and the AI will analyze them</li>
                        <li className="flex items-start gap-2"><span className="text-purple-500 mt-0.5 font-bold">5.</span> API calls use YOUR key — you control the cost</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default StudentAISettings;
