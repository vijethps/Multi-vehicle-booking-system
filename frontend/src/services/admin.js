import api from '../lib/axios'

export const adminApi = {
  getDashboard:  ()       => api.get('/admin/dashboard'),
  getRevenue:    (params) => api.get('/admin/reports/revenue', { params }),
  getFleet:      (params) => api.get('/admin/reports/fleet', { params }),
  getBookings:   (params) => api.get('/admin/bookings', { params }),
  getBooking:    (id)     => api.get(`/admin/bookings/${id}`),
  confirmBooking:(id)     => api.post(`/admin/bookings/${id}/confirm`),
  refundBooking: (id)     => api.post(`/admin/bookings/${id}/refund`),
  getUsers:      (params) => api.get('/admin/users', { params }),
  toggleUser:    (id, is_active) => api.patch(`/admin/users/${id}/status`, { is_active }),
}
