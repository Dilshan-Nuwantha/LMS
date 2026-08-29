/**
 * Domain Redirect Configuration
 * 
 * This file controls the automatic redirect from Render URL to custom domain.
 * 
 * USAGE:
 * - Set REDIRECT_ENABLED to true to enable redirects
 * - Set REDIRECT_ENABLED to false to disable redirects (after 6 months or when not needed)
 * 
 * REVERSING DIRECTION:
 * - To redirect custom domain → Render URL, swap SOURCE_DOMAIN and TARGET_DOMAIN values
 */

// ============================================
// CONFIGURATION - EDIT THESE VALUES AS NEEDED
// ============================================

// Set to false to disable all redirects
export const REDIRECT_ENABLED = true;

// The domain you want to redirect FROM (without https://)
export const SOURCE_DOMAIN = 'study-portal-frontend.onrender.com';

// The domain you want to redirect TO (without https://)
export const TARGET_DOMAIN = 'study.tenze.com';

// ============================================
// REDIRECT LOGIC - DO NOT EDIT BELOW
// ============================================

/**
 * Performs a 301-like redirect from SOURCE_DOMAIN to TARGET_DOMAIN
 * Preserves the full path and query parameters
 * 
 * @returns {boolean} true if redirect was triggered, false otherwise
 */
export const performDomainRedirect = () => {
    if (!REDIRECT_ENABLED) {
        return false;
    }

    const currentHost = window.location.hostname;

    // Check if we're on the source domain
    if (currentHost === SOURCE_DOMAIN || currentHost.endsWith(`.${SOURCE_DOMAIN}`)) {
        // Build the target URL preserving path and query params
        const targetUrl = `https://${TARGET_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`;

        // Use replace() for 301-like behavior (doesn't add to browser history)
        window.location.replace(targetUrl);
        return true;
    }

    return false;
};
