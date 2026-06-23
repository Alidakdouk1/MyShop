import api from './axios'

// Public — homepage carousel reads from this.
export const getTestimonials = () => api.get('/testimonials')

// Admin
export const getAdminTestimonials       = ()         => api.get('/admin/testimonials')
export const getTestimonialCandidates   = ()         => api.get('/admin/testimonials/candidates')
export const createAdminTestimonial     = (data)     => api.post('/admin/testimonials', data)
export const updateAdminTestimonial     = (id, data) => api.put(`/admin/testimonials/${id}`, data)
export const deleteAdminTestimonial     = (id)       => api.delete(`/admin/testimonials/${id}`)
