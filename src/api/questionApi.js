import api from './axios'

// ── Customer ──
export const getProductQuestions = (productId)        => api.get(`/products/${productId}/questions`)
export const askQuestion         = (productId, question) => api.post('/questions', { product_id: productId, question })
export const deleteQuestion      = (id)               => api.delete(`/questions/${id}`)

// ── Admin ──
export const getAdminQuestions       = (params)       => api.get('/admin/questions', { params })
export const answerQuestion          = (id, answer)   => api.put(`/admin/questions/${id}`, { answer })
export const getAdminQuestionsUnread = ()             => api.get('/admin/questions/unread')
