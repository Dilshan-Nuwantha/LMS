import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const StarRating = ({ rating, size = 'md', showCount = false, count = 0 }) => {
    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl'
    };

    const renderStars = () => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(
                    <FaStar key={i} className="text-yellow-400" />
                );
            } else if (i === fullStars && hasHalfStar) {
                stars.push(
                    <FaStarHalfAlt key={i} className="text-yellow-400" />
                );
            } else {
                stars.push(
                    <FaRegStar key={i} className="text-yellow-400" />
                );
            }
        }
        return stars;
    };

    return (
        <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
            <div className="flex items-center">
                {renderStars()}
            </div>
            {showCount && (
                <span className="text-slate-500 dark:text-slate-400 ml-1">
                    ({count})
                </span>
            )}
        </div>
    );
};

export default StarRating;
