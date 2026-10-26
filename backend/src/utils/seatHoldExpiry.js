const { query } = require('../config/database');

/**
 * Runs every 2 minutes and cleans up expired seat holds.
 * This frees seats that were held but never booked (checkout abandoned).
 */
function startSeatHoldExpiry() {
  const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

  const cleanup = async () => {
    try {
      const result = await query(
        'DELETE FROM seat_holds WHERE expires_at <= NOW()'
      );
      if (result.rowCount > 0) {
        console.log(`[SeatHoldExpiry] Released ${result.rowCount} expired hold(s)`);
      }
    } catch (err) {
      console.error('[SeatHoldExpiry] Cleanup error:', err.message);
    }
  };

  // Run immediately on startup, then every 2 minutes
  cleanup();
  setInterval(cleanup, INTERVAL_MS);
  console.log('[SeatHoldExpiry] Auto-expiry started (every 2 minutes)');
}

module.exports = { startSeatHoldExpiry };
