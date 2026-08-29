import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { FaClock, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaArrowRight, FaFlag, FaTrophy, FaRedo } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';

const QuizTake = () => {
    const { courseId, quizId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [quiz, setQuiz] = useState(null);
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [result, setResult] = useState(null);
    const [reviewMode, setReviewMode] = useState(false);
    const [previousAttempt, setPreviousAttempt] = useState(null);

    useEffect(() => {
        checkAndStartQuiz();
    }, [quizId]);

    // Timer effect
    useEffect(() => {
        if (!quiz?.timeLimit || !attempt || result || reviewMode) return;

        const endTime = new Date(attempt.startedAt).getTime() + (quiz.timeLimit * 60 * 1000);

        const interval = setInterval(() => {
            const remaining = Math.max(0, endTime - Date.now());
            setTimeLeft(Math.ceil(remaining / 1000));

            if (remaining <= 0) {
                clearInterval(interval);
                handleSubmit(true);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [quiz, attempt, result, reviewMode]);

    const checkAndStartQuiz = async () => {
        try {
            const isRetake = searchParams.get('retake') === 'true';

            // If not retake mode, check if user has passed to show review
            if (!isRetake) {
                const attemptsRes = await api.get(`/quizzes/${quizId}/my-attempts`);
                const completedAttempts = attemptsRes.data.filter(a => a.status === 'completed');
                const passedAttempt = completedAttempts.find(a => a.passed);

                if (passedAttempt) {
                    // User has passed, load review mode
                    const quizRes = await api.get(`/quizzes/${quizId}`);
                    setQuiz(quizRes.data);
                    setPreviousAttempt(passedAttempt);
                    setReviewMode(true);
                    setLoading(false);
                    return;
                }
            }

            // Clear the retake param from URL
            if (isRetake) {
                setSearchParams({});
            }

            // Start new attempt
            const res = await api.post(`/quizzes/${quizId}/start`);
            setQuiz(res.data.quiz);
            setAttempt(res.data.attempt);

            if (res.data.attempt.answers?.length > 0) {
                const existingAnswers = {};
                res.data.attempt.answers.forEach(a => {
                    existingAnswers[a.questionIndex] = a.answer;
                });
                setAnswers(existingAnswers);
            }
        } catch (error) {
            showError(error, 'Failed to load quiz');
            navigate(`/course/${courseId}?tab=quizzes`);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionIndex, answer) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    };

    const handleSubmit = async (isTimeout = false) => {
        if (submitting) return;

        const unanswered = quiz.questions.filter((_, idx) => answers[idx] === undefined);
        if (!isTimeout && unanswered.length > 0) {
            if (!confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) {
                return;
            }
        }

        setSubmitting(true);
        try {
            const formattedAnswers = Object.entries(answers).map(([idx, answer]) => ({
                questionIndex: parseInt(idx),
                answer
            }));

            const res = await api.post(`/quizzes/${quizId}/submit`, {
                attemptId: attempt._id,
                answers: formattedAnswers
            });

            setResult(res.data);
            showSuccess(res.data.result.passed ? 'Congratulations! You passed!' : 'Quiz submitted');
        } catch (error) {
            showError(error, 'Failed to submit quiz');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getAnswerDisplay = (question, answerValue) => {
        if (answerValue === undefined || answerValue === null) return 'Not answered';
        if (question.questionType === 'mcq') return question.options[answerValue] || 'Not answered';
        if (question.questionType === 'true-false') return answerValue === true ? 'True' : 'False';
        return answerValue || 'Not answered';
    };

    const getCorrectAnswerDisplay = (question) => {
        if (question.questionType === 'mcq') return question.options[question.correctAnswer];
        if (question.questionType === 'true-false') return question.correctAnswer ? 'True' : 'False';
        return question.correctAnswer;
    };

    const handleRetake = async () => {
        try {
            setLoading(true);
            setReviewMode(false);
            setPreviousAttempt(null);
            setAnswers({});
            setCurrentIndex(0);
            setResult(null);

            const res = await api.post(`/quizzes/${quizId}/start`);
            setQuiz(res.data.quiz);
            setAttempt(res.data.attempt);
        } catch (error) {
            showError(error, 'Failed to start new attempt');
            setReviewMode(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Loading quiz...</p>
                </div>
            </div>
        );
    }

    // Review Mode - Show previous attempt answers
    if (reviewMode && previousAttempt) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                    <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/course/${courseId}?tab=quizzes`)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                            >
                                <FaArrowLeft size={14} />
                            </button>
                            <div>
                                <h1 className="text-sm font-semibold text-slate-900 dark:text-white">{quiz?.title}</h1>
                                <p className="text-xs text-slate-500">Review Mode</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <FaTrophy size={14} />
                            <span className="text-sm font-semibold">{previousAttempt.percentage}% Passed</span>
                        </div>
                    </div>
                </div>

                {/* Review Content */}
                <div className="max-w-3xl mx-auto px-4 py-6">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                <FaCheckCircle className="text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-800 dark:text-green-300">You passed this quiz!</p>
                                <p className="text-sm text-green-600 dark:text-green-400">
                                    Score: {previousAttempt.score}/{previousAttempt.totalPoints} ({previousAttempt.percentage}%)
                                </p>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Answer Review</h2>

                    <div className="space-y-4">
                        {quiz?.questions.map((q, idx) => {
                            const userAnswer = previousAttempt.answers?.find(a => a.questionIndex === idx);
                            const isCorrect = userAnswer?.isCorrect;

                            return (
                                <div key={idx} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
                                    <div className={`px-4 py-3 border-b ${isCorrect ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className={`text-xs font-medium ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                {isCorrect ? 'Correct' : 'Incorrect'}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-auto">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white mb-4">{q.questionText}</p>

                                        <div className="space-y-2">
                                            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                                <span className={`text-xs font-medium mt-0.5 ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Your answer:</span>
                                                <span className={`${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                                    {getAnswerDisplay(q, userAnswer?.answer)}
                                                </span>
                                            </div>

                                            {!isCorrect && (
                                                <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-green-50 dark:bg-green-900/20">
                                                    <span className="text-xs font-medium text-green-600 dark:text-green-400 mt-0.5">Correct answer:</span>
                                                    <span className="text-green-800 dark:text-green-300">{getCorrectAnswerDisplay(q)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleRetake}
                            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-700 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-colors"
                        >
                            <FaRedo size={14} /> Retake Quiz
                        </button>
                        <button
                            onClick={() => navigate(`/course/${courseId}?tab=quizzes`)}
                            className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Back to Course
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Result Screen
    if (result) {
        const correctCount = result.attempt.answers.filter(a => a.isCorrect).length;
        const wrongCount = result.attempt.answers.filter(a => !a.isCorrect).length;

        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-6 px-4">
                <div className="max-w-3xl mx-auto">
                    {/* Result Header */}
                    <div className={`rounded-xl p-6 mb-6 text-center ${result.result.passed ? 'bg-green-500' : 'bg-red-500'}`}>
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                            {result.result.passed ? (
                                <FaTrophy className="text-3xl text-yellow-300" />
                            ) : (
                                <FaTimesCircle className="text-3xl text-white" />
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">
                            {result.result.passed ? 'You Passed!' : 'Not Quite'}
                        </h1>
                        <p className="text-white/80 text-sm">
                            {result.result.passed ? 'Great job!' : `You need ${result.result.passingScore}% to pass`}
                        </p>
                        <div className="mt-4 inline-block bg-white/20 rounded-lg px-6 py-3">
                            <p className="text-4xl font-bold text-white">{result.result.percentage}%</p>
                            <p className="text-xs text-white/70 mt-1">{result.result.score}/{result.result.totalPoints} points</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center border border-gray-200 dark:border-slate-800">
                            <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                            <p className="text-xs text-slate-500">Correct</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center border border-gray-200 dark:border-slate-800">
                            <p className="text-2xl font-bold text-red-500">{wrongCount}</p>
                            <p className="text-xs text-slate-500">Wrong</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-center border border-gray-200 dark:border-slate-800">
                            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                {Math.floor(result.attempt.timeTaken / 60)}:{(result.attempt.timeTaken % 60).toString().padStart(2, '0')}
                            </p>
                            <p className="text-xs text-slate-500">Time</p>
                        </div>
                    </div>

                    {/* Answer Review */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Review Answers</h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                            {result.quiz.questions.map((q, idx) => {
                                const userAnswer = result.attempt.answers.find(a => a.questionIndex === idx);
                                const isCorrect = userAnswer?.isCorrect;

                                return (
                                    <div key={idx} className={`p-4 ${isCorrect ? 'bg-green-50/50 dark:bg-green-900/5' : 'bg-red-50/50 dark:bg-red-900/5'}`}>
                                        <div className="flex items-start gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                                {isCorrect ? '✓' : '✗'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-900 dark:text-white mb-2">
                                                    <span className="text-slate-400">Q{idx + 1}.</span> {q.questionText}
                                                </p>
                                                <div className="space-y-1 text-xs">
                                                    <p className={isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                                        <span className="font-medium">Your answer:</span> {getAnswerDisplay(q, userAnswer?.answer)}
                                                    </p>
                                                    {!isCorrect && (
                                                        <p className="text-green-700 dark:text-green-400">
                                                            <span className="font-medium">Correct:</span> {getCorrectAnswerDisplay(q)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={() => navigate(`/course/${courseId}?tab=quizzes`)}
                        className="w-full mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Back to Course
                    </button>
                </div>
            </div>
        );
    }

    // Quiz Taking UI
    const currentQuestion = quiz?.questions[currentIndex];
    const answeredCount = Object.keys(answers).length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    if (confirm('Leave quiz? Your progress will be saved.')) {
                                        navigate(`/course/${courseId}?tab=quizzes`);
                                    }
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                            >
                                <FaArrowLeft size={14} />
                            </button>
                            <div>
                                <h1 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{quiz?.title}</h1>
                                <p className="text-xs text-slate-500">{answeredCount}/{quiz?.questions.length} answered</p>
                            </div>
                        </div>

                        {quiz?.timeLimit > 0 && timeLeft !== null && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold ${
                                timeLeft < 60 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 animate-pulse' :
                                timeLeft < 300 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                                <FaClock size={12} />
                                {formatTime(timeLeft)}
                            </div>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 bg-gray-100 dark:bg-slate-800 -mx-4">
                        <div
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${((currentIndex + 1) / quiz?.questions.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Question Navigation */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 py-2 px-4 overflow-x-auto">
                <div className="flex gap-1.5 max-w-3xl mx-auto">
                    {quiz?.questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                                idx === currentIndex
                                    ? 'bg-blue-600 text-white'
                                    : answers[idx] !== undefined
                                        ? 'bg-green-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
            </div>

            {/* Question */}
            <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                {currentIndex + 1}
                            </span>
                            <span className="text-xs text-slate-500 uppercase font-medium">
                                {currentQuestion?.questionType === 'mcq' ? 'Multiple Choice' : currentQuestion?.questionType === 'true-false' ? 'True/False' : 'Short Answer'}
                            </span>
                        </div>
                        <span className="text-xs text-slate-400">{currentQuestion?.points} pt{currentQuestion?.points !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="p-5">
                        <h2 className="text-base font-medium text-slate-900 dark:text-white mb-5 leading-relaxed">
                            {currentQuestion?.questionText}
                        </h2>

                        <div className="space-y-2">
                            {currentQuestion?.questionType === 'mcq' && currentQuestion?.options.map((option, idx) => (
                                <label
                                    key={idx}
                                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                                        answers[currentIndex] === idx
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        answers[currentIndex] === idx ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-slate-600'
                                    }`}>
                                        {answers[currentIndex] === idx && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    <span className={`text-sm ${answers[currentIndex] === idx ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {option}
                                    </span>
                                    <input type="radio" className="sr-only" checked={answers[currentIndex] === idx} onChange={() => handleAnswerChange(currentIndex, idx)} />
                                </label>
                            ))}

                            {currentQuestion?.questionType === 'true-false' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {[true, false].map((value) => (
                                        <label
                                            key={String(value)}
                                            className={`flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                                                answers[currentIndex] === value
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                answers[currentIndex] === value ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-slate-600'
                                            }`}>
                                                {answers[currentIndex] === value && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                            <span className={`text-sm font-medium ${answers[currentIndex] === value ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {value ? 'True' : 'False'}
                                            </span>
                                            <input type="radio" className="sr-only" checked={answers[currentIndex] === value} onChange={() => handleAnswerChange(currentIndex, value)} />
                                        </label>
                                    ))}
                                </div>
                            )}

                            {currentQuestion?.questionType === 'short-answer' && (
                                <input
                                    type="text"
                                    value={answers[currentIndex] || ''}
                                    onChange={(e) => handleAnswerChange(currentIndex, e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="Type your answer..."
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 sticky bottom-0">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FaArrowLeft size={12} /> Prev
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        >
                            <FaFlag size={12} /> {submitting ? 'Submitting...' : 'Submit'}
                        </button>

                        {currentIndex < quiz?.questions.length - 1 && (
                            <button
                                onClick={() => setCurrentIndex(currentIndex + 1)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Next <FaArrowRight size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizTake;