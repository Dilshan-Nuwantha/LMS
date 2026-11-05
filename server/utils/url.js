// Browsers ignore whitespace and control characters inside a scheme ("java\nscript:"),
// so they are removed before the scheme is read.
const CONTROL_CHARS = /[\u0000- \u007f-\u009f]/g;
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

// Empty values and links with no scheme are allowed; a scheme must be http or https
const isSafeUrl = (url) => {
    if (url === undefined || url === null || url === '') return true;
    if (typeof url !== 'string') return false;

    const scheme = url.replace(CONTROL_CHARS, '').match(SCHEME);
    return !scheme || ['http', 'https'].includes(scheme[1].toLowerCase());
};

module.exports = { isSafeUrl };
