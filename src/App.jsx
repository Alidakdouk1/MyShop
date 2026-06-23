import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useDispatch } from 'react-redux'
import { getMeThunk } from './store/slices/authSlice'
import { fetchCart }  from './store/slices/cartSlice'
import { fetchWishlist } from './store/slices/wishlistSlice'

import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import RouteLoader from './components/brand/RouteLoader'
import { AddedToCartProvider } from './context/AddedToCartContext'
import PageTransition from './components/common/PageTransition'

// Block guests from auth-only pages; admins can browse freely
function CustomerRoute({ children }) {
  return children
}

// Route-level code-splitting — each page ships as its own chunk, loaded on demand.
const Home          = lazy(() => import('./pages/Home'))
const Shop          = lazy(() => import('./pages/Shop'))
const Categories    = lazy(() => import('./pages/Categories'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart          = lazy(() => import('./pages/Cart'))
const Checkout      = lazy(() => import('./pages/Checkout'))
const Compare       = lazy(() => import('./pages/Compare'))
const Reels         = lazy(() => import('./pages/Reels'))
const Marketplace       = lazy(() => import('./pages/Marketplace'))
const MarketplaceDetail = lazy(() => import('./pages/MarketplaceDetail'))
const MarketplacePost   = lazy(() => import('./pages/MarketplacePost'))
const MyAds             = lazy(() => import('./pages/user/MyAds'))
const SharedWishlist = lazy(() => import('./pages/SharedWishlist'))
const NotFound      = lazy(() => import('./pages/NotFound'))

const Login    = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))

const Profile     = lazy(() => import('./pages/user/Profile'))
const AccountHome = lazy(() => import('./pages/user/AccountHome'))
const Orders      = lazy(() => import('./pages/user/Orders'))
const OrderDetail = lazy(() => import('./pages/user/OrderDetail'))
const Wishlist    = lazy(() => import('./pages/user/Wishlist'))

const AdminCategories     = lazy(() => import('./pages/admin/AdminCategories'))
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers          = lazy(() => import('./pages/admin/AdminUsers'))
const AdminOrders         = lazy(() => import('./pages/admin/AdminOrders'))
const AdminProducts       = lazy(() => import('./pages/admin/AdminProducts'))
const AdminReels          = lazy(() => import('./pages/admin/AdminReels'))
const AdminMarketplace    = lazy(() => import('./pages/admin/AdminMarketplace'))
const AdminLowStock       = lazy(() => import('./pages/admin/AdminLowStock'))
const AdminAbandonedCarts = lazy(() => import('./pages/admin/AdminAbandonedCarts'))
const AdminShippingEstimate = lazy(() => import('./pages/admin/AdminShippingEstimate'))
const AdminTestimonials   = lazy(() => import('./pages/admin/AdminTestimonials'))
const AdminPromotions     = lazy(() => import('./pages/admin/AdminPromotions'))
const AdminSeoTools       = lazy(() => import('./pages/admin/AdminSeoTools'))
const AdminNewsletterCampaigns = lazy(() => import('./pages/admin/AdminNewsletterCampaigns'))
const AdminSalesBanner    = lazy(() => import('./pages/admin/AdminSalesBanner'))
const AdminWhatsAppNotifications = lazy(() => import('./pages/admin/AdminWhatsAppNotifications'))
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
const AdminBundles        = lazy(() => import('./pages/admin/AdminBundles'))
const AdminReviews        = lazy(() => import('./pages/admin/AdminReviews'))
const AdminActivity       = lazy(() => import('./pages/admin/AdminActivity'))
const AdminNewsletterPopup = lazy(() => import('./pages/admin/AdminNewsletterPopup'))
const AdminBankTransfer    = lazy(() => import('./pages/admin/AdminBankTransfer'))
const AdminWhish           = lazy(() => import('./pages/admin/AdminWhish'))

