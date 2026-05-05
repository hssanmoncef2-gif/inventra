/**
 * Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

// --- Token helpers ---
const signAccess = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefresh = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

// --- Register (admin/manager creates users) ---
router.post(
  '/register',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['owner', 'manager', 'employee']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, email, password, role, permissions } = req.body;

      // Managers can only create employees
      if (req.user.role === 'manager' && role !== 'employee') {
        return res.status(403).json({ success: false, message: 'Managers can only create employees' });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({
        name, email, password, role,
        permissions: permissions || {},
        createdBy: req.user._id,
      });

      res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// --- Login ---
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Invalid credentials format' });
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is disabled' });
      }

      const accessToken = signAccess(user._id);
      const refreshToken = signRefresh(user._id);

      // Store refresh token with expiry
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      user.refreshTokens.push({ token: refreshToken, expiresAt });
      // Keep only last 5 sessions
      if (user.refreshTokens.length > 5) user.refreshTokens.shift();
      user.lastLogin = new Date();
      await user.save();

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
          },
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// --- Refresh token ---
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Check token exists in user's stored tokens
    const tokenEntry = user.refreshTokens.find((t) => t.token === refreshToken);
    if (!tokenEntry || tokenEntry.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh token expired or invalid' });
    }

    const accessToken = signAccess(user._id);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// --- Logout ---
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id);
    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
    } else {
      user.refreshTokens = []; // Logout all sessions
    }
    await user.save();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Get current user ---
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = router;
