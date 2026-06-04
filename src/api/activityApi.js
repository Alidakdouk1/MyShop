import api from './axios'

export const getRecentActivity   = ()     => api.get('/activity/recent')
export const getActivitySettings = ()     => api.get('/admin/activity/settings')
export const updateActivitySettings = (s) => api.put('/admin/activity/settings', s)