function PageFallback() {
  // Brand RouteLoader — replaces the generic spinner for every lazy-loaded route.
  return <RouteLoader />
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
      <AddedToCartProvider>
      <AppInit />
      <Suspense fallback={<PageFallback />}>
      <PageTransition>
      <Routes>
        {/* Customer-only — admins are redirected to /admin */}
        <Route path="/"               element={<Layout><Home /></Layout>} />
        <Route path="/shop"           element={<CustomerRoute><Layout><Shop /></Layout></CustomerRoute>} />
        <Route path="/categories"     element={<CustomerRoute><Layout><Categories /></Layout></CustomerRoute>} />
        <Route path="/products/:slug" element={<CustomerRoute><Layout><ProductDetail /></Layout></CustomerRoute>} />
        <Route path="/cart"           element={<CustomerRoute><Layout><Cart /></Layout></CustomerRoute>} />
        <Route path="/compare"        element={<CustomerRoute><Layout><Compare /></Layout></CustomerRoute>} />
        {/* Reels is fullscreen — no <Layout> wrapper so it owns the full viewport. */}
        <Route path="/reels"          element={<Reels />} />
        {/* Marketplace — browse + detail are public; posting needs auth. */}
        <Route path="/marketplace"        element={<CustomerRoute><Layout><Marketplace /></Layout></CustomerRoute>} />
        <Route path="/marketplace/post"   element={<CustomerRoute><ProtectedRoute><Layout><MarketplacePost /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/marketplace/:id/edit" element={<CustomerRoute><ProtectedRoute><Layout><MarketplacePost /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/marketplace/:id"    element={<CustomerRoute><Layout><MarketplaceDetail /></Layout></CustomerRoute>} />
        <Route path="/wishlist/:token" element={<Layout><SharedWishlist /></Layout>} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<CustomerRoute><Register /></CustomerRoute>} />

        {/* Protected — logged-in customers only */}
        <Route path="/checkout"            element={<CustomerRoute><ProtectedRoute><Layout><Checkout /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account"             element={<CustomerRoute><ProtectedRoute><Layout><AccountHome /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/profile"     element={<CustomerRoute><ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/orders"      element={<CustomerRoute><ProtectedRoute><Layout><Orders /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/orders/:id"  element={<CustomerRoute><ProtectedRoute><Layout><OrderDetail /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/wishlist"    element={<CustomerRoute><ProtectedRoute><Layout><Wishlist /></Layout></ProtectedRoute></CustomerRoute>} />
        <Route path="/account/ads"         element={<CustomerRoute><ProtectedRoute><Layout><MyAds /></Layout></ProtectedRoute></CustomerRoute>} />

        {/* Protected — admin only */}
        <Route path="/admin"                   element={<ProtectedRoute role="admin"><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/users"             element={<ProtectedRoute role="admin"><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/admins"            element={<ProtectedRoute role="admin"><AdminLayout><AdminAdmins /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/orders"            element={<ProtectedRoute role="admin"><AdminLayout><AdminOrders /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/products"          element={<ProtectedRoute role="admin"><AdminLayout><AdminProducts /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/reels"             element={<ProtectedRoute role="admin"><AdminLayout><AdminReels /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/marketplace"       element={<ProtectedRoute role="admin"><AdminLayout><AdminMarketplace /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/low-stock"         element={<ProtectedRoute role="admin"><AdminLayout><AdminLowStock /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/abandoned-carts"   element={<ProtectedRoute role="admin"><AdminLayout><AdminAbandonedCarts /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/shipping-estimate" element={<ProtectedRoute role="admin"><AdminLayout><AdminShippingEstimate /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/testimonials"      element={<ProtectedRoute role="admin"><AdminLayout><AdminTestimonials /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/promotions"        element={<ProtectedRoute role="admin"><AdminLayout><AdminPromotions /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/seo-tools"         element={<ProtectedRoute role="admin"><AdminLayout><AdminSeoTools /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/newsletter-campaigns" element={<ProtectedRoute role="admin"><AdminLayout><AdminNewsletterCampaigns /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/sales-banner"      element={<ProtectedRoute role="admin"><AdminLayout><AdminSalesBanner /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/whatsapp-notifications" element={<ProtectedRoute role="admin"><AdminLayout><AdminWhatsAppNotifications /></AdminLayout></ProtectedRoute>} />
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
        <Route path="/admin/bundles"          element={<ProtectedRoute role="admin"><AdminLayout><AdminBundles /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/reviews"          element={<ProtectedRoute role="admin"><AdminLayout><AdminReviews /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/activity"         element={<ProtectedRoute role="admin"><AdminLayout><AdminActivity /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/newsletter-popup" element={<ProtectedRoute role="admin"><AdminLayout><AdminNewsletterPopup /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/bank-transfer"    element={<ProtectedRoute role="admin"><AdminLayout><AdminBankTransfer /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/whish"            element={<ProtectedRoute role="admin"><AdminLayout><AdminWhish /></AdminLayout></ProtectedRoute>} />

        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
      </PageTransition>
      </Suspense>
      </AddedToCartProvider>
    </BrowserRouter>
  )
}
