import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './store/auth'
import { PageLoader } from './components/ui'
import Layout from './components/Layout'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyOtp from './pages/VerifyOtp'
import ForgotPassword from './pages/ForgotPassword'

import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import ListingDetails from './pages/ListingDetails'
import CreateListing from './pages/CreateListing'
import MyListings from './pages/MyListings'
import IncomingRequests from './pages/IncomingRequests'
import CreateRequest from './pages/CreateRequest'
import MyRequests from './pages/MyRequests'
import Deals from './pages/Deals'
import WalletPage from './pages/WalletPage'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCategories from './pages/admin/AdminCategories'
import AdminListings from './pages/admin/AdminListings'
import AdminDeals from './pages/admin/AdminDeals'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminAudit from './pages/admin/AdminAudit'

function Protected({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { isAuthed, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!isAuthed) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthed, loading } = useAuth()
  if (loading) return <PageLoader />
  if (isAuthed) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Authenticated shell */}
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/market" element={<Marketplace />} />
        <Route path="/listings/:id" element={<ListingDetails />} />
        <Route path="/listings/new" element={<CreateListing />} />
        <Route path="/listings/:id/edit" element={<CreateListing />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/incoming" element={<IncomingRequests />} />
        <Route path="/requests/new" element={<CreateRequest />} />
        <Route path="/my-requests" element={<MyRequests />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<Protected adminOnly><AdminLayout /></Protected>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="listings" element={<AdminListings />} />
        <Route path="deals" element={<AdminDeals />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="audit" element={<AdminAudit />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
