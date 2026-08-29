import { useState, useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaSearch, FaFilter, FaTimes, FaChevronDown, FaStore, FaGraduationCap, FaChalkboardTeacher } from 'react-icons/fa';
import api from '../../api/axios';
import CourseCard from '../../components/ui/CourseCard';
import AuthContext from '../../context/AuthContext';
import { showError } from '../../utils/toast';

const Marketplace = () => {
    const { user } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        pages: 1,
        total: 0
    });

    // Filter states
    const [filters, setFilters] = useState({
        category: searchParams.get('category') || '',
        level: searchParams.get('level') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        minRating: searchParams.get('minRating') || '',
        sortBy: searchParams.get('sortBy') || 'newest'
    });
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    const sortOptions = [
        { value: 'newest', label: 'Newest' },
        { value: 'popular', label: 'Most Popular' },
        { value: 'rating', label: 'Highest Rated' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'price-high', label: 'Price: High to Low' }
    ];

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [searchParams]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/marketplace/categories');
            setCategories(res.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const query = searchParams.get('q');
            let endpoint = '/marketplace';
            let params = {
                page: searchParams.get('page') || 1,
                category: searchParams.get('category') || '',
                level: searchParams.get('level') || '',
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
            setCourses(res.data.courses);
            setPagination(res.data.pagination);
        } catch (error) {
            showError('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const newParams = new URLSearchParams(searchParams);
        if (searchQuery.trim()) {
            newParams.set('q', searchQuery.trim());
        } else {
            newParams.delete('q');
        }
        newParams.set('page', '1');
        setSearchParams(newParams);
    };

    const applyFilters = () => {
        const newParams = new URLSearchParams();
        if (searchQuery.trim()) newParams.set('q', searchQuery.trim());
        if (filters.category) newParams.set('category', filters.category);
        if (filters.level) newParams.set('level', filters.level);
        if (filters.minPrice) newParams.set('minPrice', filters.minPrice);
        if (filters.maxPrice) newParams.set('maxPrice', filters.maxPrice);
        if (filters.minRating) newParams.set('minRating', filters.minRating);
        if (filters.sortBy) newParams.set('sortBy', filters.sortBy);
        newParams.set('page', '1');
        setSearchParams(newParams);
        setShowFilters(false);
    };

    const clearFilters = () => {
        setFilters({
            category: '',
            level: '',
            minPrice: '',
            maxPrice: '',
            minRating: '',
            sortBy: 'newest'
        });
        setSearchQuery('');
        setSearchParams({});
    };

    const hasActiveFilters = searchParams.get('category') || searchParams.get('level') ||
        searchParams.get('minPrice') || searchParams.get('maxPrice') || searchParams.get('minRating');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
            {/* Navigation Tabs - Only show for logged in users */}
            {user && (
                <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                    <div className="container mx-auto px-4">
                        <div className="flex gap-1">
                            <div className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400">
                                <FaStore className="text-sm" />
                                <span>Marketplace</span>
                            </div>
                            <Link
                                to="/my-learning"
                                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                            >
                                <FaGraduationCap className="text-sm" />
                                <span>My Learning</span>
                            </Link>
                            <Link
                                to="/my-courses"
                                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                            >
                                <FaChalkboardTeacher className="text-sm" />
                                <span>My Courses</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Filter Bar */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-500 transition-colors"
                        >
                            <FaFilter className="text-indigo-500" />
                            <span>Filters</span>
                            {hasActiveFilters && (
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            )}
                        </button>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-500 transition-colors"
                            >
                                <FaTimes />
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={filters.sortBy}
                            onChange={(e) => {
                                setFilters({ ...filters, sortBy: e.target.value });
                                const newParams = new URLSearchParams(searchParams);
                                newParams.set('sortBy', e.target.value);
                                setSearchParams(newParams);
                            }}
                            className="appearance-none px-4 py-2 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Category
                                </label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Level */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Level
                                </label>
                                <select
                                    value={filters.level}
                                    onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">All Levels</option>
                                    {levels.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Price Range */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Price Range
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.minPrice}
                                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                        className="w-1/2 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.maxPrice}
                                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                        className="w-1/2 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Min Rating */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Minimum Rating
                                </label>
                                <select
                                    value={filters.minRating}
                                    onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Any Rating</option>
                                    <option value="4.5">4.5 & up</option>
                                    <option value="4">4.0 & up</option>
                                    <option value="3.5">3.5 & up</option>
                                    <option value="3">3.0 & up</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4 gap-3">
                            <button
                                onClick={() => setShowFilters(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyFilters}
                                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Results Count */}
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {pagination.total} courses found
                </p>

                {/* Course Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden animate-pulse">
                                <div className="aspect-video bg-slate-200 dark:bg-slate-700"></div>
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">📚</div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            No courses found
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Try adjusting your search or filters
                        </p>
                        <button
                            onClick={clearFilters}
                            className="text-indigo-500 hover:text-indigo-600 font-medium"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {courses.map(course => (
                            <CourseCard key={course._id} course={course} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex justify-center mt-8 gap-2">
                        {[...Array(pagination.pages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.set('page', String(i + 1));
                                    setSearchParams(newParams);
                                }}
                                className={`w-10 h-10 rounded-lg font-medium transition-colors ${pagination.page === i + 1
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Marketplace;
