import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/admin'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import { Car, BookOpen, TrendingUp, Users, Bus, CheckCircle, XCircle, Clock } from 'lucide-react'

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon className="w-6 h-6" /></div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then(r => r.data.data),
  })

  if (isLoading) return <AdminLayout><LoadingOverlay /></AdminLayout>

  const { vehicles, bookings, revenue, trips, users } = data || {}

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Vehicles"   value={vehicles?.total_active || 0}   icon={Car}        color="bg-blue-50 text-blue-600"   />
        <StatCard label="Total Bookings"    value={bookings?.total || 0}           icon={BookOpen}   color="bg-purple-50 text-purple-600" />
        <StatCard label="Confirmed Revenue" value={`₹${parseFloat(revenue?.confirmed_revenue || 0).toLocaleString()}`} icon={TrendingUp} color="bg-green-50 text-green-600" />
        <StatCard label="Active Users"      value={users?.customers || 0}          icon={Users}      color="bg-amber-50 text-amber-600"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking breakdown */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Booking Overview</h2>
          <div className="space-y-3">
            {[
              { label: 'Confirmed',       value: bookings?.confirmed || 0,       color: 'bg-green-500'  },
              { label: 'Pending Payment', value: bookings?.pending_payment || 0, color: 'bg-yellow-500' },
              { label: 'Active',          value: bookings?.active || 0,          color: 'bg-blue-500'   },
              { label: 'Completed',       value: bookings?.completed || 0,       color: 'bg-gray-400'   },
              { label: 'Cancelled',       value: bookings?.cancelled || 0,       color: 'bg-red-500'    },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="flex-1 text-sm text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue Summary</h2>
          <div className="space-y-4">
            {[
              { label: 'Last 30 days',     value: revenue?.last_30_days || 0,        note: '' },
              { label: 'Total earned',     value: revenue?.total_revenue || 0,        note: 'Completed bookings' },
              { label: 'Pending refunds',  value: revenue?.total_refunds || 0,        note: 'Cancellations' },
            ].map(({ label, value, note }) => (
              <div key={label} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  {note && <p className="text-xs text-gray-400">{note}</p>}
                </div>
                <span className="font-bold text-gray-900">₹{parseFloat(value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trips */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Bus Trip Status</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Scheduled', value: trips?.scheduled || 0, color: 'text-blue-600' },
              { label: 'Today',     value: trips?.today || 0,     color: 'text-amber-600' },
              { label: 'Boarding',  value: trips?.boarding || 0,  color: 'text-green-600' },
              { label: 'In Transit',value: trips?.in_transit || 0,color: 'text-purple-600'},
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Last 7 days */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
              <span className="text-sm text-blue-700 font-medium">New bookings (7 days)</span>
              <span className="font-bold text-blue-900">{bookings?.last_7_days || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-700 font-medium">Available vehicles</span>
              <span className="font-bold text-gray-900">{vehicles?.available || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-700 font-medium">Inactive vehicles</span>
              <span className="font-bold text-gray-900">{vehicles?.total_inactive || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
