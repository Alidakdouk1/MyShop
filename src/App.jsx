import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useDispatch } from 'react-redux'
import { getMeThunk } from './store/slices/authSlice'
import { fetchCart }  from './store/slices/cartSlice'
import { fetchWishlist } from './store/slices/wishlistSlice'

import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import Spinner from './components/ui/Spinner'

// Block guests from auth-only pages; admins can browse freely
function CustomerRoute({ children }) {
  return children
}

// Route-level code-splitting — each page ships as its own chunk, loaded on demand.
const Home          = lazy(() => import('./pages/Home'))
const Shop          = lazy(() => import('./pages/Shop'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart          = lazy(() => import('./pages/Cart'))
const Checkout      = lazy(() => import('./pages/Checkout'))
const NotFound      = lazy(() => import('./pages/NotFound'))

const Login    = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))

const Profile     = lazy(() => import('./pages/user/Profile'))
const Orders      = lazy(() => import('./pages/user/Orders'))
const OrderDetail = lazy(() => import('./pages/user/OrderDetail'))
const Wishlist    = lazy(() => import('./pages/user/Wishlist'))

const AdminCategories     = lazy(() => import('./pages/admin/AdminCategories'))
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers          = lazy(() => import('./pages/admin/AdminUsers'))
const AdminOrders         = lazy(() => import('./pages/admin/AdminOrders'))
const AdminProducts       = lazy(() => import('./pages/admin/AdminProducts'))
const AdminAdmins         = lazy(() => import('./pages/admin/AdminAdmins'))
const AdminAddEditProduct = lazy(() => import('./pages/admin/AddEditProduct'))
const AdminHomepage       = lazy(() => import('./pages/admin/AdminHomepage'))
const AdminShopPage       = lazy(() => import('./pages/admin/AdminShopPage'))
const AdminFilters        = lazy(() => import('./pages/admin/AdminFilters'))
const AdminReturns        = lazy(() => import('./pages/admin/AdminReturns'))
const AdminChat           = lazy(() => import('./pages/admin/AdminChat'))
const AdminQuestions      = lazy(() => import('./pages/admin/AdminQuestions'))
const AdminFlashSales     = lazy(() => import('./pages/admin/AdminFlashSales'))
const AdminAnalytics      = lazy(() => import('./pages/admin/AdminAnalytics'))
const AdminCurrencies     = lazy(() => import('./pages/admin/AdminCurrencies'))

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="xl" className="text-ink-tertiary" />
    </div>
  )
}

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
      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Customer-only — admins are redirected to /admin */}
        <Route path="/"               element={<Layout><Home /></Layout>} />
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
        <Route path="/admin/filters"           element={<ProtectedRoute role="admin"><AdminLayout><AdminFilters /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/products/new"      element={<ProtectedRoute role="admin"><AdminLayout><AdminAddEditProduct /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/products/:id/edit" element={<ProtectedRoute role="admin"><AdminLayout><AdminAddEditProduct /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/homepage"          element={<ProtectedRoute role="admin"><AdminLayout><AdminHomepage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/shop"             element={<ProtectedRoute role="admin"><AdminLayout><AdminShopPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/returns"          element={<ProtectedRoute role="admin"><AdminLayout><AdminReturns /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/chat"             element={<ProtectedRoute role="admin"><AdminLayout><AdminChat /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/questions"        element={<ProtectedRoute role="admin"><AdminLayout><AdminQuestions /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/flash-sales"      element={<ProtectedRoute role="admin"><AdminLayout><AdminFlashSales /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/analytics"        element={<ProtectedRoute role="admin"><AdminLayout><AdminAnalytics /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/currencies"       element={<ProtectedRoute role="admin"><AdminLayout><AdminCurrencies /></AdminLayout></ProtectedRoute>} />

        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
