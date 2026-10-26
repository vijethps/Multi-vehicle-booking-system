import api from '../lib/axios'

export const tripsApi = {
  getAll:  (params) => api.get('/trips', { params }),
  getById: (id)     => api.get(`/trips/${id}`),
  getSeats:(id)     => api.get(`/trips/${id}/seats`),
  create:  (data)   => api.post('/trips', data),
  updateStatus: (id, status) => api.patch(`/trips/${id}/status`, { status }),
}

export const routesApi = {
  getAll:  ()       => api.get('/routes'),
  getById: (id)     => api.get(`/routes/${id}`),
  create:  (data)   => api.post('/routes', data),
}

export const seatsApi = {
  getLayouts:   ()     => api.get('/seats/layouts'),
  getLayout:    (id)   => api.get(`/seats/layouts/${id}`),
  createLayout: (data) => api.post('/seats/layouts', data),
  holdSeats:    (data) => api.post('/seats/hold', data),
  releaseHolds: (data) => api.post('/seats/release', data),
}
