import api from '../lib/axios'

export const bookingsApi = {
  create:       (data)   => api.post('/bookings', data),
  getMyBookings:(params) => api.get('/bookings/my', { params }),
  getById:      (id)     => api.get(`/bookings/${id}`),
  cancel:       (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
  pricingQuote: (data)   => api.post('/bookings/pricing-quote', data),
}

export const paymentsApi = {
  createOrder:  (booking_id) => api.post('/payments/create-order', { booking_id }),
  verify:       (data)       => api.post('/payments/verify', data),
  getHistory:   (bookingId)  => api.get(`/payments/booking/${bookingId}`),
}
