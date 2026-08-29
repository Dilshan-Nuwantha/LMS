import { useState } from 'react';
import api from '../../api/axios';
import { FaRobot, FaSpinner, FaCopy, FaDownload, FaTrash } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';

const AINotesGenerator = ({ courseId }) => {
    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState('detailed');
    const [generating, setGenerating] = useState(false);
    const [notes, setNotes] = useState('');

    const handleGenerate = async () => {
        if (!topic.trim()) {
            showError('Please enter a topic');
            return;
        }
        setGenerating(true);
        setNotes('');
        try {
            const res = await api.post('/ai/generate-notes', { courseId, topic, style });
            setNotes(res.data.notes);
            showSuccess('Notes generated!');
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to generate notes';
            if (msg.includes('No AI configuration')) {
                showError('Set up your AI key first in AI Settings');
            } else {
                showError(err, 'Failed to generate notes');
            }
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(notes);
        showSuccess('Copied to clipboard!');
    };

    const handleDownload = () => {
        const blob = new Blob([notes], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${topic.replace(/\s+/g, '-').toLowerCase()}-notes.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-5">
            {/* Input Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <FaRobot className="text-purple-500" /> AI Notes Generator
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Generate study notes on any topic using AI</p>
                </div>

                <div className="p-5 space-y-4">
                    {/* Topic */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Topic</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            placeholder="e.g. JavaScript Closures, Photosynthesis, SQL Joins..."
                        />
                    </div>

                    {/* Style */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Style</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'detailed', label: 'Detailed' },
                                { value: 'summary', label: 'Summary' },
                                { value: 'bullet-points', label: 'Bullet Points' }
                            ].map(s => (
                                <button
                                    key={s.value}
                                    onClick={() => setStyle(s.value)}
                                    className={`py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                                        style === s.value
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                            : 'border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-gray-300'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !topic.trim()}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {generating ? (
                            <>
                                <FaSpinner className="animate-spin" /> Generating notes...
                            </>
                        ) : (
                            <>
                                <FaRobot /> Generate Notes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Output Section */}
            {notes && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Generated Notes</h4>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Copy"
                            >
                                <FaCopy size={14} />
                            </button>
                            <button
                                onClick={handleDownload}
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Download .md"
                            >
                                <FaDownload size={14} />
                            </button>
                            <button
                                onClick={() => setNotes('')}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Clear"
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="p-5 max-h-[500px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
                            {notes}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AINotesGenerator;
