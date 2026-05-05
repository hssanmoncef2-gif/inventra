/**
 * Security Middleware
 * Protects against XSS, injection, rate limiting, and more
 */

const rateLimit = require('express-rate-limit');
const xss = require('xss');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes' },
  skipSuccessfulRequests: true,
});

// Sanitize request body against XSS
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (val) => {
    if (typeof val === 'string') return xss(val.trim());
    if (typeof val === 'object' && val !== null) {
      return Object.fromEntries(
        Object.entries(val).map(([k, v]) => [k, sanitizeValue(v)])
      );
    }
    return val;
  };

  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  next();
};

// Block MongoDB injection in params
const preventMongoInjection = (req, res, next) => {
  const hasMongoOp = (obj) => {
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.keys(obj).some(
      (k) => k.startsWith('$') || hasMongoOp(obj[k])
    );
  };

  if (hasMongoOp(req.body) || hasMongoOp(req.query) || hasMongoOp(req.params)) {
    return res.status(400).json({ success: false, message: 'Invalid input detected' });
  }
  next();
};

module.exports = { apiLimiter, authLimiter, sanitizeInput, preventMongoInjection };
