require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const FRESH = process.argv.includes('--fresh');

async function migrate() {
  const client = await pool.connect();

  try {
    if (FRESH) {
      console.log('⚠️  Running FRESH migration — dropping existing schema...');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      console.log('Schema dropped and recreated.');
    }

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Get already-run migrations
    const { rows: done } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    const doneSet = new Set(done.map((r) => r.filename));

    // Get all migration files sorted
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (doneSet.has(file)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Running migration: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✓ ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Failed: ${file}`, err.message);
        throw err;
      }
    }

    if (ran === 0) {
      console.log('No new migrations to run.');
    } else {
      console.log(`\n✓ ${ran} migration(s) completed.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
