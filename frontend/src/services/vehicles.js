import api from '../lib/axios'

export const vehiclesApi = {
  getAll: (params) => api.get('/vehicles', { params }),
  getById: (id) => api.get(`/vehicles/${id}`),
  checkAvailability: (id, params) => api.get(`/vehicles/${id}/availability`, { params }),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  updateStatus: (id, is_active) => api.patch(`/vehicles/${id}/status`, { is_active }),
  addImage: (id, data) => api.post(`/vehicles/${id}/images`, data),
}

export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  getTypes: (id) => api.get(`/categories/${id}/types`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
}
