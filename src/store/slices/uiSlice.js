import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { cartOpen: false, mobileMenuOpen: false, toasts: [] },
  reducers: {
    toggleCart:       s => { s.cartOpen = !s.cartOpen },
    setCartOpen:      (s, a) => { s.cartOpen = a.payload },
    toggleMobileMenu: s => { s.mobileMenuOpen = !s.mobileMenuOpen },
    setMobileMenu:    (s, a) => { s.mobileMenuOpen = a.payload },
    addToast: (s, a) => {
      s.toasts.push({ id: Date.now() + Math.random(), duration: 4000, ...a.payload })
    },
    removeToast: (s, a) => { s.toasts = s.toasts.filter(t => t.id !== a.payload) },
  },
})

export const { toggleCart, setCartOpen, toggleMobileMenu, setMobileMenu, addToast, removeToast } = uiSlice.actions
export const selectCartOpen       = s => s.ui.cartOpen
export const selectMobileMenuOpen = s => s.ui.mobileMenuOpen
export const selectToasts         = s => s.ui.toasts
export default uiSlice.reducer
