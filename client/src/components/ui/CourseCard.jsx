import { Link } from 'react-router-dom';
import { FaClock, FaHeart, FaStar, FaUser, FaUsers } from 'react-icons/fa';
import PriceDisplay from './PriceDisplay';

const CourseCard = ({ course }) => {
    const {
        _id,
        title,
        description,
        thumbnail,
        price,
        originalPrice,
        currency,
        category,
        level,
        rating,
        enrollmentCount,
        user: instructor,
        totalDuration
    } = course;

    const formatDuration = (minutes) => {
        if (!minutes || minutes <= 0) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const formattedDuration = formatDuration(totalDuration);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-eduport-lg transition-all duration-300 flex flex-col overflow-hidden group card-hover-lift">
            {/* Thumbnail Header */}
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
                        <span className="text-3xl font-extrabold text-primary/40 uppercase tracking-widest">LMS</span>
                    </div>
                )}
                
                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {category && (
                        <span className="bg-primary/90 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">
                            {category}
                        </span>
                    )}
                    {level && (
                        <span className="bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
                            {level}
                        </span>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-5 flex flex-col flex-1">
                {/* Rating & Students Row */}
                <div className="flex items-center justify-between text-xs mb-2">
                    {rating && rating.average > 0 ? (
                        <div className="flex items-center gap-1">
                            <FaStar className="text-warning text-xs" />
                            <span className="font-bold text-slate-900 dark:text-white">
                                {rating.average.toFixed(1)}
                            </span>
                            <span className="text-slate-400">({rating.count || 0})</span>
                        </div>
                    ) : (
                        <span className="text-slate-400 text-xs">New Course</span>
                    )}

                    <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1">
                        <FaUsers className="text-[10px]" />
                        {enrollmentCount || 0} enrolled
                    </span>
                </div>

                {/* Title */}
                <Link to={`/marketplace/course/${_id}`} className="group-hover:text-primary transition-colors">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 mb-2">
                        {title}
                    </h3>
                </Link>

                {/* Short description */}
                {description && (
                    <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                        {description}
                    </p>
                )}

                {/* Duration Metadata */}
                {formattedDuration && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 mt-auto">
                        <FaClock className="text-danger/80 text-xs" />
                        <span>{formattedDuration}</span>
                    </div>
                )}

                {/* Divider Line */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto flex items-center justify-between">
                    {/* Instructor Info */}
                    <div className="flex items-center gap-2">
                        {instructor?.profilePicture ? (
                            <img
                                src={instructor.profilePicture}
                                alt={instructor.name || ''}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                        ) : (
                            <div className="w-7 h-7 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                                {instructor?.name ? instructor.name.charAt(0).toUpperCase() : <FaUser className="text-[10px]" />}
                            </div>
                        )}
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                            {instructor?.name || 'Instructor'}
                        </span>
                    </div>

                    {/* Price Display */}
                    <div>
                        {price === 0 ? (
                            <span className="text-success font-extrabold text-sm">Free</span>
                        ) : (
                            <PriceDisplay
                                price={price}
                                originalPrice={originalPrice}
                                currency={currency}
                                size="sm"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
