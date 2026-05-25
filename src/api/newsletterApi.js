import api from './axios'

export const subscribeNewsletter = (email, source = 'footer') =>
  api.post('/newsletter/subscribe', { email, source })
