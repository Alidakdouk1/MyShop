import { configureStore } from '@reduxjs/toolkit'
import authReducer     from './slices/authSlice'
import cartReducer     from './slices/cartSlice'
import wishlistReducer from './slices/wishlistSlice'
import uiReducer       from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    cart:     cartReducer,
    wishlist: wishlistReducer,
    ui:       uiReducer,
  },
})

export default store
