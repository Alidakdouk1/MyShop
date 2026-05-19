import api from './axios'

export const getCart        = ()          => api.get('/cart')
export const addToCart      = (data)      => api.post('/cart/items', data)
export const updateCartItem = (id, data)  => api.put(`/cart/items/${id}`, data)
export const removeCartItem = (id)        => api.delete(`/cart/items/${id}`)
export const clearCart      = ()          => api.delete('/cart')
export const mergeCart      = (items)     => api.post('/cart/merge', { items })
