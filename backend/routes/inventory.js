/**
 * Inventory Routes
 * Full CRUD with image upload, search, filtering, pagination
 * Role-based access: all authenticated users can view
 * Add/Edit/Delete: managers+ or employees with permission
 */

const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const Inventory = require('../models/Inventory');
const { authenticate, authorize, checkInventoryPermission } = require('../middleware/auth');

// --- Multer config for image uploads ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `item-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, and WEBP images allowed'));
  },
});

// All routes require authentication
router.use(authenticate);

// --- GET all items (with search, filter, pagination) ---
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      sortBy = 'createdAt',
      order = 'desc',
      lowStock,
    } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$minStock'] };

    let queryBuilder = Inventory.find(filter);

    // Text search
    if (search) {
      queryBuilder = Inventory.find({
        ...filter,
        $text: { $search: search },
      });
    }

    const total = await Inventory.countDocuments(filter);
    const items = await queryBuilder
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: +page,
        limit: +limit,
        pages: Math.ceil(total / +limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- GET categories list ---
router.get('/categories', async (req, res) => {
  try {
    const categories = await Inventory.distinct('category', { isActive: true });
    res.json({ success: true, data: categories.filter(Boolean).sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- GET analytics summary (owner+ only) ---
router.get('/analytics', authorize('admin', 'owner', 'manager'), async (req, res) => {
  try {
    const [summary] = await Inventory.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalUnits: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ['$quantity', '$minStock'] }, 1, 0] },
          },
        },
      },
    ]);

    const byCategory = await Inventory.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalUnits: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    const lowStockItems = await Inventory.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStock'] },
    }).select('name reference quantity minStock').limit(10);

    res.json({
      success: true,
      data: {
        summary: summary || { totalItems: 0, totalUnits: 0, totalValue: 0 },
        byCategory,
        lowStockItems,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- GET single item ---
router.get('/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('history.changedBy', 'name');

    if (!item || !item.isActive) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- POST create item ---
router.post(
  '/',
  checkInventoryPermission('canAddInventory'),
  upload.single('image'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('reference').trim().notEmpty().withMessage('Reference is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const itemData = {
        ...req.body,
        price: parseFloat(req.body.price),
        quantity: parseInt(req.body.quantity),
        createdBy: req.user._id,
      };

      if (req.file) {
        itemData.image = {
          url: `/uploads/${req.file.filename}`,
          filename: req.file.filename,
        };
      }

      const item = await Inventory.create(itemData);

      // Record creation in history
      item.history.push({ action: 'created', changedBy: req.user._id, changes: { initial: true } });
      await item.save();

      res.status(201).json({ success: true, message: 'Item created successfully', data: item });
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'Reference already exists' });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// --- PUT update item ---
router.put(
  '/:id',
  checkInventoryPermission('canEditInventory'),
  upload.single('image'),
  async (req, res) => {
    try {
      const item = await Inventory.findById(req.params.id);
      if (!item || !item.isActive) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      const oldData = item.toObject();
      const { name, price, quantity, category, description, unit, minStock, reference } = req.body;

      if (name !== undefined) item.name = name;
      if (price !== undefined) item.price = parseFloat(price);
      if (quantity !== undefined) item.quantity = parseInt(quantity);
      if (category !== undefined) item.category = category;
      if (description !== undefined) item.description = description;
      if (unit !== undefined) item.unit = unit;
      if (minStock !== undefined) item.minStock = parseInt(minStock);
      if (reference !== undefined) item.reference = reference;

      if (req.file) {
        // Delete old image if exists
        if (item.image?.filename) {
          const oldPath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', item.image.filename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        item.image = { url: `/uploads/${req.file.filename}`, filename: req.file.filename };
      }

      item.updatedBy = req.user._id;
      item.history.push({
        action: 'updated',
        changedBy: req.user._id,
        changes: { before: oldData, after: req.body },
      });

      await item.save();
      res.json({ success: true, message: 'Item updated successfully', data: item });
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// --- DELETE item (soft delete) ---
router.delete(
  '/:id',
  checkInventoryPermission('canDeleteInventory'),
  async (req, res) => {
    try {
      const item = await Inventory.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

      item.isActive = false;
      item.updatedBy = req.user._id;
      await item.save();

      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
