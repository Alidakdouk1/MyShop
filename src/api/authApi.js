import api from './axios'

export const register      = (data)  => api.post('/auth/register', data)
export const login         = (data)  => api.post('/auth/login', data)
export const logout        = ()      => api.post('/auth/logout')
export const refreshToken  = ()      => api.post('/auth/refresh-token')
export const getMe         = ()      => api.get('/auth/me')
export const forgotPassword = (email)      => api.post('/auth/forgot-password', { email })
export const resetPassword  = (data)       => api.post('/auth/reset-password', data)
export const googleLogin    = (credential) => api.post('/auth/google', { credential })

// Two-factor auth (TOTP)
export const setupTwoFactor       = ()                  => api.get('/auth/2fa/setup')
export const enableTwoFactor      = (code)              => api.post('/auth/2fa/enable',  { code })
export const disableTwoFactor     = (password)          => api.post('/auth/2fa/disable', { password })
export const verifyTwoFactorLogin = (challenge, code)   => api.post('/auth/2fa/verify-login', { challenge, code })
