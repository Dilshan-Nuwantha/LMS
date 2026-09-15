import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaBookOpen, FaEnvelope, FaArrowLeft } from 'react-icons/fa';
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

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: email.trim() });
            showSuccess('OTP sent! Check your inbox.');
            navigate('/verify-otp', { state: { email: email.trim() } });
        } catch (error) {
            if (!error.handled) {
                showError(error, 'Failed to send OTP. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
            {/* ── Left Panel ── */}
            <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-16 left-16 w-48 h-48 rounded-full border border-white/10" />
                <div className="absolute top-8 left-8 w-72 h-72 rounded-full border border-white/10" />
                <div className="absolute bottom-32 right-8 w-36 h-36 rounded-full border border-white/10" />
                <div className="absolute bottom-16 right-0 w-56 h-56 rounded-full border border-white/10" />

                <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-12 justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <FaBookOpen className="text-white text-base" />
                        </div>
                        <span className="text-white font-bold text-xl tracking-tight">Tenz Learn</span>
                    </div>

                    {/* Center hero */}
                    <div className="flex flex-col items-center text-center -mt-8">
                        <div className="mb-8 w-40 h-40 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <FaEnvelope className="text-white text-6xl opacity-60" />
                        </div>
                        <h2 className="text-white text-2xl xl:text-3xl font-bold leading-tight">Forgot Your Password?</h2>
                        <p className="text-white/70 text-sm mt-2 max-w-xs leading-relaxed">
                            No worries — we'll send a one-time code to your inbox so you can get back in quickly.
                        </p>
                    </div>

                    {/* Footer */}
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
                        {/* Heading */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reset Password</h1>
                            <p className="mt-2 text-gray-500 text-sm">
                                Enter your registered email and we'll send a 6-digit verification code.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={onSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="forgot-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    id="forgot-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="example@gmail.com"
                                    className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all shadow-sm"
                                />
                            </div>

                            <button
                                id="send-otp-btn"
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Sending OTP...
                                    </>
                                ) : 'Send Verification Code'}
                            </button>
                        </form>

                        {/* Back to login */}
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

                {/* Footer */}
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

export default ForgotPassword;
