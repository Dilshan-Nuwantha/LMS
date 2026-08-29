import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import AuthContext from '../../context/AuthContext';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { FaGraduationCap, FaChalkboardTeacher, FaRobot, FaBullhorn, FaShieldAlt } from 'react-icons/fa';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const studentFeatures = [
    { icon: FaGraduationCap, text: 'Track your learning progress across all enrolled courses' },
    { icon: FaChalkboardTeacher, text: 'Build and publish courses with a powerful curriculum editor' },
    { icon: FaRobot, text: 'AI-powered study assistant for instant help with any topic' },
    { icon: FaBullhorn, text: 'Real-time announcements and broadcasts from instructors' },
];

const adminFeatures = [
    { icon: FaShieldAlt, text: 'Review platform activity and manage account safety' },
    { icon: FaBullhorn, text: 'Monitor broadcasts, reports, and platform-wide announcements' },
    { icon: FaChalkboardTeacher, text: 'Oversee instructors, courses, and publishing workflows' },
    { icon: FaGraduationCap, text: 'Keep the learning experience running smoothly for everyone' },
];

const teacherFeatures = [
    { icon: FaChalkboardTeacher, text: 'Create and publish courses with a guided curriculum editor' },
    { icon: FaGraduationCap, text: 'Manage enrolled learners and track their course progress' },
    { icon: FaBullhorn, text: 'Broadcast updates and announcements to your students instantly' },
    { icon: FaRobot, text: 'Use AI notes, assistants and quiz tools to save grading time' },
];

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
        onError: () => showError('Google sign-in failed'),
    });

    return (
        <button
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={isGoogleLoading || disabled}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-750 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isGoogleLoading ? (
                <svg className="animate-spin h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : <GoogleIcon />}
            Continue with Google
        </button>
    );
};

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const { login, googleLogin } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const isTeacherLogin = location.pathname.startsWith('/teacher/login');
    const isAdminLogin = location.pathname.startsWith('/admin/login');
    const isStudentLogin = !isTeacherLogin && !isAdminLogin;
    const features = isAdminLogin ? adminFeatures : (isTeacherLogin ? teacherFeatures : studentFeatures);
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
        setIsLoading(true);
        try {
            const user = await login(email, password, targetRole);
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

    return (
        <div className="relative min-h-[100dvh] overflow-hidden flex bg-slate-950 lg:bg-gray-50 dark:bg-slate-950">
            <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" />
            <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl lg:hidden" />
            <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl lg:hidden" />

            {/* ── Left branding panel (hidden on mobile) ── */}
            <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col bg-slate-900 dark:bg-slate-950 overflow-hidden">
                {/* Background layers */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-100" />

                <div className="relative z-10 flex flex-col h-full p-8 xl:p-12 justify-center">
                    {/* Hero text */}
                    <div className="mb-6">
                        <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
                            Learn smarter,<br />
                            <span className="text-blue-400">teach better.</span>
                        </h1>
                        <p className="mt-3 text-slate-400 text-sm xl:text-base leading-relaxed max-w-md">
                            A complete platform to manage courses, track student progress, and learn with AI assistance.
                        </p>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-3 mb-6">
                        {features.map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="text-blue-400 text-xs" />
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
                            </div>
                        ))}
                    </div>

                    {/* Stats bar */}
                    <div className="flex items-center gap-6 pt-5 border-t border-white/10">
                        <div>
                            <p className="text-white font-bold text-base">10k+</p>
                            <p className="text-slate-500 text-xs">Students</p>
                        </div>
                        <div className="w-px h-7 bg-white/10" />
                        <div>
                            <p className="text-white font-bold text-base">500+</p>
                            <p className="text-slate-500 text-xs">Courses</p>
                        </div>
                        <div className="w-px h-7 bg-white/10" />
                        <div>
                            <p className="text-white font-bold text-base">98%</p>
                            <p className="text-slate-500 text-xs">Satisfaction</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="relative z-10 flex-1 flex flex-col justify-center px-4 py-6 sm:px-10 lg:px-14 xl:px-20 lg:bg-white dark:bg-slate-900 overflow-y-auto">
                <div className="w-full max-w-sm mx-auto lg:mx-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none rounded-3xl lg:rounded-none shadow-2xl lg:shadow-none border border-white/10 lg:border-0 px-5 py-6 sm:px-0 sm:py-0">
                    <div className="mb-6 lg:hidden">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-blue-200">
                            {isAdminLogin ? <FaShieldAlt className="text-blue-400" /> : (isTeacherLogin ? <FaChalkboardTeacher className="text-blue-400" /> : <FaGraduationCap className="text-blue-400" />)}
                            {isAdminLogin ? 'Admin access' : (isTeacherLogin ? 'Teacher access' : 'Tenz Learn')}
                        </div>
                        <h2 className="mt-4 text-3xl font-bold text-white tracking-tight">
                            {isAdminLogin ? 'Welcome, administrator' : (isTeacherLogin ? 'Teacher portal' : 'Welcome back')}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            {isAdminLogin
                                ? 'Sign in to manage users, courses, and platform activity.'
                                : (isTeacherLogin ? 'Sign in to manage your classes and students.' : 'Sign in to continue your learning journey.')}
                        </p>
                    </div>

                    <div className="hidden lg:block">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {isAdminLogin ? 'Administrator login' : (isTeacherLogin ? 'Teacher login' : 'Welcome back')}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {isAdminLogin
                                ? 'Use your admin account to access platform controls'
                                : (isTeacherLogin ? 'Sign in to manage and build your courses' : 'Sign in to continue your learning journey')}
                        </p>
                    </div>

                    {googleClientId ? (
                        <GoogleLoginButton onSuccess={handleGoogleSuccess} disabled={isLoading} />
                    ) : (
                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                            Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in client/.env to enable it.
                        </div>
                    )}

                    {/* Divider */}
                    <div className="my-4 flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">or sign in with email</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                    </div>

                    {/* Email/password form */}
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={onChange}
                                placeholder="you@example.com"
                                className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={onChange}
                                placeholder="••••••••"
                                className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-500 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-1 flex w-full justify-center items-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </>
                            ) : 'Sign in'}
                        </button>
                    </form>

                    <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400 space-y-2">
                        {isStudentLogin && (
                            <p>
                                Don't have an account?{' '}
                                <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                    Sign up as a student
                                </Link>
                            </p>
                        )}
                        {isTeacherLogin && (
                            <p>
                                Don't have an account?{' '}
                                <Link to="/teacher/register" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                    Sign up as a teacher
                                </Link>
                            </p>
                        )}
                        {isAdminLogin && (
                            <p>
                                Need an admin account?{' '}
                                <Link to="/admin/register" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                    Register as admin
                                </Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
