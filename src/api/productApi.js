import api from './axios'

export const getProducts       = (params)      => api.get('/products', { params })
export const getProduct        = (slug)        => api.get(`/products/${slug}`)
export const getCategories     = ()            => api.get('/categories')
export const getCategoriesFlat = ()            => api.get('/categories/flat')
export const createProduct     = (data)        => api.post('/products', data)
export const updateProduct     = (id, data)    => api.put(`/products/${id}`, data)
export const deleteProduct     = (id)          => api.delete(`/products/${id}`)
export const uploadProductImage = (id, formData) =>
  api.post(`/products/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getProductReviews = (id)          => api.get(`/products/${id}/reviews`)
export const createReview      = (data)        => api.post('/reviews', data)
export const deleteReview      = (id)          => api.delete(`/reviews/${id}`)
