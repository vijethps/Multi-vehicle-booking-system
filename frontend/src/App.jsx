import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PageSpinner } from './components/ui/Spinner'

// Pages
import HomePage            from './pages/HomePage'
import LoginPage           from './pages/auth/LoginPage'
import RegisterPage        from './pages/auth/RegisterPage'
import VehiclesPage        from './pages/vehicles/VehiclesPage'
import VehicleDetail       from './pages/vehicles/VehicleDetail'
import BusesPage           from './pages/buses/BusesPage'
import TripDetail          from './pages/buses/TripDetail'
import SeatSelection       from './pages/buses/SeatSelection'
import TrucksPage          from './pages/trucks/TrucksPage'
import BookingCheckout     from './pages/booking/BookingCheckout'
import BookingConfirm      from './pages/booking/BookingConfirm'
import PaymentPage         from './pages/booking/PaymentPage'
import DashboardPage       from './pages/dashboard/DashboardPage'
import MyBookingsPage      from './pages/dashboard/MyBookingsPage'
import BookingDetail       from './pages/dashboard/BookingDetail'
import BookingReceipt      from './pages/dashboard/BookingReceipt'
import ProfilePage         from './pages/dashboard/ProfilePage'
import NotificationsPage   from './pages/dashboard/NotificationsPage'

// Admin pages
import AdminDashboard      from './pages/admin/AdminDashboard'
import AdminVehicles       from './pages/admin/AdminVehicles'
import AdminTrips          from './pages/admin/AdminTrips'
import AdminBookings       from './pages/admin/AdminBookings'
import AdminUsers          from './pages/admin/AdminUsers'
import AdminReports        from './pages/admin/AdminReports'
import AdminRoutes         from './pages/admin/AdminRoutes'
import AdminPricing        from './pages/admin/AdminPricing'
import AdminCategories     from './pages/admin/AdminCategories'
import AdminLayouts        from './pages/admin/AdminLayouts'

// Route guards
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, isFleetManager } = useAuth()
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin && !isFleetManager) return <Navigate to="/" replace />
  return children
}

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"              element={<HomePage />} />
      <Route path="/vehicles"      element={<VehiclesPage />} />
      <Route path="/vehicles/:id"  element={<VehicleDetail />} />
      <Route path="/buses"         element={<BusesPage />} />
      <Route path="/buses/:id"     element={<TripDetail />} />
      <Route path="/buses/:id/seats" element={<SeatSelection />} />
      <Route path="/trucks"        element={<TrucksPage />} />

      {/* Auth */}
      <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* Protected customer */}
      <Route path="/booking/checkout"       element={<ProtectedRoute><BookingCheckout /></ProtectedRoute>} />
      <Route path="/booking/payment"        element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
      <Route path="/booking/confirm"        element={<ProtectedRoute><BookingConfirm /></ProtectedRoute>} />
      <Route path="/dashboard"              element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/my-bookings"            element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
      <Route path="/my-bookings/:id"        element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
      <Route path="/my-bookings/:id/receipt" element={<ProtectedRoute><BookingReceipt /></ProtectedRoute>} />
      <Route path="/profile"                element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/notifications"          element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin"              element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/vehicles"     element={<AdminRoute><AdminVehicles /></AdminRoute>} />
      <Route path="/admin/categories"   element={<AdminRoute><AdminCategories /></AdminRoute>} />
      <Route path="/admin/routes"       element={<AdminRoute><AdminRoutes /></AdminRoute>} />
      <Route path="/admin/trips"        element={<AdminRoute><AdminTrips /></AdminRoute>} />
      <Route path="/admin/bookings"     element={<AdminRoute><AdminBookings /></AdminRoute>} />
      <Route path="/admin/users"        element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/reports"      element={<AdminRoute><AdminReports /></AdminRoute>} />
      <Route path="/admin/pricing"      element={<AdminRoute><AdminPricing /></AdminRoute>} />
      <Route path="/admin/layouts"      element={<AdminRoute><AdminLayouts /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
