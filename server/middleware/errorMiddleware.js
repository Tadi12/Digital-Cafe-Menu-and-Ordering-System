const { ERROR_CODES, codeForStatus } = require('../utils/errorCodes');

// Not Found Middleware
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.code = ERROR_CODES.NOT_FOUND;
  res.status(404);
  next(error);
};

// Global Error Handling Middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  // A handler may set `err.code`; otherwise derive one from the status so the
  // client always receives a machine-readable value it can translate.
  const code = err.code || codeForStatus(statusCode);
  res.status(statusCode).json({
    success: false,
    code,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
