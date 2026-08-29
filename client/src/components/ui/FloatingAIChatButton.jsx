import { Link, useLocation } from 'react-router-dom';
import { FaRobot } from 'react-icons/fa';

const FloatingAIChatButton = () => {
    const location = useLocation();

    // Hide on AI chat and AI settings pages (already there)
    if (location.pathname === '/ai-chat' || location.pathname === '/ai-settings') return null;

    return (
        <Link
            to="/ai-chat"
            className="fixed bottom-24 md:bottom-10 right-6 md:right-10 z-50 group"
            title="AI Chat Assistant"
        >
            <div className="relative">
                {/* Pulse ring */}
                <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20" />

                {/* Button */}
                <div className="relative w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-95">
                    <FaRobot className="text-xl" />
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                    AI Chat
                    <div className="absolute top-full right-5 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45 -mt-1" />
                </div>
            </div>
        </Link>
    );
};

export default FloatingAIChatButton;
