import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import AuthContext from '../../context/AuthContext';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { FaShieldAlt, FaChalkboardTeacher, FaBookOpen, FaEye, FaEyeSlash, FaFacebook, FaYoutube } from 'react-icons/fa';
import { SiTiktok } from 'react-icons/si';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const LMSLogo = () => (
    <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
            <FaBookOpen className="text-white text-sm" />
        </div>
        <span className="text-gray-800 font-bold text-lg tracking-tight">Tenz <span className="text-blue-500">Learn</span></span>
    </div>
);

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GoogleLoginButton = ({ onSuccess, disabled }) => {
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleGoogleSuccess = async (codeResponse) => {
        setIsGoogleLoading(true);
        try {
            await onSuccess(codeResponse);
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const loginWithGoogle = useGoogleLogin({
        flow: 'auth-code',
        prompt: 'select_account',
        onSuccess: handleGoogleSuccess,
        onError: (errorResponse) => {
            setIsGoogleLoading(false);
            if (errorResponse?.error !== 'access_denied') {
                showError('Google sign-up failed');
            }
        },
        onNonOAuthError: () => {
            setIsGoogleLoading(false);
        },
    });

    return (
        <button
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={isGoogleLoading || disabled}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isGoogleLoading ? (
                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : <GoogleIcon />}
            Sign in with Google
        </button>
    );
};

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const { login, googleLogin } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const isTeacherLogin = location.pathname.startsWith('/teacher/login');
    const isAdminLogin = location.pathname.startsWith('/admin/login');
    const isStudentLogin = !isTeacherLogin && !isAdminLogin;
    const targetRole = isAdminLogin ? 'admin' : (isTeacherLogin ? 'instructor' : 'student');

    const { email, password } = formData;
    const onChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const finishLogin = (user) => {
        if (targetRole && user.role !== targetRole) {
            showError(`Account role is not ${targetRole === 'instructor' ? 'teacher' : targetRole}.`);
            return false;
        }
        if (user.role === 'admin') {
            navigate('/admin/dashboard');
        } else if (user.role === 'instructor') {
            navigate('/instructor/dashboard');
        } else {
            navigate('/');
        }
        return true;
    };

    const handleGoogleSuccess = async (codeResponse) => {
        try {
            const user = await googleLogin(codeResponse.code, targetRole);
            if (!finishLogin(user)) return;
            if (user.warnings?.length > 0) {
                showWarning(`You have ${user.warnings.length} warning${user.warnings.length > 1 ? 's' : ''} on your account. Check your profile for details.`);
            } else {
                showSuccess('Logged in successfully');
            }
        } catch (error) {
            if (!error.handled) {
                const isBlocked = error.response?.status === 403;
                if (isBlocked) {
                    showError('Your account has been blocked. Contact admin for help.');
                } else {
                    showError(error, 'Google sign-in failed');
                }
            }
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            showError('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        try {
            const user = await login(trimmedEmail, password, targetRole);
            if (!finishLogin(user)) return;
            if (user.warnings?.length > 0) {
                showWarning(`You have ${user.warnings.length} warning${user.warnings.length > 1 ? 's' : ''} on your account. Check your profile for details.`);
            } else {
                showSuccess('Logged in successfully');
            }
        } catch (error) {
            if (!error.handled) {
                const isBlocked = error.response?.status === 403;
                if (isBlocked) {
                    showError('Your account has been blocked. Contact admin for help.');
                } else {
                    showError(error, 'Invalid credentials');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const panelBg = isAdminLogin
        ? 'from-slate-800 to-slate-900'
        : isTeacherLogin
            ? 'from-blue-700 to-blue-900'
            : 'from-blue-600 to-blue-800';

    const accentColor = isAdminLogin ? 'bg-slate-700' : isTeacherLogin ? 'bg-blue-600' : 'bg-blue-500';
    const accentHover = isAdminLogin ? 'hover:bg-slate-600' : isTeacherLogin ? 'hover:bg-blue-500' : 'hover:bg-blue-700';
    const accentText = isAdminLogin ? 'text-slate-600' : isTeacherLogin ? 'text-blue-600' : 'text-blue-500';
    const accentHoverText = isAdminLogin ? 'hover:text-slate-500' : isTeacherLogin ? 'hover:text-blue-500' : 'hover:text-blue-700';

    const panelTitle = isAdminLogin
        ? 'Admin Portal'
        : isTeacherLogin
            ? 'Teacher Portal'
            : 'Start Learning Today';

    const panelSubtitle = isAdminLogin
        ? 'Manage your platform with full administrative control'
        : isTeacherLogin
            ? 'Create courses and inspire thousands of learners'
            : 'Join thousands of students on their learning journey';

    const formTitle = isAdminLogin
        ? 'Administrator Login'
        : isTeacherLogin
            ? 'Teacher Login'
            : 'Login';

    const formSubtitle = isAdminLogin
        ? 'Enter your admin credentials to access the dashboard'
        : isTeacherLogin
            ? 'Sign in to manage your courses and students'
            : 'Enter your credentials to login to your account';

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
            {/* ── Left Panel ── */}
            <div className={`hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col bg-gradient-to-br ${panelBg} overflow-hidden`}>
                {/* Decorative circles */}
                <div className="absolute top-16 left-16 w-48 h-48 rounded-full border border-white/10" />
                <div className="absolute top-8 left-8 w-72 h-72 rounded-full border border-white/10" />
                <div className="absolute bottom-32 right-8 w-36 h-36 rounded-full border border-white/10" />
                <div className="absolute bottom-16 right-0 w-56 h-56 rounded-full border border-white/10" />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-12 justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            {isAdminLogin ? <FaShieldAlt className="text-white text-base" /> : isTeacherLogin ? <FaChalkboardTeacher className="text-white text-base" /> : <FaBookOpen className="text-white text-base" />}
                        </div>
                        <span className="text-white font-bold text-xl tracking-tight">Tenz Learn</span>
                    </div>

                    {/* Center hero */}
                    <div className="flex flex-col items-center text-center -mt-8">
                        {/* Student illustration on white oval */}
                        {isStudentLogin && (
                            <div className="relative mb-6">
                                <div className="w-72 h-80 xl:w-80 xl:h-96 bg-white rounded-[50%] flex items-end justify-center overflow-hidden shadow-2xl">
                                    <img
                                        src="/student-reading.jpg"
                                        alt="Student reading"
                                        className="w-full h-full object-cover object-top"
                                    />
                                </div>
                            </div>
                        )}
                        {!isStudentLogin && (
                            <div className="mb-8 w-40 h-40 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                {isAdminLogin ? <FaShieldAlt className="text-white text-6xl opacity-60" /> : <FaChalkboardTeacher className="text-white text-6xl opacity-60" />}
                            </div>
                        )}
                        <h2 className="text-white text-2xl xl:text-3xl font-bold leading-tight">{panelTitle}</h2>
                        <p className="text-white/70 text-sm mt-2 max-w-xs leading-relaxed">{panelSubtitle}</p>
                    </div>

                    {/* Footer */}
                    <div className="text-white/50 text-xs text-center">
                        © 2024 All rights reserved <span className="text-white/80 font-medium">TenZe</span>
                    </div>
                </div>
            </div>

            {/* ── Right Form Panel ── */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Mobile background */}
                <div className={`lg:hidden h-2 w-full bg-gradient-to-r ${panelBg}`} />

                <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
                    {/* Logo (visible on all sizes, top-right on desktop) */}
                    <div className="lg:hidden mb-8">
                        <LMSLogo />
                    </div>
                    <div className="hidden lg:flex mb-10">
                        <LMSLogo />
                    </div>

                    <div className="w-full max-w-md mx-auto lg:mx-0">
                        {/* Heading */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{formTitle}</h1>
                            <p className="mt-2 text-gray-500 text-sm">{formSubtitle}</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={onSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={onChange}
                                    placeholder="example.educationpro@gmail.com"
                                    className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all shadow-sm"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={onChange}
                                        placeholder="••••••••••••••••"
                                        className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <FaEyeSlash className="text-base" /> : <FaEye className="text-base" />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember me + Forgot password */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={e => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 accent-orange-500"
                                    />
                                    <span className="text-sm text-gray-600">Remember me</span>
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className={`text-sm font-semibold ${accentText} ${accentHoverText} transition-colors`}
                                >
                                    Forgot Password?
                                </Link>
                            </div>

                            {/* Sign In button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center items-center gap-2 rounded-lg ${accentColor} ${accentHover} px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Signing in...
                                    </>
                                ) : 'Sign In'}
                            </button>
                        </form>

                        {/* Google Sign In */}
                        <div className="mt-4">
                            {googleClientId ? (
                                <GoogleLoginButton onSuccess={handleGoogleSuccess} disabled={isLoading} />
                            ) : (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in client/.env to enable it.
                                </div>
                            )}
                        </div>

                        {/* Sign up link */}
                        <div className="mt-6 text-sm text-gray-500 text-center">
                            {isStudentLogin && (
                                <p>
                                    Don't have an account?{' '}
                                    <Link to="/register" className={`font-semibold ${accentText} ${accentHoverText} transition-colors`}>
                                        Sign Up
                                    </Link>
                                </p>
                            )}
                            {isTeacherLogin && (
                                <p>
                                    Don't have an account?{' '}
                                    <Link to="/teacher/register" className={`font-semibold ${accentText} ${accentHoverText} transition-colors`}>
                                        Sign Up as Teacher
                                    </Link>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 sm:px-12 lg:px-16 xl:px-24 py-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                        © 2024 All rights reserved{' '}
                        <span className={`font-semibold ${accentText}`}>TenZe</span>
                    </p>
                    <div className="flex items-center gap-3">
                        <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <FaFacebook className="text-lg" />
                        </a>
                        <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <FaYoutube className="text-lg" />
                        </a>
                        <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <SiTiktok className="text-base" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
