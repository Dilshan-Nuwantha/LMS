import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FaBookOpen, FaEye, FaEyeSlash, FaArrowLeft, FaLock } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../api/axios';

const LMSLogo = () => (
    <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
            <FaBookOpen className="text-white text-sm" />
        </div>
        <span className="text-gray-800 font-bold text-lg tracking-tight">Tenz <span className="text-blue-500">Learn</span></span>
    </div>
);

const PasswordStrength = ({ password }) => {
    const getStrength = (pwd) => {
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return score;
    };

    if (!password) return null;
    const score = getStrength(password);
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
    const textColors = ['', 'text-red-500', 'text-orange-400', 'text-yellow-500', 'text-blue-500', 'text-green-500'];

    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-gray-200'}`}
                    />
                ))}
            </div>
            <p className={`text-xs font-medium ${textColors[score]}`}>{labels[score]}</p>
        </div>
    );
};

const Reset = () => {
    const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const resetToken = location.state?.resetToken;

    // Redirect if no resetToken in state
    useEffect(() => {
        if (!resetToken) {
            navigate('/forgot-password', { replace: true });
        }
    }, [resetToken, navigate]);

    const onChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        const { newPassword, confirmPassword } = formData;

        if (newPassword.length < 6) {
            showError('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showError('Passwords do not match.');
            return;
        }
        if (isLoading) return;
        setIsLoading(true);

        try {
            await api.post('/auth/reset-password', { resetToken, newPassword });
            showSuccess('Password reset successfully! You can now log in.');
            navigate('/login', { replace: true });
        } catch (error) {
            if (!error.handled) {
                showError(error, 'Failed to reset password. Please start again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!resetToken) return null;

    const passwordsMatch =
        formData.confirmPassword.length > 0 &&
        formData.newPassword === formData.confirmPassword;
    const passwordMismatch =
        formData.confirmPassword.length > 0 &&
        formData.newPassword !== formData.confirmPassword;

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
            {/* ── Left Panel ── */}
            <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden">
                <div className="absolute top-16 left-16 w-48 h-48 rounded-full border border-white/10" />
                <div className="absolute top-8 left-8 w-72 h-72 rounded-full border border-white/10" />
                <div className="absolute bottom-32 right-8 w-36 h-36 rounded-full border border-white/10" />
                <div className="absolute bottom-16 right-0 w-56 h-56 rounded-full border border-white/10" />

                <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-12 justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <FaBookOpen className="text-white text-base" />
                        </div>
                        <span className="text-white font-bold text-xl tracking-tight">Tenz Learn</span>
                    </div>

                    <div className="flex flex-col items-center text-center -mt-8">
                        <div className="mb-8 w-40 h-40 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <FaLock className="text-white text-6xl opacity-60" />
                        </div>
                        <h2 className="text-white text-2xl xl:text-3xl font-bold leading-tight">Create New Password</h2>
                        <p className="text-white/70 text-sm mt-2 max-w-xs leading-relaxed">
                            Almost there! Choose a strong password to protect your account.
                        </p>

                        {/* Tips */}
                        <div className="mt-6 text-left space-y-2 w-full max-w-xs">
                            {[
                                'At least 6 characters',
                                'Mix of upper & lowercase',
                                'Include numbers or symbols',
                            ].map((tip, i) => (
                                <div key={i} className="flex items-center gap-2 text-white/60 text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                                    {tip}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-white/50 text-xs text-center">
                        © {new Date().getFullYear()} All rights reserved <span className="text-white/80 font-medium">TenZe</span>
                    </div>
                </div>
            </div>

            {/* ── Right Form Panel ── */}
            <div className="flex-1 flex flex-col min-h-screen">
                <div className="lg:hidden h-2 w-full bg-gradient-to-r from-blue-600 to-blue-800" />

                <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
                    <div className="lg:hidden mb-8"><LMSLogo /></div>
                    <div className="hidden lg:flex mb-10"><LMSLogo /></div>

                    <div className="w-full max-w-md mx-auto lg:mx-0">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Set New Password</h1>
                            <p className="mt-2 text-gray-500 text-sm">
                                Choose a secure password for your account.
                            </p>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-5">
                            {/* New Password */}
                            <div>
                                <label htmlFor="reset-new-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="reset-new-password"
                                        name="newPassword"
                                        type={showNew ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={formData.newPassword}
                                        onChange={onChange}
                                        placeholder="••••••••••••••••"
                                        className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showNew ? <FaEyeSlash className="text-base" /> : <FaEye className="text-base" />}
                                    </button>
                                </div>
                                <PasswordStrength password={formData.newPassword} />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="reset-confirm-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="reset-confirm-password"
                                        name="confirmPassword"
                                        type={showConfirm ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={onChange}
                                        placeholder="••••••••••••••••"
                                        className={`block w-full rounded-lg border bg-white px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all shadow-sm
                                            ${passwordMismatch
                                                ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400'
                                                : passwordsMatch
                                                    ? 'border-green-400 focus:ring-green-400/40 focus:border-green-400'
                                                    : 'border-gray-200 focus:ring-blue-400/40 focus:border-blue-400'
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showConfirm ? <FaEyeSlash className="text-base" /> : <FaEye className="text-base" />}
                                    </button>
                                </div>
                                {passwordMismatch && (
                                    <p className="mt-1 text-xs text-red-500 font-medium">Passwords do not match</p>
                                )}
                                {passwordsMatch && (
                                    <p className="mt-1 text-xs text-green-600 font-medium">✓ Passwords match</p>
                                )}
                            </div>

                            <button
                                id="reset-password-btn"
                                type="submit"
                                disabled={isLoading || passwordMismatch || formData.newPassword.length < 6}
                                className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Resetting...
                                    </>
                                ) : 'Reset Password'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                            >
                                <FaArrowLeft className="text-xs" />
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 sm:px-12 lg:px-16 xl:px-24 py-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} All rights reserved{' '}
                        <span className="font-semibold text-blue-500">TenZe</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Reset;
