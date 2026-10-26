import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { BookOpen, Clock, CheckCircle, XCircle, TrendingUp, ArrowRight } from 'lucide-react'
import { bookingsApi } from '../../services/bookings'
import { format } from '../../lib/dateUtils'

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['booking-summary'],
    queryFn: () => api.get('/users/booking-summary').then(r => r.data.data.summary),
  })

  const { data: recent } = useQuery({
    queryKey: ['my-bookings', 'recent'],
    queryFn: () => bookingsApi.getMyBookings({ limit: 5 }).then(r => r.data.data),
  })

  const stats = [
    { label: 'Total Bookings',    value: summary?.total_bookings || 0,  icon: BookOpen,      color: 'bg-blue-50 text-blue-600'   },
    { label: 'Upcoming',          value: summary?.upcoming || 0,         icon: Clock,         color: 'bg-yellow-50 text-yellow-600'},
    { label: 'Completed',         value: summary?.completed || 0,        icon: CheckCircle,   color: 'bg-green-50 text-green-600'  },
    { label: 'Total Spent',       value: `₹${parseFloat(summary?.total_spent || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <MainLayout>
      <div className="page-container section">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Hello, {user?.first_name} 👋</h1>
          <p className="text-gray-500 mt-1">Here's your travel summary</p>
        </div>

        {sumLoading ? <LoadingOverlay /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {stats.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent bookings */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
                <Link to="/my-bookings" className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {!recent?.length ? (
                <p className="text-gray-400 text-sm text-center py-6">No bookings yet. <Link to="/vehicles" className="text-primary-600">Book now</Link></p>
              ) : (
                <div className="space-y-3">
                  {recent.map(b => (
                    <Link key={b.id} to={`/my-bookings/${b.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{b.vehicle_name || `${b.origin} → ${b.destination}`}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {b.booking_number} · {format(new Date(b.created_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={b.booking_status} />
                        <span className="font-semibold text-sm text-gray-700">₹{parseFloat(b.total_amount).toLocaleString()}</span>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
