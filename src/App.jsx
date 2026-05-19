import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getMeThunk, selectUser } from './store/slices/authSlice'
import { fetchCart }  from './store/slices/cartSlice'
import { fetchWishlist } from './store/slices/wishlistSlice'

import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/common/ProtectedRoute'

// Redirect admins away from all customer-facing pages
function CustomerRoute({ children }) {
  const user = useSelector(selectUser)
  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  return children
}

import Home          from './pages/Home'
import Shop          from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart          from './pages/Cart'
import Checkout      from './pages/Checkout'
import NotFound      from './pages/NotFound'

import Login    from './pages/auth/Login'
import Register from './pages/auth/Register'

import Profile     from './pages/user/Profile'
import Orders      from './pages/user/Orders'
import OrderDetail from './pages/user/OrderDetail'
import Wishlist    from './pages/user/Wishlist'

import AdminCategories     from './pages/admin/AdminCategories'
import AdminDashboard      from './pages/admin/AdminDashboard'
import AdminUsers          from './pages/admin/AdminUsers'
import AdminOrders         from './pages/admin/AdminOrders'
import AdminProducts       from './pages/admin/AdminProducts'
import AdminAdmins         from './pages/admin/AdminAdmins'
import AdminAddEditProduct from './pages/admin/AddEditProduct'
import AdminHomepage       from './pages/admin/AdminHomepage'

function AppInit() {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(getMeThunk()).then(result => {
      if (!result.error) {
        dispatch(fetchCart())
        dispatch(fetchWishlist())
      }
    })

    const onLogout = () => {}
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [dispatch])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        {/* Customer-only — admins are redirected to /admin */}
        <Route path="/"               element={<CustomerRoute><Layout><Home /></Layout></CustomerRoute>} />
        <Route path="/shop"           element={<CustomerRoute><Layout><Shop /></Layout></CustomerRoute>} />
        <Route path="/products/:slug" element={<CustomerRoute><Layout><ProductDetail /></Layout></CustomerRoute>} />
        <Route path="/cart"           element={<CustomerRoute><Layout><Cart /></Layout></CustomerRoute>} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<CustomerRoute><Register /></CustomerRoute>} />

        {/* Protected — logged-in customers only */}
        <Route path="/checkout"            element={<CustomerRoute><ProtectedRoute><Layout><Checkout /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/profile"     element={<CustomerRoute><ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/orders"      element={<CustomerRoute><ProtectedRoute><Layout><Orders /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/orders/:id"  element={<CustomerRoute><ProtectedRoute><Layout><OrderDetail /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/wishlist"    element={<CustomerRoute><ProtectedRoute><Layout><Wishlist /></Layout></ProtectedRoute></CustomerRoute>} />

        {/* Protected — admin only */}
        <Route path="/admin"                   element={<ProtectedRoute role="admin"><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/users"             element={<ProtectedRoute role="admin"><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/admins"            element={<ProtectedRoute role="admin"><AdminLayout><AdminAdmins /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/orders"            element={<ProtectedRoute role="admin"><AdminLayout><AdminOrders /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/products"          element={<ProtectedRoute role="admin"><AdminLayout><AdminProducts /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/categories"        element={<ProtectedRoute role="admin"><AdminLayout><AdminCategories /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/products/new"      element={<ProtectedRoute role="admin"><AdminLayout><AdminAddEditProduct /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/products/:id/edit" element={<ProtectedRoute role="admin"><AdminLayout><AdminAddEditProduct /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/homepage"          element={<ProtectedRoute role="admin"><AdminLayout><AdminHomepage /></AdminLayout></ProtectedRoute>} />

        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
