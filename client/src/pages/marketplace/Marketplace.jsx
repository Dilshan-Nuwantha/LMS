import { useState, useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    FaSearch, FaTimes, FaChevronDown, FaStore, FaBookOpen,
    FaChalkboardTeacher, FaCheckCircle, FaGraduationCap, FaStar, FaUsers, FaArrowRight
} from 'react-icons/fa';
import api from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import CourseCard from '../../components/ui/CourseCard';
import { showError } from '../../utils/toast';

const Marketplace = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const [categories, setCategories] = useState([]);
    const [enrolledIds, setEnrolledIds] = useState(new Set());
    const [pagination, setPagination] = useState({
        page: 1,
        pages: 1,
        total: 0
    });

    // Filter states matching original functional features
    const [filters, setFilters] = useState({
        category: searchParams.get('category') || '',
        level: searchParams.get('level') || '',
        language: searchParams.get('language') || '',
        tag: searchParams.get('tag') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        minRating: searchParams.get('minRating') || '',
        sortBy: searchParams.get('sortBy') || 'newest'
    });
    // The navbar menu changes the category without reloading this page
    const urlTag = searchParams.get('tag') || '';
    const urlCategory = searchParams.get('category') || '';
    const [lastUrl, setLastUrl] = useState({ category: urlCategory, tag: urlTag });
    if (urlCategory !== lastUrl.category || urlTag !== lastUrl.tag) {
        setLastUrl({ category: urlCategory, tag: urlTag });
        setFilters({ ...filters, category: urlCategory, tag: urlTag });
    }

    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    const languages = ['English', 'Sinhala', 'Tamil'];
    const sortOptions = [
        { value: 'newest', label: 'Newest' },
        { value: 'popular', label: 'Most Popular' },
        { value: 'rating', label: 'Highest Rated' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'price-high', label: 'Price: High to Low' }
    ];

    const fetchCategories = async () => {
        try {
            const res = await api.get('/marketplace/categories');
            setCategories(res.data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Enrolled courses get marked on their cards
    useEffect(() => {
        if (!user) return;
        api.get('/courses/my/enrolled')
            .then(res => setEnrolledIds(new Set(res.data.map(enrollment => enrollment.course._id))))
            .catch(() => { /* Not critical: cards just stay unmarked */ });
    }, [user]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const query = searchParams.get('q');
            let endpoint = '/marketplace';
            let params = {
                page: searchParams.get('page') || 1,
                category: searchParams.get('category') || '',
                level: searchParams.get('level') || '',
                language: searchParams.get('language') || '',
                tag: searchParams.get('tag') || '',
                minPrice: searchParams.get('minPrice') || '',
                maxPrice: searchParams.get('maxPrice') || '',
                minRating: searchParams.get('minRating') || '',
                sortBy: searchParams.get('sortBy') || 'newest'
            };

            if (query) {
                endpoint = '/marketplace/search';
                params.q = query;
            }

            const res = await api.get(endpoint, { params });
            setCourses(res.data.courses || []);
            if (res.data.pagination) {
                setPagination(res.data.pagination);
            }
        } catch {
            showError('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [searchParams]);

    const applyFilters = () => {
        const newParams = new URLSearchParams();
        if (searchQuery.trim()) newParams.set('q', searchQuery.trim());
        if (filters.category) newParams.set('category', filters.category);
        if (filters.level) newParams.set('level', filters.level);
        if (filters.language) newParams.set('language', filters.language);
        if (filters.tag.trim()) newParams.set('tag', filters.tag.trim());
        if (filters.minPrice) newParams.set('minPrice', filters.minPrice);
        if (filters.maxPrice) newParams.set('maxPrice', filters.maxPrice);
        if (filters.minRating) newParams.set('minRating', filters.minRating);
        if (filters.sortBy) newParams.set('sortBy', filters.sortBy);
        newParams.set('page', '1');
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        setFilters({
            category: '',
            level: '',
            language: '',
            tag: '',
            minPrice: '',
            maxPrice: '',
            minRating: '',
            sortBy: 'newest'
        });
        setSearchQuery('');
        setSearchParams({});
    };

    const hasActiveFilters = searchParams.get('category') || searchParams.get('level') || searchParams.get('language') || searchParams.get('tag') ||
        searchParams.get('minPrice') || searchParams.get('maxPrice') || searchParams.get('minRating');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">

            {/* 1. TenZe HERO BANNER */}
            <section className="relative overflow-hidden pt-10 pb-16 bg-gradient-to-b from-primary-light/30 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
                <div className="container mx-auto px-4 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                        {/* Hero Text Left */}
                        <div className="lg:col-span-7 space-y-5">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger-light text-danger text-xs font-bold uppercase tracking-wide">
                                🚀 LEARNING MANAGEMENT SYSTEM
                            </span>

                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.18] tracking-tight">
                                Limitless learning at your <span className="hero-underline text-primary">fingertips</span>
                            </h1>

                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl font-medium leading-relaxed">
                                Access high quality courses taught by top instructors. Master new skills, earn certificates, and advance your career.
                            </p>

                            {/* Features Row */}
                            <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                <div className="flex items-center gap-1.5">
                                    <FaCheckCircle className="text-primary" />
                                    <span>Learn with experts</span>
                                </div>
                                {/* <div className="flex items-center gap-1.5">
                                    <FaCheckCircle className="text-primary" />
                                    <span>Get certificate</span>
                                </div> */}
                                {/* <div className="flex items-center gap-1.5">
                                    <FaCheckCircle className="text-primary" />
                                    <span>Flexible schedule</span>
                                </div> */}
                            </div>
                        </div>

                        {/* Search Card Right */}
                        <div className="lg:col-span-5">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-TenZe-lg space-y-4">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    Search & Filter Courses
                                </h3>

                                <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }} className="space-y-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by title, topic, tag or instructor..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:outline-none w-full pr-9"
                                        />
                                        <button type="submit" aria-label="Search" className="absolute right-3 top-3 text-slate-400 hover:text-primary">
                                            <FaSearch className="text-xs" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <select aria-label="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:outline-none w-full">
                                            <option value="">All Categories</option>
                                            {categories.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>

                                        <select aria-label="Sort by" value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })} className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:outline-none w-full">
                                            {sortOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>

                                        <select aria-label="Level" value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:outline-none w-full">
                                            <option value="">All Levels</option>
                                            {levels.map((lvl) => (
                                                <option key={lvl} value={lvl}>{lvl}</option>
                                            ))}
                                        </select>

                                        <select aria-label="Language" value={filters.language} onChange={(e) => setFilters({ ...filters, language: e.target.value })} className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:outline-none w-full">
                                            <option value="">All Languages</option>
                                            {languages.map((lang) => (
                                                <option key={lang} value={lang}>{lang}</option>
                                            ))}
                                        </select>

                                        <input
                                            type="text"
                                            aria-label="Tag"
                                            placeholder="Tag"
                                            value={filters.tag}
                                            onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                                            className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:outline-none w-full col-span-2"
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            aria-label="Minimum price in Rs."
                                            placeholder="Min Price (Rs.)"
                                            value={filters.minPrice}
                                            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                            className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:outline-none w-full"
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            aria-label="Maximum price in Rs."
                                            placeholder="Max Price (Rs.)"
                                            value={filters.maxPrice}
                                            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                            className="bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-xl p-3 text-slate-900 dark:text-white border border-transparent focus:outline-none w-full"
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors">
                                            Apply Filter
                                        </button>
                                        {(hasActiveFilters || searchQuery) && (
                                            <button type="button" onClick={clearFilters} className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 2. REAL STATS COUNTER */}
            <section className="py-8 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
                <div className="container mx-auto px-4 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-slate-800 border border-amber-500/20 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl font-bold">
                                <FaBookOpen />
                            </div>
                            <div>
                                <span className="text-2xl font-black text-slate-900 dark:text-white block">{pagination.total || courses.length}</span>
                                <span className="text-xs font-semibold text-slate-500">Available Courses</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-primary/5 dark:bg-slate-800 border border-primary/20 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xl font-bold">
                                <FaStore />
                            </div>
                            <div>
                                <span className="text-2xl font-black text-slate-900 dark:text-white block">{categories.length}</span>
                                <span className="text-xs font-semibold text-slate-500">Course Categories</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-slate-800 border border-purple-500/20 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-light text-purple flex items-center justify-center text-xl font-bold">
                                <FaUsers />
                            </div>
                            <div>
                                <span className="text-2xl font-black text-slate-900 dark:text-white block">Active</span>
                                <span className="text-xs font-semibold text-slate-500">Enrolled Learners</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-success-500/5 dark:bg-slate-800 border border-success-500/20 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center text-xl font-bold">
                                <FaBookOpen />
                            </div>
                            <div>
                                <span className="text-2xl font-black text-slate-900 dark:text-white block">100%</span>
                                <span className="text-xs font-semibold text-slate-500">Verified Content</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. COURSES MARKETPLACE GRID */}
            <section className="py-12">
                <div className="container mx-auto px-4 lg:px-8">

                    {/* Results Count & Subtitle */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                Course Catalog
                            </h2>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                Showing {courses.length} of {pagination.total || courses.length} courses found
                            </p>
                        </div>

                    </div>


                    {/* Course Loading or Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <div key={n} className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
                            ))}
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                            <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-3xl mx-auto mb-3">
                                📚
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                No courses found
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Try adjusting your search query or filter parameters.
                            </p>
                            <button
                                onClick={clearFilters}
                                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {courses.map((course) => (
                                <CourseCard key={course._id} course={course} enrolled={!!user && enrolledIds.has(course._id)} />
                            ))}
                        </div>
                    )}

                    {/* Real Pagination Controls */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-center mt-10 gap-2">
                            {[...Array(pagination.pages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.set('page', String(i + 1));
                                        setSearchParams(newParams);
                                    }}
                                    className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${pagination.page === i + 1
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-primary'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </section>

            {/* 4. BECOME AN INSTRUCTOR CTA BANNER */}
            {user?.role !== 'instructor' && user?.role !== 'admin' && (
                <section className="py-12">
                    <div className="container mx-auto px-4 lg:px-8">
                        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-primary-700 to-slate-900 text-white p-8 sm:p-12 shadow-TenZe-lg">
                            <div className="relative z-10 max-w-2xl space-y-3">
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                                    Teach on LMS
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                                    Become an Instructor & Share Your Knowledge
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                                    Join our community of instructors, create engaging courses, and inspire students worldwide.
                                </p>
                                <div className="pt-2">
                                    <Link
                                        to="/become-instructor"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-extrabold text-xs hover:bg-slate-100 transition-all shadow-md"
                                    >
                                        <FaChalkboardTeacher className="text-primary text-sm" />
                                        <span>Start Teaching Today</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

        </div>
    );
};

export default Marketplace;
