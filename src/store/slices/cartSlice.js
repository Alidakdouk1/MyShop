import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as cartApi from '../../api/cartApi'

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try { const { data } = await cartApi.getCart(); return data.data }
  catch { return rejectWithValue('Failed to load cart') }
})

export const addToCartThunk = createAsyncThunk('cart/add', async (item, { rejectWithValue }) => {
  try { const { data } = await cartApi.addToCart(item); return data.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to add to cart') }
})

export const updateCartItemThunk = createAsyncThunk('cart/update', async ({ id, quantity }, { rejectWithValue }) => {
  try { const { data } = await cartApi.updateCartItem(id, { quantity }); return data.data }
  catch { return rejectWithValue('Failed to update item') }
})

export const removeCartItemThunk = createAsyncThunk('cart/remove', async (id, { rejectWithValue }) => {
  try { await cartApi.removeCartItem(id); return id }
  catch { return rejectWithValue('Failed to remove item') }
})

export const clearCartThunk = createAsyncThunk('cart/clear', async () => {
  await cartApi.clearCart()
})

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [], loading: false, error: null,
    // Server-evaluated automatic promos (BOGO + free gift) — shape from
    // PromotionModel::evaluate(): { savings_total, adjustments[], free_items[] }
    promotions: { savings_total: 0, adjustments: [], free_items: [] },
  },
  reducers: {
    setCartItems: (state, action) => { state.items = action.payload },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCart.pending,             s => { s.loading = true })
      .addCase(fetchCart.fulfilled,           (s, a) => {
        s.loading = false
        s.items = a.payload?.items || []
        if (a.payload?.promotions) s.promotions = a.payload.promotions
      })
      .addCase(fetchCart.rejected,            s => { s.loading = false })
      .addCase(addToCartThunk.fulfilled,      (s, a) => {
        s.items = a.payload?.items || s.items
        if (a.payload?.promotions) s.promotions = a.payload.promotions
      })
      .addCase(updateCartItemThunk.fulfilled, (s, a) => {
        s.items = a.payload?.items || s.items
        if (a.payload?.promotions) s.promotions = a.payload.promotions
      })
      .addCase(removeCartItemThunk.fulfilled, (s, a) => { s.items = s.items.filter(i => i.id !== a.payload) })
      .addCase(clearCartThunk.fulfilled,      s => {
        s.items = []
        s.promotions = { savings_total: 0, adjustments: [], free_items: [] }
      })
  },
})

export const { setCartItems } = cartSlice.actions
export const selectCartItems      = s => s.cart.items
export const selectCartCount      = s => s.cart.items.reduce((n, i) => n + i.quantity, 0)
export const selectCartTotal      = s => s.cart.items.reduce((n, i) => n + (parseFloat(i.price) * i.quantity), 0)
export const selectCartLoading    = s => s.cart.loading
export const selectCartPromotions = s => s.cart.promotions
export default cartSlice.reducer
