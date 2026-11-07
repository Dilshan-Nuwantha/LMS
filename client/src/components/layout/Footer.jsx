import { useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaPhoneAlt, FaEnvelope, FaGlobe, FaBookOpen } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { site } from '../../config/site';

const socialLinks = [
    { label: 'Facebook', url: site.facebookUrl, icon: FaFacebookF },
    { label: 'Instagram', url: site.instagramUrl, icon: FaInstagram },
    { label: 'X', url: site.xUrl, icon: FaXTwitter },
    { label: 'LinkedIn', url: site.linkedinUrl, icon: FaLinkedinIn }
];

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

const iconClass = 'w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500';
const linkClass = 'hover:text-primary transition-colors';

const columnsFor = (role) => [
    {
        title: 'Explore',
        links: [['Marketplace', '/marketplace'], ['My Learning', '/my-learning'], ['Purchase History', '/my-purchases']]
    },
    {
        title: 'Teaching',
        links: role === 'instructor' || role === 'admin'
            ? [['Instructor Center', '/instructor/dashboard'], ['Payment Settings', '/instructor/payment-settings']]
            : [['Become an instructor', '/become-instructor'], ['Instructor login', '/instructor/login']]
    },
    {
        title: 'Legal',
        links: [['Terms & Conditions', '/terms'], ['Privacy Policy', '/privacy']]
    }
];

const Footer = () => {
    const { user } = useContext(AuthContext);

    return (
    <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 pt-12 pb-6 transition-colors duration-200">
        <div className="container mx-auto px-4 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-10">

                {/* Brand, contact and socials */}
                <div className="col-span-2">
                    {site.portfolioUrl ? (
                        <a href={site.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-4 group">{brand}</a>
                    ) : (
                        <Link to="/" className="flex items-center gap-2 mb-4 group">{brand}</Link>
                    )}
                    <p className="text-xs leading-relaxed mb-4 max-w-sm text-slate-500 dark:text-slate-400">
                        TenZe provides flexible online education & courses tailored for students, instructors, and professionals worldwide.
                    </p>
                    {(site.supportPhone || site.supportEmail) && (
                        <div className="space-y-2 text-xs font-medium mb-4">
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
                    )}
                    <div className="flex items-center gap-2">
                        {socialLinks.map(({ label, url, icon: Icon }) => (url ? (
                            <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className={`${iconClass} hover:text-primary transition-colors`}>
                                <Icon />
                            </a>
                        ) : (
                            <span key={label} title={`${label} coming soon`} aria-label={`${label} coming soon`} className={`${iconClass} opacity-60`}>
                                <Icon />
                            </span>
                        )))}
                    </div>
                </div>

                {columnsFor(user?.role).map(column => (
                    <div key={column.title}>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">{column.title}</h4>
                        <ul className="space-y-2.5 text-xs font-medium">
                            {column.links.map(([label, to]) => (
                                <li key={to}><Link to={to} className={linkClass}>{label}</Link></li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Bottom bar */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                    Copyrights ©{CURRENT_YEAR} <span className="font-bold text-slate-900 dark:text-white">TenZe</span>. All rights reserved.
                </p>
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                    <FaGlobe className="text-xs text-primary" />
                    <span>English</span>
                </div>
            </div>
        </div>
    </footer>
    );
};

export default Footer;
