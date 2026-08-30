import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaPhoneAlt, FaEnvelope, FaGlobe } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 pt-16 pb-8 transition-colors duration-200 mt-auto">
            <div className="container mx-auto px-4 lg:px-8">
                {/* Top 5 Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
                    
                    {/* Column 1: Brand & Socials */}
                    <div className="lg:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4 group">
                            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                                E
                            </div>
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                                edu<span className="text-primary">port</span>
                            </span>
                        </Link>
                        <p className="text-xs leading-relaxed mb-4 text-slate-500 dark:text-slate-400">
                            Eduport provides flexible online education & courses tailored for students, teachers, and professionals worldwide.
                        </p>
                        {/* Social Buttons */}
                        <div className="flex items-center gap-2">
                            <a
                                href="#"
                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white hover:border-primary transition-all text-xs"
                            >
                                <FaFacebookF />
                            </a>
                            <a
                                href="#"
                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white hover:border-primary transition-all text-xs"
                            >
                                <FaInstagram />
                            </a>
                            <a
                                href="#"
                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white hover:border-primary transition-all text-xs"
                            >
                                <FaTwitter />
                            </a>
                            <a
                                href="#"
                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white hover:border-primary transition-all text-xs"
                            >
                                <FaLinkedinIn />
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Company */}
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Company</h4>
                        <ul className="space-y-2.5 text-xs font-medium">
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">About us</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Contact us</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">News and Blogs</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Library</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Career</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Community */}
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Community</h4>
                        <ul className="space-y-2.5 text-xs font-medium">
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Documentation</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Faq</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Forum</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Sitemap</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Teaching */}
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Teaching</h4>
                        <ul className="space-y-2.5 text-xs font-medium">
                            <li><Link to="/become-instructor" className="hover:text-primary transition-colors">Become a teacher</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">How to guide</Link></li>
                            <li><Link to="/marketplace" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
                        </ul>
                    </div>

                    {/* Column 5: Contact & App Badges */}
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Contact</h4>
                        <div className="space-y-2 text-xs font-medium mb-4">
                            <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <FaPhoneAlt className="text-primary text-xs" /> +123 456 7890
                            </p>
                            <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <FaEnvelope className="text-danger text-xs" /> support@eduport.com
                            </p>
                        </div>
                        {/* App Download Buttons */}
                        <div className="flex flex-col gap-2">
                            <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3 cursor-pointer hover:border-primary transition-colors">
                                <div className="text-xl text-primary font-bold">▶</div>
                                <div className="text-left">
                                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Get it on</span>
                                    <span className="block text-xs font-bold text-slate-900 dark:text-white">Google Play</span>
                                </div>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3 cursor-pointer hover:border-primary transition-colors">
                                <div className="text-xl text-slate-900 dark:text-white font-bold"></div>
                                <div className="text-left">
                                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Download on</span>
                                    <span className="block text-xs font-bold text-slate-900 dark:text-white">App Store</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Legal Bar */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                    <p className="text-slate-500 dark:text-slate-400">
                        Copyrights ©2026 <span className="font-bold text-slate-900 dark:text-white">Eduport</span>. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                            <FaGlobe className="text-xs text-primary" />
                            <span>English</span>
                        </div>
                        <Link to="/marketplace" className="hover:text-primary transition-colors">Terms of use</Link>
                        <Link to="/marketplace" className="hover:text-primary transition-colors">Privacy policy</Link>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;
