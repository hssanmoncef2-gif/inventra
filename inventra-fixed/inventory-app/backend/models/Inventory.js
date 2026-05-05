/**
 * Inventory Item Model
 * Core inventory data structure with full audit trail
 */

const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    index: true,
  },
  reference: {
    type: String,
    required: [true, 'Reference is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9\-_]+$/, 'Reference must be alphanumeric (hyphens/underscores allowed)'],
  },
  category: {
    type: String,
    trim: true,
    default: 'Uncategorized',
    index: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  unit: {
    type: String,
    default: 'pcs',
    trim: true,
  },
  // Low stock threshold for alerts
  minStock: {
    type: Number,
    default: 5,
    min: 0,
  },
  image: {
    url: String,
    filename: String,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  // Who created/last modified this item
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Change history for audit trail
  history: [{
    action: { type: String, enum: ['created', 'updated', 'quantity_change'] },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changes: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: total value of this item in stock
inventorySchema.virtual('totalValue').get(function () {
  return +(this.price * this.quantity).toFixed(2);
});

// Virtual: low stock indicator
inventorySchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minStock;
});

// Text search index
inventorySchema.index({ name: 'text', reference: 'text', description: 'text', category: 'text' });

// Compound index for common queries
inventorySchema.index({ isActive: 1, category: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
