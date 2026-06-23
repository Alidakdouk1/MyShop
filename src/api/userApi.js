import api from './axios'

export const getProfile        = ()           => api.get('/users/profile')
export const updateProfile     = (data)       => api.put('/users/profile', data)
export const getUserStats      = ()           => api.get('/users/stats')
export const uploadAvatar      = (formData)   => api.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getAddresses      = ()           => api.get('/users/addresses')
export const addAddress        = (data)       => api.post('/users/addresses', data)
export const updateAddress     = (id, data)   => api.put(`/users/addresses/${id}`, data)
export const deleteAddress     = (id)         => api.delete(`/users/addresses/${id}`)
export const getWishlist       = ()           => api.get('/wishlist')
export const addToWishlist     = (productId)  => api.post('/wishlist', { product_id: productId })
export const removeFromWishlist = (id)        => api.delete(`/wishlist/${id}`)

// Public wishlist sharing
export const getWishlistShare    = ()      => api.get('/wishlist/share')
export const enableWishlistShare = ()      => api.post('/wishlist/share')
export const disableWishlistShare = ()     => api.delete('/wishlist/share')
export const getSharedWishlist   = (token) => api.get(`/wishlists/shared/${token}`)
