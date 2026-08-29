import { useState, useContext, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import api from '../api/axios';
import { showSuccess, showError } from '../utils/toast';
import { FaLock, FaExclamationTriangle, FaEye, FaEyeSlash, FaGoogle, FaPencilAlt, FaUser, FaImages, FaShieldAlt } from 'react-icons/fa';

// Avatar categories with DiceBear (no package needed — just image URLs)
const bg = ['b6e3f4','c0aede','ffd5dc','d1f4d1','ffdfbf','c1e7e3','e8d5f5','fce4b8','d4f0ff','ffe0e6','f0e6ff','dff5e3'];
const AVATAR_CATEGORIES = [
    {
        name: 'People',
        icon: '👤',
        avatars: ['Alex','Sam','Jordan','Riley','Harley','Quinn','Morgan','Taylor','Casey','Devon','Avery','Logan'].map((s,i) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Robots',
        icon: '🤖',
        avatars: ['Mochi','Pixel','Nova','Bolt','Spark','Echo','Glitch','Chip','Circuit','Nano','Byte','Servo'].map((s,i) => `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Emoji',
        icon: '😄',
        avatars: ['Nala','Felix','Milo','Luna','Coco','Kiwi','Peanut','Bubbles','Sunny','Pepper','Maple','Toffee'].map((s) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${s}`),
    },
    {
        name: 'Sketches',
        icon: '✏️',
        avatars: ['Zara','River','Sky','Sage','Ember','Wren','Fern','Brook','Cedar','Lark','Iris','Hazel'].map((s,i) => `https://api.dicebear.com/7.x/lorelei/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Minimal',
        icon: '🎨',
        avatars: ['Ash','Kai','Drew','Blake','Remy','Jude','Tate','Lane','Finn','Reese','Shay','Jules'].map((s,i) => `https://api.dicebear.com/7.x/notionists/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Pixel Art',
        icon: '👾',
        avatars: ['Storm','Blaze','Frost','Dusk','Flint','Drift','Shade','Rust','Moss','Clay','Onyx','Jade'].map((s,i) => `https://api.dicebear.com/7.x/pixel-art/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Adventurers',
        icon: '⚔️',
        avatars: ['Aria','Rowan','Thane','Lyra','Orion','Selene','Atlas','Freya','Caspian','Indigo','Sable','Phoenix'].map((s,i) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Big Ears',
        icon: '🐰',
        avatars: ['Clover','Pippin','Basil','Thistle','Bramble','Nutmeg','Olive','Juniper','Yarrow','Poppy','Sorrel','Tansy'].map((s,i) => `https://api.dicebear.com/7.x/big-ears/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Thumbs',
        icon: '👍',
        avatars: ['Ruby','Jade','Opal','Amber','Pearl','Coral','Topaz','Ivy','Garnet','Flint','Onyx','Dune'].map((s,i) => `https://api.dicebear.com/7.x/thumbs/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Shapes',
        icon: '🔷',
        avatars: ['Alpha','Beta','Gamma','Delta','Sigma','Theta','Omega','Zeta','Kappa','Lambda','Phi','Psi'].map((s,i) => `https://api.dicebear.com/7.x/shapes/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
];

// Bio templates by role — {name} is replaced with first name
const BIO_TEMPLATES = {
    student: [
        "Hey, I'm {name}! Currently learning and leveling up my skills one course at a time.",
        "Curious mind on a learning journey. I believe growth happens outside the comfort zone.",
        "Student by day, skill builder by night. Always looking for the next thing to master.",
        "{name} here — passionate about learning new things and connecting with fellow students.",
        "Just a student who loves exploring new ideas. Currently on a mission to learn something new every week.",
        "Learning is my superpower. I'm {name}, and I'm here to grow, build, and share.",
        "Driven by curiosity. I pick up new skills like they're collectibles.",
        "Hi! I'm {name} — a lifelong learner who believes that every expert was once a beginner.",
        "On a quest to turn curiosity into competence. One course at a time.",
        "I don't just take courses — I live them. Always building, always improving.",
        "{name} | Student | Building skills that matter.",
        "Coffee, code, and courses — that's my daily routine.",
        "Not the smartest in the room, but definitely the most curious.",
        "Learning something new every day and loving every minute of it.",
        "Future expert in the making. Currently leveling up on Skill Path.",
    ],
    instructor: [
        "Hi, I'm {name} — an instructor passionate about making complex topics feel simple.",
        "Teaching is my craft. I build courses that help students go from confused to confident.",
        "Instructor & lifelong learner. I believe great teaching can change lives.",
        "{name} here. I turn real-world experience into actionable lessons.",
        "I've been where my students are. That's why I teach the way I wish I was taught.",
        "Passionate educator who believes learning should be engaging, not boring.",
        "I don't just teach — I mentor. Let's grow together.",
        "Building courses that bridge the gap between theory and practice.",
        "{name} | Instructor | Making education accessible and practical.",
        "My goal? Help every student unlock their potential through well-crafted courses.",
        "Teaching isn't just my job — it's my way of giving back.",
        "I simplify the complex. That's what I do best.",
        "Educator with a passion for clarity. If you're confused, that's on me — let's fix it.",
        "I create courses I wish existed when I was starting out.",
        "Helping students succeed is what gets me out of bed every morning.",
    ],
    admin: [
        "Platform admin keeping things running smoothly behind the scenes.",
        "Hi, I'm {name} — helping manage and grow the Skill Path community.",
        "Building a better learning experience, one improvement at a time.",
        "{name} | Admin | Making sure everything works so you can focus on learning.",
        "Behind every great platform is someone making sure it doesn't break. That's me.",
        "I keep the gears turning so students and instructors can do their best work.",
        "Admin by role, builder by passion. Always improving the platform.",
        "Making Skill Path the best place to learn — that's my mission.",
        "{name} here. I manage the platform so you can focus on what matters: learning.",
        "If something works well on this platform, I probably had a hand in it.",
    ],
};

// Fix initials — strip non-letter chars like parentheses
const getInitials = (name = '') =>
    name.replace(/[^a-zA-Z\s]/g, '').trim()
        .split(/\s+/).filter(Boolean)
        .map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const roleBadge = {
    admin:      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    instructor: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    student:    'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
};

const inputClass = 'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

const ProfileAvatar = ({ src, name, size = 80 }) => {
    const [imgError, setImgError] = useState(false);

    // Reset error when src changes so new avatar previews instantly
    useEffect(() => { setImgError(false); }, [src]);

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={name}
                width={size}
                height={size}
                onError={() => setImgError(true)}
                className="rounded-full object-cover"
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <div
            className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white"
            style={{ width: size, height: size, fontSize: size * 0.3 }}
        >
            {getInitials(name)}
        </div>
    );
};

const Profile = () => {
    const { user, updateProfile } = useContext(AuthContext);

    // Profile edit state
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', bio: '', profileImage: '' });
    const [profileLoading, setProfileLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('about');
    const [bioRole, setBioRole] = useState(user?.role || 'student');
    const [customUrl, setCustomUrl] = useState('');

    // Password state
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwError, setPwError] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

    const isGoogleUser = !!user?.googleId;

    const startEditing = () => {
        setProfileForm({ name: user?.name || '', bio: user?.bio || '', profileImage: user?.profileImage || '' });
        setCustomUrl('');
        setEditingProfile(true);
    };

    const cancelEditing = () => { setEditingProfile(false); setActiveTab('about'); };

    const handleSaveProfile = async () => {
        if (!profileForm.name.trim()) return;
        setProfileLoading(true);
        try {
            await updateProfile({ name: profileForm.name.trim(), bio: profileForm.bio.trim(), profileImage: profileForm.profileImage });
            setEditingProfile(false);
            setActiveTab('about');
            showSuccess('Profile updated');
        } catch (err) {
            showError(err, 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = passwords;
        if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
        if (newPassword.length < 6) { setPwError('Must be at least 6 characters'); return; }
        setPwLoading(true);
        try {
            await api.put('/auth/updatepassword', { currentPassword, newPassword });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showSuccess('Password updated');
        } catch (err) {
            setPwError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setPwLoading(false);
        }
    };

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    const previewImage = editingProfile ? profileForm.profileImage : user?.profileImage;
    const previewName  = editingProfile ? profileForm.name : user?.name;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
            <div className="max-w-5xl mx-auto px-4 py-10">
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* ── Left Sidebar ── */}
                    <div className="w-full lg:w-72 shrink-0">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

                            {/* Top gradient banner */}
                            <div className="h-24 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

                            <div className="px-6 pb-6 -mt-12 flex flex-col items-center text-center">
                                {/* Avatar */}
                                <div className="relative">
                                    <div
                                        className={`ring-4 ring-white dark:ring-slate-900 rounded-full ${editingProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                        onClick={() => editingProfile && setActiveTab('avatars')}
                                    >
                                        <ProfileAvatar src={previewImage} name={previewName} size={96} />
                                    </div>
                                    {editingProfile && (
                                        <button
                                            onClick={() => setActiveTab('avatars')}
                                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-colors border-2 border-white dark:border-slate-900"
                                        >
                                            <FaPencilAlt className="text-[10px]" />
                                        </button>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="mt-4 w-full">
                                    {editingProfile ? (
                                        <input
                                            value={profileForm.name}
                                            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                                            maxLength={50}
                                            className="w-full text-center text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    ) : (
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                                    )}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 break-all">{user?.email}</p>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2 justify-center mt-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${roleBadge[user?.role] || roleBadge.student}`}>
                                        {user?.role}
                                    </span>
                                    {isGoogleUser && (
                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1">
                                            <FaGoogle className="text-[9px]" /> Google
                                        </span>
                                    )}
                                </div>

                                {memberSince && (
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">Member since {memberSince}</p>
                                )}

                                {/* Action buttons */}
                                <div className="mt-5 w-full">
                                    {!editingProfile ? (
                                        <button
                                            onClick={startEditing}
                                            className="w-full py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Edit Profile
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={profileLoading || !profileForm.name.trim()}
                                                className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                                            >
                                                {profileLoading ? 'Saving…' : 'Save'}
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Warnings badge */}
                        {user?.warnings?.length > 0 && (
                            <div className="mt-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/40 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaExclamationTriangle className="text-amber-500 text-xs shrink-0" />
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Warnings</span>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">{user.warnings.length} of {user.maxWarnings || 2} issued</p>
                                <div className="w-full h-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${user.warnings.length >= (user.maxWarnings || 2) ? 'bg-red-500' : 'bg-amber-400'}`}
                                        style={{ width: `${Math.min(100, (user.warnings.length / (user.maxWarnings || 2)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right Main ── */}
                    <div className="flex-1">

                        {/* Tabs */}
                        <div className="border-b border-slate-200 dark:border-slate-800 mb-5">
                            <div className="flex items-center -mb-px overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'about', label: 'About', icon: FaUser },
                                    ...(editingProfile ? [{ id: 'avatars', label: 'Avatars', icon: FaImages }] : []),
                                    { id: 'security', label: 'Security', icon: FaShieldAlt },
                                    ...(user?.warnings?.length > 0 ? [{ id: 'warnings', label: 'Warnings', icon: FaExclamationTriangle }] : []),
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                                activeTab === tab.id
                                                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                        >
                                            <Icon className="shrink-0 text-sm" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── About Tab ── */}
                        {activeTab === 'about' && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Bio</h3>
                                    {editingProfile ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={profileForm.bio}
                                                onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                                                rows={3}
                                                maxLength={300}
                                                placeholder="Write a short bio..."
                                                className={`${inputClass} resize-none`}
                                            />
                                            <div className="flex items-center justify-end">
                                                <span className="text-[11px] text-slate-400">{profileForm.bio.length}/300</span>
                                            </div>

                                            {/* Bio suggestions */}
                                            <div className="pt-1">
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">Pick a template</p>
                                                <div className="flex gap-2 mb-3">
                                                    {Object.keys(BIO_TEMPLATES).map((r) => (
                                                        <button
                                                            key={r}
                                                            type="button"
                                                            onClick={() => setBioRole(r)}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                                                                bioRole === r
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            {r}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                    {BIO_TEMPLATES[bioRole].map((tpl, i) => {
                                                        const bio = tpl.replace(/\{name\}/g, (user?.name || '').replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/)[0] || 'there');
                                                        return (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => setProfileForm(f => ({ ...f, bio }))}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                                                                    profileForm.bio === bio
                                                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                                                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                                                }`}
                                                            >
                                                                {bio}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {user?.bio || <span className="italic text-slate-400 dark:text-slate-600">No bio yet. Click Edit Profile to add one.</span>}
                                        </p>
                                    )}
                                </div>

                                {/* Custom image URL — only when editing */}
                                {editingProfile && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Profile Image from URL</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Paste a direct link to use as your profile picture.</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={customUrl}
                                                onChange={e => setCustomUrl(e.target.value)}
                                                placeholder="https://example.com/my-photo.jpg"
                                                className={`${inputClass} flex-1`}
                                            />
                                            <button
                                                onClick={() => { if (customUrl) { setProfileForm(f => ({ ...f, profileImage: customUrl })); setCustomUrl(''); } }}
                                                disabled={!customUrl}
                                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                                            >
                                                Set
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Avatars Tab ── */}
                        {activeTab === 'avatars' && editingProfile && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                                {AVATAR_CATEGORIES.map((cat) => (
                                    <div key={cat.name}>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
                                            <span>{cat.icon}</span> {cat.name}
                                        </p>
                                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                                            {cat.avatars.map((url, i) => (
                                                <button
                                                    key={url}
                                                    onClick={() => setProfileForm(f => ({ ...f, profileImage: url }))}
                                                    className={`rounded-xl overflow-hidden border-2 transition-all aspect-square ${profileForm.profileImage === url ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-105' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                                                >
                                                    <img src={url} alt={`${cat.name}-${i}`} className="w-full h-full bg-white dark:bg-slate-100 rounded-lg" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Security Tab ── */}
                        {activeTab === 'security' && (
                            <div className="space-y-4">
                                {/* Google linked notice */}
                                {isGoogleUser && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                            <FaGoogle className="text-red-500 text-sm" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Google account linked</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">You can sign in with Google or your password.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Password form — always shown */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <FaLock className="text-slate-500 dark:text-slate-400 text-sm" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Change Password</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Update your account password</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Current password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPw.current ? 'text' : 'password'}
                                                    value={passwords.currentPassword}
                                                    onChange={e => { setPasswords(p => ({ ...p, currentPassword: e.target.value })); setPwError(''); }}
                                                    placeholder="Enter current password"
                                                    required
                                                    className={`${inputClass} pr-10`}
                                                />
                                                <button type="button" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                    {showPw.current ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">New password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPw.new ? 'text' : 'password'}
                                                        value={passwords.newPassword}
                                                        onChange={e => { setPasswords(p => ({ ...p, newPassword: e.target.value })); setPwError(''); }}
                                                        placeholder="New password"
                                                        required
                                                        className={`${inputClass} pr-10`}
                                                    />
                                                    <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                        {showPw.new ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Confirm password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPw.confirm ? 'text' : 'password'}
                                                        value={passwords.confirmPassword}
                                                        onChange={e => { setPasswords(p => ({ ...p, confirmPassword: e.target.value })); setPwError(''); }}
                                                        placeholder="Repeat new password"
                                                        required
                                                        className={`${inputClass} pr-10`}
                                                    />
                                                    <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                        {showPw.confirm ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {pwError && (
                                            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                                                <FaExclamationTriangle className="text-xs shrink-0" />
                                                {pwError}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={pwLoading}
                                            className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                                        >
                                            {pwLoading ? 'Saving…' : 'Update Password'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* ── Warnings Tab ── */}
                        {activeTab === 'warnings' && user?.warnings?.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/40 overflow-hidden">
                                <div className="px-6 py-4 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                        <FaExclamationTriangle className="text-amber-500 text-sm" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Account Warnings</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.warnings.length} of {user.maxWarnings || 2} — further violations may result in suspension</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-3">
                                    {user.warnings.map((w, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                            <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                            <div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300">{w.reason}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{new Date(w.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-xs text-amber-600 dark:text-amber-500 text-center pt-1">If you believe this is a mistake, please contact the admin.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
