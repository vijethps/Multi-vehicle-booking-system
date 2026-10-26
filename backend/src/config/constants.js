module.exports = {
  // Roles
  ROLES: {
    CUSTOMER: 'customer',
    ADMIN: 'admin',
    FLEET_MANAGER: 'fleet_manager',
    STAFF: 'staff',
  },

  // Booking statuses
  BOOKING_STATUS: {
    DRAFT: 'draft',
    PENDING_PAYMENT: 'pending_payment',
    PENDING_APPROVAL: 'pending_approval',
    CONFIRMED: 'confirmed',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PAYMENT_FAILED: 'payment_failed',
    REFUND_PENDING: 'refund_pending',
  },

  // Payment statuses
  PAYMENT_STATUS: {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    PARTIALLY_REFUNDED: 'partially_refunded',
  },

  // Booking types
  BOOKING_TYPE: {
    VEHICLE_RENTAL: 'vehicle_rental',
    SEAT_BOOKING: 'seat_booking',
    FULL_VEHICLE_CHARTER: 'full_vehicle_charter',
    GOODS_TRANSPORT: 'goods_transport',
  },

  // Vehicle categories
  VEHICLE_CATEGORY: {
    CAR: 'car',
    BIKE: 'bike',
    BUS: 'bus',
    MINI_BUS: 'mini_bus',
    TEMPO: 'tempo',
    TRUCK: 'truck',
    OTHER: 'other',
  },

  // Seat types
  SEAT_TYPE: {
    SEATER: 'seater',
    SLEEPER: 'sleeper',
    SEMI_SLEEPER: 'semi_sleeper',
    UPPER_BERTH: 'upper_berth',
    LOWER_BERTH: 'lower_berth',
  },

  // Deck types
  DECK: {
    LOWER: 'lower',
    UPPER: 'upper',
    SINGLE: 'single',
  },

  // Pricing methods
  PRICING_METHOD: {
    HOURLY: 'hourly',
    DAILY: 'daily',
    PER_KM: 'per_km',
    FIXED: 'fixed',
    SEAT_BASED: 'seat_based',
  },

  // Trip statuses
  TRIP_STATUS: {
    SCHEDULED: 'scheduled',
    BOARDING: 'boarding',
    DEPARTED: 'departed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DELAYED: 'delayed',
  },

  // Seat hold duration (minutes)
  SEAT_HOLD_MINUTES: parseInt(process.env.SEAT_HOLD_MINUTES) || 15,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};
