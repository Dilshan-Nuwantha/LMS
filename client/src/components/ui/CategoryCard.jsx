import { FaLaptopCode, FaChartBar, FaPalette, FaBullhorn, FaMusic, FaCamera, FaDatabase, FaMobileAlt } from 'react-icons/fa';

const categoryIcons = {
    'Development': FaLaptopCode,
    'Web Design': FaPalette,
    'Graphic Design': FaPalette,
    'Data Science': FaDatabase,
    'Marketing': FaBullhorn,
    'Business': FaChartBar,
    'Mobile App': FaMobileAlt,
    'Photography': FaCamera,
    'Music': FaMusic
};

const CategoryCard = ({ category, courseCount = 120, onClick, isSelected }) => {
    const IconComponent = categoryIcons[category.name] || FaLaptopCode;

    return (
        <div
            onClick={onClick}
            className={`cursor-pointer p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center group ${isSelected
                ? 'border-primary bg-primary text-white shadow-TenZe-lg scale-[1.02]'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/50 hover:shadow-TenZe'
                }`}
        >
            <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-all duration-300 ${isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-primary-light text-primary group-hover:bg-primary group-hover:text-white dark:bg-slate-800 dark:text-primary'
                    }`}
            >
                <IconComponent />
            </div>
            <h4
                className={`font-bold text-base mb-1 ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary'
                    }`}
            >
                {category.name}
            </h4>
            <p
                className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                    }`}
            >
                {courseCount} Courses
            </p>
        </div>
    );
};

export default CategoryCard;
