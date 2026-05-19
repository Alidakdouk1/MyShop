import api from './axios'

export const getProfile        = ()           => api.get('/users/profile')
export const updateProfile     = (data)       => api.put('/users/profile', data)
export const getAddresses      = ()           => api.get('/users/addresses')
export const addAddress        = (data)       => api.post('/users/addresses', data)
export const updateAddress     = (id, data)   => api.put(`/users/addresses/${id}`, data)
export const deleteAddress     = (id)         => api.delete(`/users/addresses/${id}`)
export const getWishlist       = ()           => api.get('/wishlist')
export const addToWishlist     = (productId)  => api.post('/wishlist', { product_id: productId })
export const removeFromWishlist = (id)        => api.delete(`/wishlist/${id}`)
