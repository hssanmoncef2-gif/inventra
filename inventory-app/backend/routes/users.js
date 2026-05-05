/**
 * Users Routes (Admin/Manager)
 * Manage users, update roles, set permissions
 */

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// --- GET all users (admin: all, manager: employees only) ---
router.get('/', authorize('admin', 'manager', 'owner'), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'manager') filter = { role: 'employee' };

    const users = await User.find(filter)
      .select('-password -refreshTokens')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- GET single user ---
router.get('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- PUT update user (role, permissions, status) ---
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, role, permissions, isActive } = req.body;

    // Managers can only edit employees
    if (req.user.role === 'manager') {
      if (user.role !== 'employee') {
        return res.status(403).json({ success: false, message: 'Managers can only edit employees' });
      }
      // Managers can only set permissions, not role
      if (permissions) user.permissions = { ...user.permissions, ...permissions };
    } else {
      // Admin can change everything
      if (name) user.name = name;
      if (role) user.role = role;
      if (permissions) user.permissions = { ...user.permissions, ...permissions };
      if (isActive !== undefined) user.isActive = isActive;
    }

    await user.save();
    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- DELETE user (admin only — soft delete by deactivating) ---
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- GET admin dashboard overview ---
router.get('/admin/overview', authorize('admin'), async (req, res) => {
  try {
    const Inventory = require('../models/Inventory');

    const [totalUsers, usersByRole, totalItems, totalValue] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Inventory.countDocuments({ isActive: true }),
      Inventory.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$quantity'] } } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        usersByRole,
        totalItems,
        totalInventoryValue: totalValue[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
