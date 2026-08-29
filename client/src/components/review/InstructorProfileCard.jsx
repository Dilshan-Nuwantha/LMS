import { FaUser, FaBook, FaUsers, FaStar } from 'react-icons/fa';

const InstructorProfileCard = ({ instructor, courseCount, studentCount }) => {
    const { name, bio, profileImage } = instructor || {};

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profileImage ? (
                        <img
                            src={profileImage}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <FaUser className="text-2xl text-white" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
                        {name || 'Instructor'}
                    </h3>

                    {bio && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                            {bio}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        {courseCount !== undefined && (
                            <span className="flex items-center gap-1">
                                <FaBook className="text-indigo-500" />
                                {courseCount} courses
                            </span>
                        )}
                        {studentCount !== undefined && (
                            <span className="flex items-center gap-1">
                                <FaUsers className="text-green-500" />
                                {studentCount} students
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstructorProfileCard;
