import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTimes, FaImage, FaVideo, FaSave, FaArrowLeft } from 'react-icons/fa';
import api from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';

const CreateMarketplaceCourse = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        level: '',
        language: 'English',
        price: '',
        originalPrice: '',
        currency: 'INR',
        thumbnail: '',
        previewVideo: '',
        requirements: [''],
        whatYouWillLearn: ['']
    });

    const defaultCategories = [
        'Development', 'Business', 'Design', 'Marketing',
        'IT & Software', 'Personal Development', 'Photography',
        'Music', 'Health & Fitness', 'Other'
    ];

    const [categories, setCategories] = useState(defaultCategories);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/marketplace/categories');
                if (res.data.length > 0) {
                    // Merge fetched categories with defaults, keeping unique values
                    const merged = [...new Set([...res.data, ...defaultCategories])].sort();
                    setCategories(merged);
                }
            } catch (error) {
                // Fall back to default categories
            }
        };
        fetchCategories();
    }, []);

    const levels = ['Beginner', 'Intermediate', 'Advanced'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleArrayChange = (field, index, value) => {
        setFormData(prev => {
            const arr = [...prev[field]];
            arr[index] = value;
            return { ...prev, [field]: arr };
        });
    };

    const addArrayItem = (field) => {
        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], '']
        }));
    };

    const removeArrayItem = (field, index) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const validateStep = (stepNum) => {
        switch (stepNum) {
            case 1:
                if (!formData.title.trim()) {
                    showError('Please enter a course title');
                    return false;
                }
                if (!formData.description.trim()) {
                    showError('Please enter a course description');
                    return false;
                }
                return true;
            case 2:
                if (!formData.price || formData.price <= 0) {
                    showError('Please enter a valid price');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => Math.min(prev + 1, 3));
        }
    };

    const prevStep = () => {
        setStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async (status = 'Draft') => {
        if (!validateStep(1) || !validateStep(2)) return;

        setLoading(true);
        try {
            const payload = {
                ...formData,
                price: Number(formData.price),
                originalPrice: formData.originalPrice ? Number(formData.originalPrice) : Number(formData.price),
                requirements: formData.requirements.filter(r => r.trim()),
                whatYouWillLearn: formData.whatYouWillLearn.filter(w => w.trim()),
                status
            };

            const res = await api.post('/instructor/course', payload);
            showSuccess('Course created successfully!');
            navigate(`/admin/course/${res.data._id}`);
        } catch (error) {
            showError(error, 'Failed to create course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/instructor/dashboard')}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Create New Course
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Fill in the details to create your marketplace course
                        </p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${s === step
                                        ? 'bg-indigo-500 text-white'
                                        : s < step
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    }`}
                            >
                                {s}
                            </div>
                            {s < 3 && (
                                <div
                                    className={`w-20 h-1 mx-2 rounded ${s < step ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Basic Information
                            </h2>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Course Title *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g., Complete Web Development Bootcamp"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={5}
                                    placeholder="Describe what students will learn..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Category
                                    </label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Level
                                    </label>
                                    <select
                                        name="level"
                                        value={formData.level}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Select level</option>
                                        {levels.map(level => (
                                            <option key={level} value={level}>{level}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Language
                                    </label>
                                    <input
                                        type="text"
                                        name="language"
                                        value={formData.language}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Pricing & Media */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Pricing & Media
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Price *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleChange}
                                            placeholder="499"
                                            className="w-full px-4 py-3 pl-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Original Price (for discount)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                                        <input
                                            type="number"
                                            name="originalPrice"
                                            value={formData.originalPrice}
                                            onChange={handleChange}
                                            placeholder="999"
                                            className="w-full px-4 py-3 pl-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Currency
                                    </label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <FaImage className="inline mr-2" />
                                    Thumbnail URL
                                </label>
                                <input
                                    type="url"
                                    name="thumbnail"
                                    value={formData.thumbnail}
                                    onChange={handleChange}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <FaVideo className="inline mr-2" />
                                    Preview Video URL (optional)
                                </label>
                                <input
                                    type="url"
                                    name="previewVideo"
                                    value={formData.previewVideo}
                                    onChange={handleChange}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Learning Content */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Learning Content
                            </h2>

                            {/* What you'll learn */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    What students will learn
                                </label>
                                <div className="space-y-2">
                                    {formData.whatYouWillLearn.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={item}
                                                onChange={(e) => handleArrayChange('whatYouWillLearn', index, e.target.value)}
                                                placeholder="e.g., Build full-stack web applications"
                                                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                            />
                                            {formData.whatYouWillLearn.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem('whatYouWillLearn', index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <FaTimes />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => addArrayItem('whatYouWillLearn')}
                                        className="flex items-center gap-2 text-indigo-500 hover:text-indigo-600 text-sm font-medium"
                                    >
                                        <FaPlus /> Add more
                                    </button>
                                </div>
                            </div>

                            {/* Requirements */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Requirements / Prerequisites
                                </label>
                                <div className="space-y-2">
                                    {formData.requirements.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={item}
                                                onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                                                placeholder="e.g., Basic HTML knowledge"
                                                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                                            />
                                            {formData.requirements.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem('requirements', index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <FaTimes />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => addArrayItem('requirements')}
                                        className="flex items-center gap-2 text-indigo-500 hover:text-indigo-600 text-sm font-medium"
                                    >
                                        <FaPlus /> Add more
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={prevStep}
                            disabled={step === 1}
                            className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Back
                        </button>

                        <div className="flex gap-3">
                            {step === 3 && (
                                <button
                                    onClick={() => handleSubmit('Draft')}
                                    disabled={loading}
                                    className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    Save as Draft
                                </button>
                            )}

                            {step < 3 ? (
                                <button
                                    onClick={nextStep}
                                    className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSubmit('Draft')}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    <FaSave />
                                    {loading ? 'Creating...' : 'Create Course'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateMarketplaceCourse;
