import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as authApi from '../../api/authApi'

export const loginThunk = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(credentials)
    return data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed')
  }
})

export const registerThunk = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await authApi.register(userData)
    return data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed')
  }
})

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authApi.logout().catch(() => {})
  window.__accessToken = null
})

export const googleLoginThunk = createAsyncThunk('auth/googleLogin', async (credential, { rejectWithValue }) => {
  try {
    const { data } = await authApi.googleLogin(credential)
    return data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Google login failed')
  }
})

// Page-load auth probe. Try refresh-token first so that:
//   • Anonymous visitors hit exactly one 401 (the refresh endpoint) instead of
//     a chain of /me → 401 → refresh → 401 → retried /me → 401.
//   • Returning visitors with a valid refresh cookie mint a new access token
//     before /me is called, so /me always sees a Bearer header and returns 200.
export const getMeThunk = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data: refresh } = await authApi.refreshToken()
    window.__accessToken = refresh.data.access_token
  } catch {
    // No valid refresh cookie — visitor is anonymous. Don't even try /me.
    return rejectWithValue(null)
  }
  try {
    const { data } = await authApi.getMe()
    return data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, initialized: false, error: null },
  reducers: {
    setUser:    (state, action) => { state.user = action.payload },
    clearUser:  (state) => { state.user = null },
    clearError: (state) => { state.error = null },
  },
  extraReducers: builder => {
    builder
      .addCase(loginThunk.pending,    s => { s.loading = true; s.error = null })
      .addCase(loginThunk.fulfilled,  (s, a) => {
        s.loading = false
        // 2FA-required responses carry no user/token — keep state untouched
        // so the user remains logged-out until /2fa/verify-login succeeds.
        if (a.payload?.two_factor_required) return
        s.user = a.payload.user
        window.__accessToken = a.payload.access_token
      })
      .addCase(loginThunk.rejected,   (s, a) => { s.loading = false; s.error = a.payload })
      .addCase(registerThunk.pending, s => { s.loading = true; s.error = null })
      .addCase(registerThunk.fulfilled, (s, a) => {
        s.loading = false
        s.user = a.payload.user
        window.__accessToken = a.payload.access_token
      })
      .addCase(registerThunk.rejected,   (s, a) => { s.loading = false; s.error = a.payload })
      .addCase(googleLoginThunk.pending,    s => { s.loading = true; s.error = null })
      .addCase(googleLoginThunk.fulfilled,  (s, a) => {
        s.loading = false
        s.user = a.payload.user
        window.__accessToken = a.payload.access_token
      })
      .addCase(googleLoginThunk.rejected,   (s, a) => { s.loading = false; s.error = a.payload })
      .addCase(logoutThunk.fulfilled,   s => { s.user = null })
      .addCase(getMeThunk.pending,      s => { s.loading = true })
      .addCase(getMeThunk.fulfilled,    (s, a) => { s.loading = false; s.user = a.payload; s.initialized = true })
      .addCase(getMeThunk.rejected,     s => { s.loading = false; s.initialized = true })
  },
})

export const { setUser, clearUser, clearError } = authSlice.actions
export const selectUser            = s => s.auth.user
export const selectAuthLoading     = s => s.auth.loading
export const selectAuthError       = s => s.auth.error
export const selectAuthInitialized = s => s.auth.initialized
export default authSlice.reducer
