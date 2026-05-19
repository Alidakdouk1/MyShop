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
    if (!result.error) {
      dispatch(fetchCart())
      dispatch(fetchWishlist())
      return result.payload.user
    }
    return null
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
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    clearError: () => dispatch(clearError()),
  }
}
