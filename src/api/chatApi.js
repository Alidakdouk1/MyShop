import api from './axios'

// ── Customer ──
export const getMyChat     = ()         => api.get('/chat')
export const pollMyChat    = (after = 0) => api.get('/chat/poll', { params: { after } })
export const sendChat      = (body)     => api.post('/chat/send', { body })
export const getChatUnread = ()         => api.get('/chat/unread')

// ── Admin ──
export const getAdminConversations = ()             => api.get('/admin/chat/conversations')
export const getAdminChatMessages  = (id, after = 0) => api.get(`/admin/chat/conversations/${id}/messages`, { params: { after } })
export const sendAdminChat         = (id, body)      => api.post(`/admin/chat/conversations/${id}/messages`, { body })
export const setConversationStatus = (id, status)   => api.put(`/admin/chat/conversations/${id}`, { status })
export const getAdminChatUnread    = ()              => api.get('/admin/chat/unread')
