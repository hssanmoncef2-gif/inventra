/**
 * Automatic Backup Utility
 * Exports inventory + users to JSON files on a schedule
 * Run standalone: node utils/backup.js
 */

const fs = require('fs');
const path = require('path');

const backup = async () => {
  try {
    const mongoose = require('mongoose');
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const Inventory = require('../models/Inventory');
    const User = require('../models/User');

    const backupDir = path.join(__dirname, '..', process.env.BACKUP_DIR || 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const [inventory, users] = await Promise.all([
      Inventory.find({}).lean(),
      User.find({}).select('-password -refreshTokens').lean(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      inventory,
      users,
      counts: { inventory: inventory.length, users: users.length },
    };

    const filename = path.join(backupDir, `backup-${timestamp}.json`);
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));

    // Keep only last 30 backups
    const files = fs.readdirSync(backupDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    files.slice(30).forEach((f) => fs.unlinkSync(path.join(backupDir, f)));

    console.log(`✅ Backup created: ${filename} (${inventory.length} items, ${users.length} users)`);
    return filename;
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
    throw err;
  }
};

// Run if called directly
if (require.main === module) {
  backup().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = backup;
