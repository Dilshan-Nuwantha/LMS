import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaPhoneAlt, FaEnvelope, FaGlobe, FaBookOpen } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { site } from '../../config/site';

const socialLinks = [
    { label: 'Facebook', url: site.facebookUrl, icon: FaFacebookF },
    { label: 'Instagram', url: site.instagramUrl, icon: FaInstagram },
    { label: 'X', url: site.xUrl, icon: FaXTwitter },
    { label: 'LinkedIn', url: site.linkedinUrl, icon: FaLinkedinIn }
].filter(link => link.url);

const CURRENT_YEAR = new Date().getFullYear();

const brand = (
    <>
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
            <FaBookOpen className="text-white text-sm" />
        </div>
        <span className="text-xl font-black text-slate-900 dark:text-white">
            Tenz<span className="text-primary">Learn</span>
        </span>
    </>
);

const Footer = () => (
    <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 pt-12 pb-6 transition-colors duration-200">
        <div className="container mx-auto px-4 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">

                {/* Brand & socials */}
                <div>
                    {site.portfolioUrl ? (
                        <a href={site.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-4 group">{brand}</a>
                    ) : (
                        <Link to="/" className="flex items-center gap-2 mb-4 group">{brand}</Link>
                    )}
                    <p className="text-xs leading-relaxed mb-4 text-slate-500 dark:text-slate-400">
                        TenZe provides flexible online education & courses tailored for students, instructors, and professionals worldwide.
                    </p>
                    <div className="flex items-center gap-2">
                        {socialLinks.map(({ label, url, icon: Icon }) => (
                            <a
                                key={label}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                            >
                                <Icon />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Teaching */}
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Teaching</h4>
                    <ul className="space-y-2.5 text-xs font-medium">
                        <li><Link to="/become-instructor" className="hover:text-primary transition-colors">Become an instructor</Link></li>
                        <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
                    </ul>
                </div>

                {/* Contact */}
                {(site.supportPhone || site.supportEmail) && (
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Contact</h4>
                        <div className="space-y-2 text-xs font-medium">
                            {site.supportPhone && (
                                <a href={`tel:${site.supportPhone}`} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-primary transition-colors">
                                    <FaPhoneAlt className="text-primary text-xs" /> {site.supportPhone}
                                </a>
                            )}
                            {site.supportEmail && (
                                <a href={`mailto:${site.supportEmail}`} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-primary transition-colors">
                                    <FaEnvelope className="text-danger text-xs" /> {site.supportEmail}
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom legal bar */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                    Copyrights ©{CURRENT_YEAR} <span className="font-bold text-slate-900 dark:text-white">TenZe</span>. All rights reserved.
                </p>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                        <FaGlobe className="text-xs text-primary" />
                        <span>English</span>
                    </div>
                    <Link to="/terms" className="hover:text-primary transition-colors">Terms of use</Link>
                    <Link to="/privacy" className="hover:text-primary transition-colors">Privacy policy</Link>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
