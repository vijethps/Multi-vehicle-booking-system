import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import {
  Bus, User, LogOut, LayoutDashboard, Menu, X,
  ChevronDown, Bell, Package, Settings
} from 'lucide-react'
import clsx from 'clsx'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/users/notifications').then(r => r.data.data),
    enabled: !!user,
    refetchInterval: 60000,
  })
  const unreadCount = notifData?.unread_count || 0

  const handleLogout = () => { logout(); navigate('/') }

  const navLinks = [
    { to: '/vehicles', label: 'Vehicles'    },
    { to: '/buses',    label: 'Bus Booking' },
    { to: '/trucks',   label: 'Freight'     },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-700">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            TransportHub
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to}
                className={({ isActive }) => clsx(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/notifications" className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 text-xs font-bold">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </span>
                    </div>
                    <span className="hidden sm:block">{user.first_name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                        <div className="px-4 py-2 border-b">
                          <p className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                        </div>
                        {isAdmin && (
                          <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                            <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                          </Link>
                        )}
                        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                          <User className="w-4 h-4" /> My Dashboard
                        </Link>
                        <Link to="/my-bookings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                          <Package className="w-4 h-4" /> My Bookings
                        </Link>
                        <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                          <Settings className="w-4 h-4" /> Profile & Settings
                        </Link>
                        <hr className="my-1" />
                        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"    className="btn-secondary btn-sm">Login</Link>
                <Link to="/register" className="btn-primary btn-sm">Sign Up</Link>
              </div>
            )}
            <button className="md:hidden btn-ghost p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map(link => (
            <NavLink key={link.to} to={link.to}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => setMenuOpen(false)}>
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
