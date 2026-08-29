import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import ManageCoupons from '../course/ManageCoupons';

const InstructorCoupons = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/instructor/dashboard')}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        <FaArrowLeft />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Manage Coupons
                    </h1>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <ManageCoupons embeddedCourseId={id} />
                </div>
            </div>
        </div>
    );
};

export default InstructorCoupons;
