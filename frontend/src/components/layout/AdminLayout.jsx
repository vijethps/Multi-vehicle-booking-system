import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Car, Route, CalendarDays,
  BookOpen, CreditCard, Users, BarChart3,
  Bus, LogOut, Menu, X, Tag, Layers, FolderTree
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const navItems = [
  { to: '/admin',             label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { to: '/admin/vehicles',    label: 'Vehicles',     icon: Car },
  { to: '/admin/routes',      label: 'Routes',       icon: Route },
  { to: '/admin/trips',       label: 'Trips',        icon: Bus },
  { to: '/admin/bookings',    label: 'Bookings',     icon: BookOpen },
  { to: '/admin/payments',    label: 'Payments',     icon: CreditCard },
  { to: '/admin/users',       label: 'Users',        icon: Users },
  { to: '/admin/reports',     label: 'Reports',      icon: BarChart3 },
  { to: '/admin/pricing',     label: 'Pricing',      icon: Tag },
  { to: '/admin/categories',  label: 'Categories',   icon: FolderTree },
  { to: '/admin/layouts',     label: 'Seat Layouts', icon: Layers },
]

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Bus className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">TransportHub</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-900 flex items-center justify-center">
            <span className="text-primary-300 text-xs font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-gray-900 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 bg-gray-900 flex flex-col">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b h-14 flex items-center justify-between px-6 flex-shrink-0">
          <button
            className="lg:hidden btn-ghost p-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Welcome back,</span>
            <span className="font-semibold text-gray-900">{user?.first_name}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
