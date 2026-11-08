// Company details shown in the footer. Anything left empty is hidden.
export const site = {
    facebookUrl: import.meta.env.VITE_FACEBOOK_URL || '',
    instagramUrl: import.meta.env.VITE_INSTAGRAM_URL || '',
    xUrl: import.meta.env.VITE_X_URL || '',
    linkedinUrl: import.meta.env.VITE_LINKEDIN_URL || 'https://www.linkedin.com/company/linkedin.com-company-tenze/posts',
    supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '',
    supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || '',
    portfolioUrl: import.meta.env.VITE_PORTFOLIO_URL || '',
    bankDetails: import.meta.env.VITE_BANK_DETAILS || '',
    // Card payments (Buy Now through Stripe) stay hidden unless this is 'true'
    cardPayments: import.meta.env.VITE_CARD_PAYMENTS === 'true'
};
