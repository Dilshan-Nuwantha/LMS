import { FaGithub, FaHeart } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-4 transition-colors duration-300 mt-auto relative z-50">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span>Made with </span>
                    <FaHeart className="text-blue-500 animate-pulse" />
                    <span>by <span className="font-bold text-slate-900 dark:text-white">TENZE DEV TEAM</span></span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
