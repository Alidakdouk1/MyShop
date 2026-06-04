import api from './axios'

// Public — checkout reads the published bank details inline.
export const getBankTransferInfo = () => api.get('/payment/bank-transfer')

export const getWhishInfo               = ()    => api.get('/payment/whish')

// Admin
export const getBankTransferSettings    = ()    => api.get('/admin/payment/bank-transfer')
export const updateBankTransferSettings = (s)   => api.put('/admin/payment/bank-transfer', s)
export const getWhishSettings           = ()    => api.get('/admin/payment/whish')
export const updateWhishSettings        = (s)   => api.put('/admin/payment/whish', s)
export const markOrderPaid              = (id)  => api.put(`/admin/orders/${id}/mark-paid`)
