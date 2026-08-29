import toast from 'react-hot-toast';

// Map raw API/server error messages to user-friendly ones
const ERROR_MAP = {
    'Network Error': 'Unable to reach the server. Check your internet connection.',
    'Request failed with status code 500': 'Something went wrong on our end. Please try again.',
    'Request failed with status code 502': 'Server is temporarily unavailable. Please try again.',
    'Request failed with status code 503': 'Service is under maintenance. Please try later.',
    'Request failed with status code 504': 'Request timed out. Please try again.',
    'jwt expired': 'Your session has expired. Please log in again.',
    'jwt malformed': 'Your session is invalid. Please log in again.',
    'Not authorized': 'You don\'t have permission to do this.',
    'Not authorized, no token': 'Please log in to continue.',
    'Not authorized as an admin': 'Admin access required.',
};

// Patterns to clean up (regex → replacement)
const ERROR_PATTERNS = [
    [/Cast to ObjectId failed/i, 'The requested item was not found.'],
    [/E11000 duplicate key/i, 'This already exists. Please use a different value.'],
    [/validation failed/i, 'Please check your input and try again.'],
    [/ECONNREFUSED/i, 'Unable to reach the server. Please try again.'],
    [/timeout of \d+ms exceeded/i, 'Request timed out. Please try again.'],
    [/Wrong number of segments in token/i, 'Authentication failed. Please try logging in again.'],
];

/**
 * Extract a clean, user-friendly error message from an error object.
 */
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    // If it's already a string, use it
    if (typeof error === 'string') return error;

    // Get the most specific message available
    const message =
        error?.response?.data?.message ||
        error?.message ||
        fallback;

    // Check exact matches first
    if (ERROR_MAP[message]) return ERROR_MAP[message];

    // Check pattern matches
    for (const [pattern, replacement] of ERROR_PATTERNS) {
        if (pattern.test(message)) return replacement;
    }

    // If the message looks like a technical/stack trace, use fallback
    if (message.length > 200 || message.includes('at ') || message.includes('node_modules')) {
        return fallback;
    }

    return message;
};

/**
 * Show a success toast with consistent styling.
 */
export const showSuccess = (message) => {
    toast.success(message, { id: message });
};

/**
 * Show an error toast with a sanitized message.
 * Accepts either a string or an error object.
 */
export const showError = (errorOrMessage, fallback) => {
    const message = typeof errorOrMessage === 'string'
        ? errorOrMessage
        : getErrorMessage(errorOrMessage, fallback);
    toast.error(message, { id: message });
};

/**
 * Show an info/warning toast.
 */
export const showWarning = (message, options = {}) => {
    toast(message, {
        id: message,
        icon: '\u26A0\uFE0F',
        style: {
            background: '#422006',
            border: '1px solid #d97706',
            color: '#fef3c7',
        },
        duration: 4000,
        ...options,
    });
};

export default { showSuccess, showError, showWarning, getErrorMessage };
