import api from './axios'

export const getReels        = (params)  => api.get('/reels', { params })
export const recordReelView  = (id)      => api.post(`/reels/${id}/view`)

// Comments
export const getReelComments    = (reelId)        => api.get(`/reels/${reelId}/comments`)
export const postReelComment    = (reelId, text)  => api.post(`/reels/${reelId}/comments`, { text })
export const deleteReelComment  = (commentId)     => api.delete(`/reels/comments/${commentId}`)

// Settings
export const getReelSettings       = ()       => api.get('/reels/settings')
export const getAdminReelSettings  = ()       => api.get('/admin/reels/settings')
export const updateReelSettings    = (data)   => api.put('/admin/reels/settings', data)

// Admin
export const adminListReels  = ()              => api.get('/admin/reels')
export const adminPinReel    = (id, pinned)    => api.put(`/admin/reels/${id}/pin`, { pinned })
export const adminReorderReels = (order)       => api.put('/admin/reels/reorder', { order })
