import { showError } from './toast';

// Older records may still hold unsafe links, so this is checked again before opening
const isSafeLink = (url) => {
    try {
        return ['http:', 'https:'].includes(new URL(url, window.location.origin).protocol);
    } catch {
        return false;
    }
};

export const openExternalLink = (url) => {
    if (!isSafeLink(url)) {
        showError('This link cannot be opened because it is not a web address.');
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
};
