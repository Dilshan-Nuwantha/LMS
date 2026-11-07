const PAGES = {
    terms: {
        title: 'Terms of Use',
        sections: [
            ['Using Tenz Learn', 'By creating an account or buying a course you agree to these terms. You are responsible for keeping your login details safe.'],
            ['Courses and payments', 'Paying for a course gives you personal access to it. Payments by bank slip are confirmed by the instructor before access is given.'],
            ['Instructors', 'Instructors are responsible for the content they publish and must have the right to share it.'],
            ['Acceptable use', 'Do not copy or resell course content, misuse the platform, or harm other users. Accounts that break these rules can be blocked.']
        ]
    },
    privacy: {
        title: 'Privacy Policy',
        sections: [
            ['What we collect', 'We keep your name, email address, profile details, course progress, purchases and any files you upload.'],
            ['How we use it', 'We use this information to run your account, give you course access, process payments and send notices about your courses.'],
            ['Who can see it', 'Instructors can see the progress of students in their courses. Card payments are handled by our payment provider, and we do not store card numbers.'],
            ['Your choices', 'You can update your profile at any time. Contact us if you want your account removed.']
        ]
    }
};

const LegalPage = ({ page }) => {
    const { title, sections } = PAGES[page];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{title}</h1>
                {sections.map(([heading, text]) => (
                    <section key={heading} className="mb-5">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{heading}</h2>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default LegalPage;
