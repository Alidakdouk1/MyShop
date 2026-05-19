import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getWishlist, addToWishlist, removeFromWishlist } from '../../api/userApi'

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
  try { const { data } = await getWishlist(); return data.data }
  catch { return rejectWithValue('Failed to load wishlist') }
})

const OPT_PREFIX = '__opt__'

export const toggleWishlistThunk = createAsyncThunk(
  'wishlist/toggle',
  async ({ productId, wishlistItemId }, { rejectWithValue }) => {
    try {
      // skip double-clicks on optimistic placeholder
      if (wishlistItemId && String(wishlistItemId).startsWith(OPT_PREFIX)) return {}
      if (wishlistItemId) {
        await removeFromWishlist(wishlistItemId)
        return { removed: wishlistItemId }
      }
      const { data } = await addToWishlist(productId)
      return { added: data.data }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { items: [], loading: false, _snap: null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchWishlist.fulfilled, (s, a) => { s.items = a.payload || [] })
      .addCase(toggleWishlistThunk.pending, (s, a) => {
        const { productId, wishlistItemId } = a.meta.arg
        if (wishlistItemId && String(wishlistItemId).startsWith(OPT_PREFIX)) return
        s._snap = [...s.items]
        if (wishlistItemId) {
          s.items = s.items.filter(i => i.id !== wishlistItemId)
        } else {
          s.items.push({ id: `${OPT_PREFIX}${productId}`, product_id: productId })
        }
      })
      .addCase(toggleWishlistThunk.fulfilled, (s, a) => {
        s._snap = null
        if (a.payload.removed) {
          s.items = s.items.filter(i => i.id !== a.payload.removed && !String(i.id).startsWith(OPT_PREFIX))
        }
        if (a.payload.added) {
          const idx = s.items.findIndex(i => String(i.id).startsWith(OPT_PREFIX) && i.product_id === a.meta.arg.productId)
          if (idx !== -1) s.items[idx] = a.payload.added
          else s.items.push(a.payload.added)
        }
      })
      .addCase(toggleWishlistThunk.rejected, (s) => {
        if (s._snap) s.items = s._snap
        s._snap = null
      })
  },
})

export const selectWishlistItems   = s => s.wishlist.items
export const selectIsWishlisted    = productId => s => s.wishlist.items.some(i => i.product_id === productId)
export const selectWishlistItemId  = productId => s => s.wishlist.items.find(i => i.product_id === productId)?.id
export default wishlistSlice.reducer
