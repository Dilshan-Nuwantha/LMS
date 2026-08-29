import { Link } from 'react-router-dom';
import { FaUsers, FaClock, FaPlayCircle } from 'react-icons/fa';
import StarRating from './StarRating';
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
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    return (
        <Link
            to={`/marketplace/course/${_id}`}
            className="group bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-slate-200 dark:bg-slate-700">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <FaPlayCircle className="text-4xl text-slate-400" />
                    </div>
                )}
                {category && (
                    <span className="absolute top-2 left-2 bg-indigo-500/90 text-white text-xs font-medium px-2 py-1 rounded">
                        {category}
                    </span>
                )}
                {level && (
                    <span className="absolute top-2 right-2 bg-slate-900/70 text-white text-xs font-medium px-2 py-1 rounded">
                        {level}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-indigo-500 transition-colors">
                    {title}
                </h3>

                {instructor && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        {instructor.name}
                    </p>
                )}

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-amber-500">{rating?.average?.toFixed(1) || '0.0'}</span>
                    <StarRating rating={rating?.average || 0} size="sm" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({rating?.count || 0})
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                        <FaUsers />
                        {enrollmentCount || 0} students
                    </span>
                    {totalDuration > 0 && (
                        <span className="flex items-center gap-1">
                            <FaClock />
                            {formatDuration(totalDuration)}
                        </span>
                    )}
                </div>

                {/* Price - pushed to bottom */}
                <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
                    <PriceDisplay
                        price={price}
                        originalPrice={originalPrice}
                        currency={currency}
                        size="sm"
                    />
                </div>
            </div>
        </Link>
    );
};

export default CourseCard;
