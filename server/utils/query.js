const MAX_PAGE_SIZE = 100;

// Page and limit come straight from the URL, so bad or huge values are brought into range
const getPaging = (query, defaultLimit = 20) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), MAX_PAGE_SIZE);
    return { page, limit, skip: (page - 1) * limit };
};

// Search text is matched literally, so characters such as ( or .* have no special meaning
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cards show tags as #tag, so people often type the # too
const stripHash = (value) => String(value ?? '').trim().replace(/^#+/, '').trim();

const cleanTags = (tags) => (Array.isArray(tags)
    ? [...new Set(tags.filter(tag => typeof tag === 'string').map(stripHash).filter(Boolean))]
    : []);

module.exports = {
    stripHash,
    cleanTags, getPaging, escapeRegex };
