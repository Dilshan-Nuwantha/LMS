import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FaBookOpen, FaArrowLeft } from 'react-icons/fa';
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

const RESEND_COOLDOWN = 60;

const OTPInput = () => {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    // Redirect if no email in state
    useEffect(() => {
        if (!email) {
            navigate('/forgot-password', { replace: true });
        }
    }, [email, navigate]);

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown <= 0) {
            setCanResend(true);
            return;
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const focusInput = (index) => {
        if (inputRefs.current[index]) {
            inputRefs.current[index].focus();
        }
    };

    const handleChange = (index, value) => {
        // Only allow digits
        const cleaned = value.replace(/\D/g, '');
        if (!cleaned && value !== '') return;

        const newDigits = [...digits];

        if (cleaned.length > 1) {
            // Handle paste via onChange (some browsers)
            const chars = cleaned.slice(0, 6 - index).split('');
            chars.forEach((char, i) => {
                if (index + i < 6) newDigits[index + i] = char;
            });
            setDigits(newDigits);
            const nextFocus = Math.min(index + chars.length, 5);
            focusInput(nextFocus);
            return;
        }

        newDigits[index] = cleaned;
        setDigits(newDigits);
        if (cleaned && index < 5) {
            focusInput(index + 1);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (digits[index]) {
                const newDigits = [...digits];
                newDigits[index] = '';
                setDigits(newDigits);
            } else if (index > 0) {
                focusInput(index - 1);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            focusInput(index - 1);
        } else if (e.key === 'ArrowRight' && index < 5) {
            focusInput(index + 1);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const newDigits = [...digits];
        pasted.split('').forEach((char, i) => { newDigits[i] = char; });
        setDigits(newDigits);
        focusInput(Math.min(pasted.length, 5));
    };

    const getOTPString = () => digits.join('');

    const onSubmit = async (e) => {
        e.preventDefault();
        const otp = getOTPString();
        if (otp.length < 6) {
            showError('Please enter all 6 digits.');
            return;
        }
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await api.post('/auth/verify-otp', { email, otp });
            showSuccess('OTP verified!');
            navigate('/reset-password', { state: { resetToken: res.data.resetToken } });
        } catch (error) {
            if (!error.handled) {
                showError(error, 'Invalid OTP. Please try again.');
            }
            // Clear the digits and refocus first box on error
            setDigits(['', '', '', '', '', '']);
            setTimeout(() => focusInput(0), 100);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend || isResending) return;
        setIsResending(true);
        try {
            await api.post('/auth/forgot-password', { email });
            showSuccess('A new OTP has been sent to your inbox.');
            setDigits(['', '', '', '', '', '']);
            setCountdown(RESEND_COOLDOWN);
            setCanResend(false);
            setTimeout(() => focusInput(0), 100);
        } catch (error) {
            if (!error.handled) {
                showError(error, 'Failed to resend OTP. Please try again.');
            }
        } finally {
            setIsResending(false);
        }
    };

    if (!email) return null;

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
                        {/* Animated mail icon */}
                        <div className="mb-8 relative">
                            <div className="w-40 h-40 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                <svg className="w-16 h-16 text-white opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </div>
                            {/* Ping dot */}
                            <span className="absolute top-3 right-3 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-400 border-2 border-white"></span>
                            </span>
                        </div>
                        <h2 className="text-white text-2xl xl:text-3xl font-bold leading-tight">Check Your Email</h2>
                        <p className="text-white/70 text-sm mt-2 max-w-xs leading-relaxed">
                            We sent a 6-digit code to <span className="text-white font-medium">{email}</span>. It expires in 10 minutes.
                        </p>
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
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Enter Verification Code</h1>
                            <p className="mt-2 text-gray-500 text-sm">
                                Enter the 6-digit code sent to{' '}
                                <span className="font-semibold text-gray-700">{email}</span>
                            </p>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-6">
                            {/* 6-box OTP input */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Verification Code
                                </label>
                                <div className="flex gap-3" onPaste={handlePaste}>
                                    {digits.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-digit-${index}`}
                                            ref={el => (inputRefs.current[index] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handleChange(index, e.target.value)}
                                            onKeyDown={e => handleKeyDown(index, e)}
                                            className={`
                                                w-full aspect-square max-w-[52px] text-center text-2xl font-bold rounded-xl border-2 transition-all
                                                focus:outline-none focus:ring-0
                                                ${digit
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 bg-white text-gray-900 focus:border-blue-400'
                                                }
                                                shadow-sm
                                            `}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                id="verify-otp-btn"
                                type="submit"
                                disabled={isLoading || getOTPString().length < 6}
                                className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Verifying...
                                    </>
                                ) : 'Verify Code'}
                            </button>
                        </form>

                        {/* Resend section */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-500">
                                Didn't receive the code?{' '}
                                {canResend ? (
                                    <button
                                        id="resend-otp-btn"
                                        type="button"
                                        onClick={handleResend}
                                        disabled={isResending}
                                        className="font-semibold text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-60"
                                    >
                                        {isResending ? 'Sending...' : 'Resend OTP'}
                                    </button>
                                ) : (
                                    <span className="font-semibold text-gray-400">
                                        Resend in <span className="tabular-nums">{countdown}s</span>
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="mt-4 text-center">
                            <Link
                                to="/forgot-password"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                            >
                                <FaArrowLeft className="text-xs" />
                                Wrong email? Go back
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

export default OTPInput;
