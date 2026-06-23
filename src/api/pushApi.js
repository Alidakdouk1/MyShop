import api from './axios'

export const getPushPublicKey = ()        => api.get('/push/public-key')
export const subscribePush    = (payload) => api.post('/push/subscriptions',  payload)
export const unsubscribePush  = (payload) => api.delete('/push/subscriptions', { data: payload })
