import api from './axios'

// Dashboard
export const getAdminDashboard  = ()          => api.get('/admin/dashboard')
export const getAbandonedCarts  = (hours)     => api.get('/admin/abandoned-carts', { params: hours ? { hours } : {} })
export const getLowStock        = ()          => api.get('/admin/low-stock')

// WhatsApp order notifications
export const getWhatsAppNotifySettings    = ()  => api.get('/admin/whatsapp-notifications')
export const updateWhatsAppNotifySettings = (s) => api.put('/admin/whatsapp-notifications', s)

// SEO tools
export const getSeoStats          = ()         => api.get('/admin/seo/stats')

// Promotions (Buy X Get Y + Free Gift)
export const getAdminPromotions   = ()         => api.get('/admin/promotions')
export const createAdminPromotion = (data)     => api.post('/admin/promotions', data)
export const updateAdminPromotion = (id, data) => api.put(`/admin/promotions/${id}`, data)
export const deleteAdminPromotion = (id)       => api.delete(`/admin/promotions/${id}`)

// Abandoned cart recovery
export const getAbandonedCartSettings    = ()       => api.get('/admin/abandoned-cart/settings')
export const updateAbandonedCartSettings = (data)   => api.put('/admin/abandoned-cart/settings', data)
export const getAbandonedCartPending     = ()       => api.get('/admin/abandoned-cart/pending')
export const sendAbandonedCartRecovery   = (cartId) => api.post(`/admin/abandoned-cart/${cartId}/send`)
export const getAnalytics       = (days = 30) => api.get('/admin/analytics', { params: { days } })

// Users
export const getAdminUsers     = (params)     => api.get('/admin/users', { params })
export const createAdminUser   = (data)       => api.post('/admin/users', data)
export const updateAdminUser   = (id, data)   => api.put(`/admin/users/${id}`, data)
export const deleteAdminUser   = (id)         => api.delete(`/admin/users/${id}`)
export const updateUserRole    = (id, role)   => api.put(`/admin/users/${id}/role`, { role })
export const getUserDetail     = (id)         => api.get(`/admin/users/${id}`)
export const setUserVipLevel   = (id, level)  => api.put(`/admin/users/${id}/vip`, { vip_level: level })

// Customer notes (admin)
export const getUserNotes      = (userId)       => api.get(`/admin/users/${userId}/notes`)
export const addUserNote       = (userId, data) => api.post(`/admin/users/${userId}/notes`, data)
export const updateUserNote    = (id, data)     => api.put(`/admin/notes/${id}`, data)
export const deleteUserNote    = (id)           => api.delete(`/admin/notes/${id}`)

// Admins
export const getAdmins         = (params)     => api.get('/admin/admins', { params })
export const createAdmin       = (data)       => api.post('/admin/admins', data)
export const updateAdmin       = (id, data)   => api.put(`/admin/admins/${id}`, data)
export const deleteAdmin       = (id)         => api.delete(`/admin/admins/${id}`)

// Orders
export const getAdminOrders    = (params)     => api.get('/admin/orders', { params })
export const updateOrderStatus = (id, status) => api.put(`/admin/orders/${id}/status`, { status })
export const updateOrderTracking = (id, data) => api.put(`/admin/orders/${id}/tracking`, data)
export const getOrderStats     = ()           => api.get('/admin/orders/stats')
export const bulkUpdateOrders  = (payload)    => api.post('/admin/orders/bulk', payload)

// Reviews
export const getAdminReviews    = (params)    => api.get('/admin/reviews', { params })

// Returns / RMA
export const getAdminReturns    = (params)    => api.get('/admin/returns', { params })
export const updateReturnStatus = (id, data)  => api.put(`/admin/returns/${id}`, data)

// Products
export const getAdminProducts       = (params)       => api.get('/admin/products', { params })
export const getAdminProduct        = (id)           => api.get(`/admin/products/${id}`)
export const adminCreateProduct     = (data)         => api.post('/admin/products', data)
export const adminUpdateProduct     = (id, data)     => api.put(`/admin/products/${id}`, data)
export const adminDeleteProduct     = (id)           => api.delete(`/admin/products/${id}`)
export const adminUploadImage       = (id, formData) => api.post(`/admin/products/${id}/images`, formData)
export const adminDeleteImage       = (id, imgId)    => api.delete(`/admin/products/${id}/images/${imgId}`)
export const adminUploadVideo       = (id, formData) => api.post(`/admin/products/${id}/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const adminAddYoutube        = (id, youtubeUrl) => api.post(`/admin/products/${id}/media`, { youtube_url: youtubeUrl })
export const adminAddVariant        = (id, data)     => api.post(`/admin/products/${id}/variants`, data)
export const adminDeleteVariant     = (id, vid)      => api.delete(`/admin/products/${id}/variants/${vid}`)
export const exportProductsCsv      = ()             => api.get('/admin/products/export', { responseType: 'blob' })
export const importProductsCsv      = (formData)     => api.post('/admin/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getProductStats        = ()             => api.get('/admin/products/stats')
export const bulkProductAction      = (ids, action, extra = {})  => api.post('/admin/products/bulk', { ids, action, ...extra })

// Categories
export const getAdminCategories    = ()           => api.get('/admin/categories')
export const createAdminCategory   = (data)       => api.post('/admin/categories', data)
export const updateAdminCategory   = (id, data)   => api.put(`/admin/categories/${id}`, data)
export const deleteAdminCategory   = (id)         => api.delete(`/admin/categories/${id}`)
export const uploadCategoryImage   = (formData)   => api.post('/admin/homepage-images', formData)

// Category sections ("others" blocks shown beside the sub-categories in the menu)
export const getAdminSections      = ()           => api.get('/admin/sections')
export const createCategorySection = (catId, data)=> api.post(`/admin/categories/${catId}/sections`, data)
export const updateCategorySection = (id, data)   => api.put(`/admin/sections/${id}`, data)
export const deleteCategorySection = (id)         => api.delete(`/admin/sections/${id}`)

// Coupons
export const getAdminCoupons   = ()           => api.get('/admin/coupons')
export const createCoupon      = (data)       => api.post('/admin/coupons', data)

// Homepage Settings (legacy – announcement bar)
export const getHomepageSettings    = ()         => api.get('/homepage-settings')
export const updateHomepageSettings = (data)     => api.put('/homepage-settings', data)
export const uploadHomepageImage    = (formData) => api.post('/admin/homepage-images', formData)

// Homepage Sections (CMS builder)
export const getHomepageSections      = ()           => api.get('/homepage-sections')
export const getAdminHomepageSections = ()           => api.get('/admin/homepage-sections')
export const createHomepageSection    = (data)       => api.post('/admin/homepage-sections', data)
export const updateHomepageSection    = (id, data)   => api.put(`/admin/homepage-sections/${id}`, data)
export const deleteHomepageSection    = (id)         => api.delete(`/admin/homepage-sections/${id}`)
export const duplicateHomepageSection = (id)         => api.post(`/admin/homepage-sections/${id}/duplicate`)
export const reorderHomepageSections  = (sections)   => api.put('/admin/homepage-sections/reorder', { sections })
