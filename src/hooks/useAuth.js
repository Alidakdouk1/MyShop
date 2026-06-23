import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  selectUser, selectAuthLoading, selectAuthError,
  loginThunk, logoutThunk, registerThunk, clearError,
} from '../store/slices/authSlice'
import { setCartItems, fetchCart } from '../store/slices/cartSlice'
import { fetchWishlist }  from '../store/slices/wishlistSlice'

export function useAuth() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const user      = useSelector(selectUser)
  const loading   = useSelector(selectAuthLoading)
  const error     = useSelector(selectAuthError)

  const login = async (credentials) => {
    const result = await dispatch(loginThunk(credentials))
    if (result.error) return null
    // 2FA gate: caller (Login page) needs to handle the challenge step.
    if (result.payload?.two_factor_required) {
      return { twoFactorRequired: true, challenge: result.payload.challenge }
    }
    dispatch(fetchCart())
    dispatch(fetchWishlist())
    return result.payload.user
  }

  // Second step after a 2FA challenge from login(). Returns the user on success.
  const verifyTwoFactor = async (challenge, code) => {
    const { verifyTwoFactorLogin } = await import('../api/authApi')
    try {
      const { data } = await verifyTwoFactorLogin(challenge, code)
      window.__accessToken = data.data.access_token
      // Reuse the same shape Redux already understands.
      dispatch({ type: 'auth/login/fulfilled', payload: data.data })
      dispatch(fetchCart())
      dispatch(fetchWishlist())
      return data.data.user
    } catch (err) {
      return { error: err.response?.data?.message || 'Invalid code' }
    }
  }

  const register = async (userData) => {
    const result = await dispatch(registerThunk(userData))
    if (!result.error) {
      dispatch(fetchCart())
      return true
    }
    return false
  }

  const logout = async () => {
    await dispatch(logoutThunk())
    dispatch(setCartItems([]))
    navigate('/')
  }

  return {
    user,
    loading,
    error,
    login,
    verifyTwoFactor,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    clearError: () => dispatch(clearError()),
  }
}
