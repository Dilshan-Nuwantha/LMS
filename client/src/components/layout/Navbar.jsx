import { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import ThemeContext from '../../context/ThemeContext';
import {
    FaMoon, FaSun, FaUserCircle, FaSignOutAlt, FaBookOpen,
    FaSearch, FaChevronDown, FaThLarge,
    FaStore, FaChalkboardTeacher, FaRobot, FaShieldAlt, FaUser
} from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import api from '../../api/axios';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [categories, setCategories] = useState([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const categoryRef = useRef(null);
    const profileRef = useRef(null);
    const searchRef = useRef(null);

    const onLogout = () => {
        logout();
        navigate('/login');
        setIsProfileOpen(false);
    };

    // Fetch real categories from API
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/marketplace/categories');
                setCategories(res.data || []);
            } catch (error) {
                console.error('Error fetching navbar categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target)) {
                setIsCategoryOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search courses on input change
    useEffect(() => {
        const searchCourses = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await api.get('/marketplace/search', {
                    params: { q: searchQuery }
                });
                setSearchResults(res.data.courses || []);
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchCourses, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleResultClick = (courseId) => {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchFocused(false);
        navigate(`/marketplace/course/${courseId}`);
    };

    return (
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex items-center justify-between h-20">

                    {/* Left Brand & Category Pill */}
                    <div className="flex items-center gap-6">
                        {/* Brand Logo */}
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                                <FaBookOpen className="text-white text-sm" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                                    Tenz<span className="text-primary">Learn</span>
                                </span>
                            </div>
                        </Link>

                        {/* Category Pill Button */}
                        {categories.length > 0 && (
                            <div className="relative hidden md:block" ref={categoryRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-light text-primary font-semibold text-xs hover:bg-primary hover:text-white transition-all duration-200"
                                >
                                    <FaThLarge className="text-xs" />
                                    <span>Category</span>
                                    <FaChevronDown className={`text-[10px] transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Category Dropdown Menu */}
                                {isCategoryOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-TenZe-lg border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-fadeIn">
                                        {categories.map((cat) => (
                                            <Link
                                                key={cat._id || cat.name}
                                                to={`/marketplace?category=${encodeURIComponent(cat.name)}`}
                                                onClick={() => setIsCategoryOpen(false)}
                                                className="block px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-primary-light hover:text-primary dark:hover:bg-slate-800 transition-colors"
                                            >
                                                {cat.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Links */}
                    <nav className="hidden lg:flex items-center gap-6 font-bold text-xs text-slate-700 dark:text-slate-200">
                        <Link
                            to="/marketplace"
                            className={`hover:text-primary transition-colors py-2 ${location.pathname === '/marketplace' || location.pathname === '/' ? 'text-primary' : ''}`}
                        >
                            Marketplace
                        </Link>

                        {user && (
                            <Link
                                to="/my-learning"
                                className={`hover:text-primary transition-colors py-2 flex items-center gap-1.5 ${location.pathname === '/my-learning' ? 'text-primary' : ''}`}
                            >
                                <FaBookOpen className="text-sm text-primary" />
                                My Learning
                            </Link>
                        )}

                        {(user?.role === 'instructor' || user?.role === 'admin') && (
                            <Link
                                to="/instructor/dashboard"
                                className={`hover:text-primary transition-colors py-2 flex items-center gap-1.5 ${location.pathname.startsWith('/instructor') ? 'text-primary' : ''}`}
                            >
                                <FaChalkboardTeacher className="text-sm text-purple" />
                                Instructor Center
                            </Link>
                        )}

                        {user?.role === 'admin' && (
                            <Link
                                to="/admin/dashboard"
                                className="hover:text-primary transition-colors py-2 flex items-center gap-1.5 text-danger font-semibold"
                            >
                                <FaShieldAlt className="text-sm" />
                                Admin Panel
                            </Link>
                        )}
                    </nav>

                    {/* Right Search, Theme & Profile */}
                    <div className="flex items-center gap-3">
                        {/* Search Bar */}
                        <div className="relative hidden sm:block w-48 md:w-64" ref={searchRef}>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    placeholder="Search course..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium rounded-xl pl-4 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 border border-transparent transition-all"
                                />
                                <div className="absolute right-3 text-slate-400">
                                    {isSearching ? (
                                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <FaSearch className="text-xs" />
                                    )}
                                </div>
                            </div>

                            {/* Search Results Popover */}
                            {isSearchFocused && searchResults.length > 0 && (
                                <div className="absolute top-full right-0 left-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-TenZe-lg border border-slate-200/80 dark:border-slate-800 max-h-80 overflow-y-auto z-50 py-2">
                                    {searchResults.map((course) => (
                                        <div
                                            key={course._id}
                                            onClick={() => handleResultClick(course._id)}
                                            className="px-4 py-3 hover:bg-primary-light/50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                {course.thumbnail && (
                                                    <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="truncate">
                                                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {course.title}
                                                </h5>
                                                <span className="text-[10px] text-primary font-semibold">
                                                    {course.category || 'General'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notifications Bell */}
                        {user && <NotificationBell />}

                        {/* Dark/Light Mode Toggle */}
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle dark mode"
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                        >
                            {theme === 'dark' ? <FaSun className="text-warning text-sm" /> : <FaMoon className="text-sm" />}
                        </button>

                        {/* User Menu or Auth Buttons */}
                        {user ? (
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-primary/40 transition-all"
                                >
                                    {user.profilePicture ? (
                                        <img
                                            src={user.profilePicture}
                                            alt={user.name}
                                            className="w-9 h-9 rounded-full object-cover border-2 border-primary"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                            {user.name ? user.name.charAt(0).toUpperCase() : <FaUser />}
                                        </div>
                                    )}
                                </button>

                                {/* Profile Dropdown Menu */}
                                {isProfileOpen && (
                                    <div className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-TenZe-lg border border-slate-200/80 dark:border-slate-800 py-3 z-50 animate-fadeIn">
                                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-sm">
                                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div className="truncate">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {user.name}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                                                <span className="inline-block mt-1 badge-soft-primary capitalize text-[10px]">
                                                    {user.role}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="py-2">
                                            <Link
                                                to="/profile"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <FaUserCircle className="text-sm" /> Edit Profile
                                            </Link>
                                            <Link
                                                to="/my-learning"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <FaBookOpen className="text-sm" /> My Enrolled Courses
                                            </Link>
                                            <Link
                                                to="/my-purchases"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <FaStore className="text-sm" /> Purchase History
                                            </Link>
                                            <Link
                                                to="/ai-chat"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <FaRobot className="text-sm text-primary" /> AI Assistant
                                            </Link>
                                        </div>

                                        <div className="border-t border-slate-100 dark:border-slate-800 pt-2 px-2">
                                            <button
                                                onClick={onLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-danger hover:bg-danger-light rounded-xl transition-colors"
                                            >
                                                <FaSignOutAlt className="text-sm" /> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/login"
                                    className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 rounded-xl bg-danger-light text-danger font-bold text-xs hover:bg-danger hover:text-white transition-all shadow-sm"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;