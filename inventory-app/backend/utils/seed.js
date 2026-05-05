/**
 * Database Seeder
 * Creates default admin user and sample data on first run
 */

const User = require('../models/User');

const seed = async () => {
  try {
    // Create default admin if not exists
    const adminExists = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
        role: 'admin',
        isActive: true,
      });
      console.log(`✅ Default admin created: ${process.env.DEFAULT_ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('Seeder error:', err.message);
  }
};

module.exports = seed;
