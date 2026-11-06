const isErrorStatus = (status) => Number.isInteger(status) && status >= 400 && status < 600;

const statusFor = (err, res) => {
    const own = err.statusCode || err.status;
    if (isErrorStatus(own)) return own;
    if (isErrorStatus(res.statusCode)) return res.statusCode;
    if (err.name === 'MulterError') return err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    if (err.name === 'ValidationError' || err.name === 'CastError') return 400;
    return 500;
};

const messageFor = (err, statusCode) => {
    if (err.name === 'CastError') return `Invalid value for ${err.path}`;
    // Unexpected errors can name internals, so production keeps them in the server log
    if (statusCode >= 500 && process.env.NODE_ENV === 'production') return 'Something went wrong on our end.';
    return err.message;
};

const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = statusFor(err, res);

    res.status(statusCode).json({
        message: messageFor(err, statusCode),
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = { errorHandler };
