import { FaTv, FaGraduationCap, FaUserTie, FaShieldAlt } from 'react-icons/fa';

const StatsCounter = () => {
    const stats = [
        {
            id: 1,
            icon: FaTv,
            title: '10K',
            subtitle: 'Online Courses',
            bgColor: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
            cardBg: 'bg-amber-500/5 dark:bg-slate-900',
            borderColor: 'border-amber-500/20',
        },
        {
            id: 2,
            icon: FaUserTie,
            title: '200+',
            subtitle: 'Expert Tutors',
            bgColor: 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-100',
            cardBg: 'bg-primary/5 dark:bg-slate-900',
            borderColor: 'border-primary/20',
        },
        {
            id: 3,
            icon: FaGraduationCap,
            title: '60K+',
            subtitle: 'Online Students',
            bgColor: 'bg-purple-light text-purple dark:bg-purple-500/20 dark:text-purple-300',
            cardBg: 'bg-purple-500/5 dark:bg-slate-900',
            borderColor: 'border-purple-500/20',
        },
        {
            id: 4,
            icon: FaShieldAlt,
            title: '6K+',
            subtitle: 'Certified Courses',
            bgColor: 'bg-success-light text-success dark:bg-success-500/20 dark:text-success-300',
            cardBg: 'bg-success-500/5 dark:bg-slate-900',
            borderColor: 'border-success-500/20',
        },
    ];

    return (
        <section className="py-10">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.id}
                                className={`p-6 rounded-2xl border ${stat.borderColor} ${stat.cardBg} flex items-center gap-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${stat.bgColor}`}>
                                    <Icon />
                                </div>
                                <div>
                                    <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none mb-1">
                                        {stat.title}
                                    </h4>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        {stat.subtitle}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default StatsCounter;
