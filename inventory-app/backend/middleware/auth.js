/**
 * Authentication & Authorization Middleware
 * JWT-based auth with role checks and permission system
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT and attach user to request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Role-based access control
// Usage: authorize('admin', 'owner') — allows admin OR owner
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

// Check specific inventory permission for employees
const checkInventoryPermission = (permType) => {
  return (req, res, next) => {
    const user = req.user;
    // Admins, owners, managers bypass permission checks
    if (['admin', 'owner', 'manager'].includes(user.role)) return next();
    // Employees need explicit permission
    if (!user.permissions[permType]) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission for this action',
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize, checkInventoryPermission };
