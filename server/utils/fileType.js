// The type a browser sends can be anything, so files are identified by their first bytes
const sniffFileType = (buffer) => {
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
    if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
    if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
    return null;
};

module.exports = { sniffFileType };
