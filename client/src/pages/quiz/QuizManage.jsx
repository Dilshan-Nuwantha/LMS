import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaChartBar, FaClock, FaCheckCircle, FaTimesCircle, FaQuestionCircle, FaRobot, FaSpinner } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';

const QuizManage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        sectionId: '',
        passingScore: 70,
        timeLimit: 0,
        attemptsAllowed: -1,
        isRequired: false,
        questions: []
    });

    // Question form state
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
    const [questionForm, setQuestionForm] = useState({
        questionText: '',
        questionType: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1
    });

    // AI Generate state
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiForm, setAiForm] = useState({
        topic: '',
        numQuestions: 5,
        difficulty: 'intermediate',
        questionTypes: ['mcq']
    });

    useEffect(() => {
        fetchData();
    }, [courseId]);

    const fetchData = async () => {
        try {
            const [courseRes, quizzesRes] = await Promise.all([
                api.get(`/courses/${courseId}`),
                api.get(`/quizzes/course/${courseId}`)
            ]);
            setCourse(courseRes.data);
            setQuizzes(quizzesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            sectionId: '',
            passingScore: 70,
            timeLimit: 0,
            attemptsAllowed: -1,
            isRequired: false,
            questions: []
        });
        setEditingQuiz(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const handleOpenEdit = (quiz) => {
        setEditingQuiz(quiz);
        setFormData({
            title: quiz.title,
            description: quiz.description || '',
            sectionId: quiz.section || '',
            passingScore: quiz.passingScore,
            timeLimit: quiz.timeLimit,
            attemptsAllowed: quiz.attemptsAllowed,
            isRequired: quiz.isRequired,
            questions: quiz.questions || []
        });
        setShowModal(true);
    };

    const handleSaveQuiz = async () => {
        if (!formData.title.trim()) {
            showError('Please enter a quiz title');
            return;
        }

        if (formData.questions.length === 0) {
            showError('Please add at least one question');
            return;
        }

        try {
            if (editingQuiz) {
                const res = await api.put(`/quizzes/${editingQuiz._id}`, {
                    ...formData,
                    sectionId: formData.sectionId || null
                });
                setQuizzes(quizzes.map(q => q._id === editingQuiz._id ? res.data : q));
                showSuccess('Quiz updated successfully');
            } else {
                const res = await api.post('/quizzes', {
                    courseId,
                    ...formData,
                    sectionId: formData.sectionId || null
                });
                setQuizzes([...quizzes, res.data]);
                showSuccess('Quiz created successfully');
            }
            setShowModal(false);
            resetForm();
        } catch (error) {
            showError(error, 'Failed to save quiz');
        }
    };

    const handleDeleteQuiz = async (quizId) => {
        if (!confirm('Are you sure you want to delete this quiz? All student attempts will be lost.')) return;

        try {
            await api.delete(`/quizzes/${quizId}`);
            setQuizzes(quizzes.filter(q => q._id !== quizId));
            showSuccess('Quiz deleted successfully');
        } catch (error) {
            showError(error, 'Failed to delete quiz');
        }
    };

    const handleToggleActive = async (quiz) => {
        try {
            const res = await api.put(`/quizzes/${quiz._id}`, { isActive: !quiz.isActive });
            setQuizzes(quizzes.map(q => q._id === quiz._id ? res.data : q));
            showSuccess(res.data.isActive ? 'Quiz activated' : 'Quiz deactivated');
        } catch (error) {
            showError('Failed to update quiz status');
        }
    };

    // Question handlers
    const resetQuestionForm = () => {
        setQuestionForm({
            questionText: '',
            questionType: 'mcq',
            options: ['', '', '', ''],
            correctAnswer: 0,
            points: 1
        });
        setEditingQuestionIndex(null);
    };

    const handleAddQuestion = () => {
        resetQuestionForm();
        setShowQuestionModal(true);
    };

    const handleEditQuestion = (index) => {
        const q = formData.questions[index];
        setQuestionForm({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.questionType === 'mcq' ? [...q.options] : ['', '', '', ''],
            correctAnswer: q.correctAnswer,
            points: q.points
        });
        setEditingQuestionIndex(index);
        setShowQuestionModal(true);
    };

    const handleSaveQuestion = () => {
        if (!questionForm.questionText.trim()) {
            showError('Please enter question text');
            return;
        }

        if (questionForm.questionType === 'mcq') {
            const validOptions = questionForm.options.filter(o => o.trim());
            if (validOptions.length < 2) {
                showError('Please add at least 2 options');
                return;
            }
        }

        const newQuestion = {
            questionText: questionForm.questionText,
            questionType: questionForm.questionType,
            options: questionForm.questionType === 'mcq' ? questionForm.options.filter(o => o.trim()) : [],
            correctAnswer: questionForm.questionType === 'true-false'
                ? questionForm.correctAnswer === 'true' || questionForm.correctAnswer === true
                : questionForm.correctAnswer,
            points: questionForm.points
        };

        if (editingQuestionIndex !== null) {
            const updatedQuestions = [...formData.questions];
            updatedQuestions[editingQuestionIndex] = newQuestion;
            setFormData({ ...formData, questions: updatedQuestions });
        } else {
            setFormData({ ...formData, questions: [...formData.questions, newQuestion] });
        }

        setShowQuestionModal(false);
        resetQuestionForm();
    };

    const handleDeleteQuestion = (index) => {
        setFormData({
            ...formData,
            questions: formData.questions.filter((_, i) => i !== index)
        });
    };

    // AI Generate handler
    const handleAIGenerate = async () => {
        if (!aiForm.topic.trim()) {
            showError('Please enter a topic');
            return;
        }
        setAiGenerating(true);
        try {
            const res = await api.post('/ai/generate-quiz', {
                courseId,
                topic: aiForm.topic,
                numQuestions: aiForm.numQuestions,
                questionTypes: aiForm.questionTypes,
                difficulty: aiForm.difficulty
            });
            const generated = res.data.questions || [];
            if (generated.length === 0) {
                showError('AI returned no questions. Try a different topic.');
                return;
            }
            // Open quiz creation modal pre-filled with AI questions
            resetForm();
            setFormData(prev => ({
                ...prev,
                title: `${aiForm.topic} Quiz`,
                description: `AI-generated quiz on ${aiForm.topic} (${aiForm.difficulty})`,
                questions: generated
            }));
            setShowAIModal(false);
            setShowModal(true);
            showSuccess(`${generated.length} questions generated! Review and save.`);
        } catch (err) {
            const msg = err.response?.data?.message || 'AI generation failed';
            if (msg.includes('No AI configuration')) {
                showError('Set up your AI key first in AI Settings');
            } else {
                showError(msg);
            }
        } finally {
            setAiGenerating(false);
        }
    };

    const toggleQuestionType = (type) => {
        setAiForm(prev => {
            const types = prev.questionTypes.includes(type)
                ? prev.questionTypes.filter(t => t !== type)
                : [...prev.questionTypes, type];
            return { ...prev, questionTypes: types.length > 0 ? types : [type] };
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-12 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <button
                            onClick={() => navigate(`/admin/course/${courseId}`)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                        >
                            <FaArrowLeft />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">Quizzes</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{course?.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAIModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <FaRobot className="text-xs" /> AI Generate
                        </button>
                        <button
                            onClick={handleOpenCreate}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <FaPlus className="text-xs" /> Create Quiz
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-4xl">
                {quizzes.length > 0 ? (
                    <div className="space-y-4">
                        {quizzes.map(quiz => (
                            <div key={quiz._id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{quiz.title}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                quiz.isActive
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                                            }`}>
                                                {quiz.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {quiz.description && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{quiz.description}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <FaQuestionCircle className="text-slate-400" />
                                                {quiz.questions?.length || 0} questions
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FaCheckCircle className="text-slate-400" />
                                                Pass: {quiz.passingScore}%
                                            </span>
                                            {quiz.timeLimit > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <FaClock className="text-slate-400" />
                                                    {quiz.timeLimit} min
                                                </span>
                                            )}
                                            {quiz.attemptsAllowed > 0 && (
                                                <span>{quiz.attemptsAllowed} attempts max</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/admin/course/${courseId}/quiz/${quiz._id}/analytics`)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="View Analytics"
                                        >
                                            <FaChartBar />
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(quiz)}
                                            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(quiz)}
                                            className={`p-2 rounded-lg transition-colors ${
                                                quiz.isActive
                                                    ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                    : 'text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                                            }`}
                                            title={quiz.isActive ? 'Deactivate' : 'Activate'}
                                        >
                                            {quiz.isActive ? <FaCheckCircle /> : <FaTimesCircle />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteQuiz(quiz._id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FaQuestionCircle className="text-blue-400 text-2xl" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No quizzes yet</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                            Create quizzes to test student understanding and track their progress.
                        </p>
                        <button
                            onClick={handleOpenCreate}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors"
                        >
                            <FaPlus className="text-xs" /> Create Your First Quiz
                        </button>
                    </div>
                )}
            </div>

            {/* Quiz Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200 dark:border-slate-800">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                {editingQuiz ? 'Edit Quiz' : 'Create Quiz'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Quiz title"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
                                    placeholder="Optional description"
                                />
                            </div>

                            {/* Section */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Section (optional)</label>
                                <select
                                    value={formData.sectionId}
                                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="">No section (course-wide)</option>
                                    {course?.sections?.map(section => (
                                        <option key={section._id} value={section._id}>{section.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Settings Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Pass Score %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.passingScore}
                                        onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Time (min)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.timeLimit}
                                        onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0 = no limit"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Max Attempts</label>
                                    <input
                                        type="number"
                                        min="-1"
                                        value={formData.attemptsAllowed}
                                        onChange={(e) => setFormData({ ...formData, attemptsAllowed: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="-1 = unlimited"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isRequired}
                                            onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Required</span>
                                    </label>
                                </div>
                            </div>

                            {/* Questions */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Questions ({formData.questions.length})
                                    </label>
                                    <button
                                        onClick={handleAddQuestion}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    >
                                        <FaPlus className="text-xs" /> Add Question
                                    </button>
                                </div>

                                {formData.questions.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {formData.questions.map((q, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-slate-900 dark:text-white truncate">{q.questionText}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {q.questionType.toUpperCase()} • {q.points} pt{q.points !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => handleEditQuestion(idx)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                                    >
                                                        <FaEdit size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(idx)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No questions yet. Add at least one question.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveQuiz}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                            >
                                {editingQuiz ? 'Save Changes' : 'Create Quiz'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Generate Modal */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-800">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <FaRobot className="text-purple-500" /> Generate Quiz with AI
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                AI will create questions that you can review and edit before saving.
                            </p>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Topic */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Topic *</label>
                                <input
                                    type="text"
                                    value={aiForm.topic}
                                    onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    placeholder="e.g. React Hooks, Python OOP, Cell Biology..."
                                />
                            </div>

                            {/* Number of Questions */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Number of Questions: <span className="text-purple-600 font-bold">{aiForm.numQuestions}</span>
                                </label>
                                <input
                                    type="range"
                                    min="3"
                                    max="20"
                                    value={aiForm.numQuestions}
                                    onChange={(e) => setAiForm({ ...aiForm, numQuestions: parseInt(e.target.value) })}
                                    className="w-full accent-purple-600"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>3</span><span>20</span>
                                </div>
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Difficulty</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['easy', 'intermediate', 'hard'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setAiForm({ ...aiForm, difficulty: d })}
                                            className={`py-2 rounded-lg text-sm font-medium border-2 transition-all capitalize ${
                                                aiForm.difficulty === d
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                    : 'border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-gray-300'
                                            }`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Question Types */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Question Types</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: 'mcq', label: 'Multiple Choice' },
                                        { value: 'true-false', label: 'True/False' },
                                        { value: 'short-answer', label: 'Short Answer' }
                                    ].map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => toggleQuestionType(type.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                                                aiForm.questionTypes.includes(type.value)
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                    : 'border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                            <button
                                onClick={() => setShowAIModal(false)}
                                disabled={aiGenerating}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAIGenerate}
                                disabled={aiGenerating || !aiForm.topic.trim()}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {aiGenerating ? (
                                    <>
                                        <FaSpinner className="animate-spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        <FaRobot /> Generate Questions
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Question Modal */}
            {showQuestionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-slate-800">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {editingQuestionIndex !== null ? 'Edit Question' : 'Add Question'}
                            </h3>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Question Text */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Question *</label>
                                <textarea
                                    value={questionForm.questionText}
                                    onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Enter your question"
                                />
                            </div>

                            {/* Question Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
                                    <select
                                        value={questionForm.questionType}
                                        onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value, correctAnswer: e.target.value === 'true-false' ? true : 0 })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="mcq">Multiple Choice</option>
                                        <option value="true-false">True/False</option>
                                        <option value="short-answer">Short Answer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Points</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={questionForm.points}
                                        onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* MCQ Options */}
                            {questionForm.questionType === 'mcq' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Options</label>
                                    <div className="space-y-2">
                                        {questionForm.options.map((opt, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="correctAnswer"
                                                    checked={questionForm.correctAnswer === idx}
                                                    onChange={() => setQuestionForm({ ...questionForm, correctAnswer: idx })}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOpts = [...questionForm.options];
                                                        newOpts[idx] = e.target.value;
                                                        setQuestionForm({ ...questionForm, options: newOpts });
                                                    }}
                                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder={`Option ${idx + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Select the correct answer</p>
                                </div>
                            )}

                            {/* True/False */}
                            {questionForm.questionType === 'true-false' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Correct Answer</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="tfAnswer"
                                                checked={questionForm.correctAnswer === true}
                                                onChange={() => setQuestionForm({ ...questionForm, correctAnswer: true })}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">True</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="tfAnswer"
                                                checked={questionForm.correctAnswer === false}
                                                onChange={() => setQuestionForm({ ...questionForm, correctAnswer: false })}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">False</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Short Answer */}
                            {questionForm.questionType === 'short-answer' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Correct Answer</label>
                                    <input
                                        type="text"
                                        value={questionForm.correctAnswer}
                                        onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Expected answer (case-insensitive)"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                            <button
                                onClick={() => { setShowQuestionModal(false); resetQuestionForm(); }}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveQuestion}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                            >
                                {editingQuestionIndex !== null ? 'Update' : 'Add Question'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizManage;