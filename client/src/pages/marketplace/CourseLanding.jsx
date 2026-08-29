import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FaPlay, FaCheck, FaLock, FaUnlock, FaUsers, FaClock, FaGlobe,
    FaChevronDown, FaChevronUp, FaTag, FaStar
} from 'react-icons/fa';
import api from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import StarRating from '../../components/ui/StarRating';
import PriceDisplay from '../../components/ui/PriceDisplay';
import InstructorProfileCard from '../../components/review/InstructorProfileCard';
import ReviewCard from '../../components/review/ReviewCard';
import { showSuccess, showError } from '../../utils/toast';

const CourseLanding = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [course, setCourse] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [hasPurchased, setHasPurchased] = useState(false);
    const [showPreviewVideo, setShowPreviewVideo] = useState(false);

    // Review form state
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [myReview, setMyReview] = useState(null);

    useEffect(() => {
        if (!id || id === 'undefined') return;
        fetchCourse();
        if (user) {
            checkPurchase();
            fetchMyReview();
        }
    }, [id, user]);

    const fetchCourse = async () => {
        try {
            const res = await api.get(`/marketplace/${id}`);
            setCourse(res.data.course);
            setReviews(res.data.reviews);
            // All sections collapsed by default
        } catch (error) {
            showError('Course not found');
            navigate('/marketplace');
        } finally {
            setLoading(false);
        }
    };

    const checkPurchase = async () => {
        try {
            const res = await api.get(`/purchase/verify/${id}`);
            setHasPurchased(res.data.hasPurchased);
        } catch (error) {
            console.error('Error checking purchase:', error);
        }
    };

    const fetchMyReview = async () => {
        try {
            const res = await api.get(`/reviews/my/${id}`);
            if (res.data) {
                setMyReview(res.data);
                setReviewRating(res.data.rating);
                setReviewComment(res.data.comment);
            }
        } catch (error) {
            // No existing review - that's fine
        }
    };

    const handleSubmitReview = async () => {
        if (!user) {
            navigate('/login', { state: { from: `/marketplace/course/${id}` } });
            return;
        }

        if (!reviewComment.trim()) {
            showError('Please write a comment');
            return;
        }

        setSubmittingReview(true);
        try {
            if (myReview) {
                await api.put(`/reviews/${myReview._id}`, {
                    rating: reviewRating,
                    comment: reviewComment
                });
                showSuccess('Review updated!');
            } else {
                await api.post('/reviews', {
                    courseId: id,
                    rating: reviewRating,
                    comment: reviewComment
                });
                showSuccess('Review submitted!');
            }
            fetchCourse();
            fetchMyReview();
        } catch (error) {
            showError(error, 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleMarkHelpful = async (reviewId) => {
        if (!user) return;
        try {
            await api.post(`/reviews/${reviewId}/helpful`);
            fetchCourse();
        } catch (error) {
            showError('Failed to mark review as helpful');
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;

        try {
            const res = await api.post('/coupons/validate', {
                code: couponCode,
                courseId: id
            });
            setCouponApplied(res.data);
            showSuccess('Coupon applied successfully!');
        } catch (error) {
            showError(error, 'Invalid coupon');
            setCouponApplied(null);
        }
    };

    const handlePurchase = async () => {
        if (!user) {
            navigate('/login', { state: { from: `/marketplace/course/${id}` } });
            return;
        }

        setPurchasing(true);
        try {
            const res = await api.post('/purchase/checkout', {
                courseId: id,
                couponCode: couponApplied ? couponCode : null
            });

            // Redirect to Stripe checkout
            if (res.data.url) {
                window.location.href = res.data.url;
            } else {
                throw new Error('Failed to get checkout URL');
            }
        } catch (error) {
            showError(error, 'Failed to start checkout');
            setPurchasing(false);
        }
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!course) return null;

    const finalPrice = couponApplied ? couponApplied.finalPrice : course.price;
    const totalLectures = course.sections?.reduce((acc, s) => s.isPublic !== false ? acc + s.lectures.filter(l => l.isPublic !== false).length : acc, 0) || 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Course Info */}
                        <div className="lg:col-span-2">
                            {course.category && (
                                <span className="inline-block bg-indigo-500/20 text-indigo-400 text-sm font-medium px-3 py-1 rounded-full mb-4">
                                    {course.category}
                                </span>
                            )}
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                {course.title}
                            </h1>
                            <p className="text-slate-300 text-lg mb-6 line-clamp-3">
                                {course.description}
                            </p>

                            {/* Rating & Stats */}
                            <div className="flex items-center gap-4 flex-wrap mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-400 font-bold text-lg">
                                        {course.rating?.average?.toFixed(1) || '0.0'}
                                    </span>
                                    <StarRating rating={course.rating?.average || 0} />
                                    <span className="text-slate-400">
                                        ({course.rating?.count || 0} reviews)
                                    </span>
                                </div>
                                <span className="text-slate-400 flex items-center gap-1">
                                    <FaUsers /> {course.enrollmentCount || 0} students
                                </span>
                            </div>

                            {/* Instructor */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                                    {course.user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Created by</p>
                                    <p className="text-white font-medium">{course.user?.name}</p>
                                </div>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-4 mt-6 text-sm text-slate-400 flex-wrap">
                                {course.language && (
                                    <span className="flex items-center gap-1">
                                        <FaGlobe /> {course.language}
                                    </span>
                                )}
                                {course.level && (
                                    <span className="bg-slate-700 px-2 py-1 rounded">
                                        {course.level}
                                    </span>
                                )}
                                <span>
                                    Last updated {new Date(course.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Purchase Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden sticky top-24">
                                {/* Thumbnail */}
                                <div className="aspect-video relative bg-slate-900">
                                    {showPreviewVideo && course.previewVideo ? (
                                        <iframe
                                            src={course.previewVideo.replace('watch?v=', 'embed/')}
                                            title="Course Preview"
                                            className="w-full h-full"
                                            allowFullScreen
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        />
                                    ) : (
                                        <>
                                            {course.thumbnail && (
                                                <img
                                                    src={course.thumbnail}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            {course.previewVideo && (
                                                <button
                                                    onClick={() => setShowPreviewVideo(true)}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
                                                >
                                                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                                                        <FaPlay className="text-indigo-500 text-xl ml-1" />
                                                    </div>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="p-6">
                                    {/* Price */}
                                    <div className="mb-4">
                                        <PriceDisplay
                                            price={finalPrice}
                                            originalPrice={couponApplied ? course.price : course.originalPrice}
                                            currency={course.currency}
                                            size="lg"
                                        />
                                    </div>

                                    {/* Coupon */}
                                    {!hasPurchased && !couponApplied && (
                                        <div className="mb-4">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    placeholder="Enter coupon code"
                                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                                <button
                                                    onClick={handleApplyCoupon}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {couponApplied && (
                                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                <FaTag />
                                                <span className="font-medium">Coupon applied!</span>
                                            </div>
                                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                                You save ₹{couponApplied.discountAmount}
                                            </p>
                                        </div>
                                    )}

                                    {/* CTA Button */}
                                    {hasPurchased ? (
                                        <button
                                            onClick={() => navigate(`/course/${id}`)}
                                            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FaCheck /> Go to Course
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handlePurchase}
                                            disabled={purchasing}
                                            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {purchasing ? 'Processing...' : 'Buy Now'}
                                        </button>
                                    )}

                                    {/* Course includes */}
                                    <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <FaPlay className="text-indigo-500" />
                                            <span>{totalLectures} lectures</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaClock className="text-indigo-500" />
                                            <span>Full lifetime access</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaGlobe className="text-indigo-500" />
                                            <span>Access on mobile and desktop</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Content */}
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-10">
                        {/* What you'll learn */}
                        {course.whatYouWillLearn?.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                    What you'll learn
                                </h2>
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {course.whatYouWillLearn.map((item, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                                                <span className="text-slate-600 dark:text-slate-300">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Requirements */}
                        {course.requirements?.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                    Requirements
                                </h2>
                                <ul className="space-y-2">
                                    {course.requirements.map((req, index) => (
                                        <li key={index} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2"></span>
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Curriculum */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                Course Curriculum
                            </h2>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {course.sections?.map((section, index) => (
                                    <div key={section._id} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                                        <button
                                            onClick={() => toggleSection(section._id)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {expandedSections[section._id] ? (
                                                    <FaChevronUp className="text-slate-400" />
                                                ) : (
                                                    <FaChevronDown className="text-slate-400" />
                                                )}
                                                <span className="font-medium text-slate-900 dark:text-white">
                                                    {section.title}
                                                </span>
                                                {section.importance && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${
                                                        section.importance === 'Very Important' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
                                                        section.importance === 'Important' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                                                        section.importance === 'Normal' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                                                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                    }`}>
                                                        {section.importance}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm text-slate-500">
                                                {section.lectures?.length || 0} lectures
                                            </span>
                                        </button>

                                        {expandedSections[section._id] && (
                                            <div className="px-4 pb-4">
                                                {[...(section.lectures || [])].sort((a, b) => a.number - b.number).map((lecture) => {
                                                    const isPreview = lecture.isPreview || section.isPreview;
                                                    return (
                                                        <div
                                                            key={lecture._id}
                                                            onClick={() => {
                                                                if (isPreview) {
                                                                    navigate(`/course/${id}/lecture/${lecture._id}`);
                                                                }
                                                            }}
                                                            className={`flex items-center gap-3 py-2 px-4 text-sm transition-colors ${isPreview
                                                                ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 cursor-pointer rounded-lg'
                                                                : 'text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-80'
                                                                }`}
                                                        >
                                                            {isPreview ? (
                                                                <FaUnlock className="text-green-500 text-xs shrink-0" />
                                                            ) : (
                                                                <FaLock className="text-slate-400 text-xs shrink-0" />
                                                            )}
                                                            <span className={`flex-1 truncate ${isPreview ? 'font-medium' : ''}`}>
                                                                {lecture.title}
                                                            </span>
                                                            {isPreview && (
                                                                <span className="ml-2 text-[10px] uppercase font-bold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded shrink-0">
                                                                    Free Preview
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Review Form - Show for purchased users */}
                        {hasPurchased && (
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                    {myReview ? 'Update Your Review' : 'Leave a Review'}
                                </h2>
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Rating
                                        </label>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    onClick={() => setReviewRating(star)}
                                                    className="transition-colors"
                                                >
                                                    <FaStar
                                                        className={`text-2xl ${star <= reviewRating
                                                            ? 'text-yellow-400'
                                                            : 'text-slate-300 dark:text-slate-600'
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Comment
                                        </label>
                                        <textarea
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            rows={4}
                                            placeholder="Share your experience with this course..."
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSubmitReview}
                                        disabled={submittingReview}
                                        className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {submittingReview ? 'Submitting...' : myReview ? 'Update Review' : 'Submit Review'}
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Reviews */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                Student Reviews
                            </h2>
                            {reviews.length > 0 ? (
                                <div className="space-y-4">
                                    {reviews.map(review => (
                                        <ReviewCard
                                            key={review._id}
                                            review={review}
                                            onMarkHelpful={handleMarkHelpful}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400">
                                    No reviews yet. Be the first to review this course!
                                </p>
                            )}
                        </section>
                    </div>

                    {/* Sidebar - Instructor */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                                Instructor
                            </h3>
                            <InstructorProfileCard instructor={course.user} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseLanding;
