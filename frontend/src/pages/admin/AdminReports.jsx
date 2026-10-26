import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/admin'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import { BarChart3, TrendingUp, Car } from 'lucide-react'

export default function AdminReports() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo)
  const [dateTo,   setDateTo]   = useState(today)

  const { data: revenueData, isLoading: revLoading, refetch } = useQuery({
    queryKey: ['revenue', dateFrom, dateTo],
    queryFn: () => adminApi.getRevenue({ date_from: dateFrom, date_to: dateTo }).then(r => r.data.data),
  })

  const { data: fleetData, isLoading: fleetLoading } = useQuery({
    queryKey: ['fleet', dateFrom, dateTo],
    queryFn: () => adminApi.getFleet({ date_from: dateFrom, date_to: dateTo }).then(r => r.data.data.vehicles),
  })

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Date filter */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button onClick={() => refetch()} className="btn-primary">Apply</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by category */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" /> Revenue by Category
          </h2>
          {revLoading ? <LoadingOverlay /> : (
            <div className="space-y-3">
              {revenueData?.by_category?.map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{row.category_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 capitalize">{row.booking_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{parseFloat(row.revenue).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{row.booking_count} bookings</p>
                  </div>
                </div>
              ))}
              {!revenueData?.by_category?.length && <p className="text-gray-400 text-sm text-center py-4">No data for this period</p>}
            </div>
          )}
        </div>

        {/* Revenue by date */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" /> Daily Revenue
          </h2>
          {revLoading ? <LoadingOverlay /> : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {revenueData?.by_date?.map((row, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{new Date(row.period).toLocaleDateString()}</span>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">₹{parseFloat(row.revenue).toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-2">({row.booking_count})</span>
                  </div>
                </div>
              ))}
              {!revenueData?.by_date?.length && <p className="text-gray-400 text-sm text-center py-4">No data</p>}
            </div>
          )}
        </div>

        {/* Fleet utilization */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-primary-600" /> Fleet Utilization
          </h2>
          {fleetLoading ? <LoadingOverlay /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">{['Vehicle','Category','Bookings','Completed','Cancelled','Revenue'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fleetData?.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{v.name}</td>
                      <td className="py-3 px-3 text-gray-500">{v.category_name}</td>
                      <td className="py-3 px-3">{v.total_bookings}</td>
                      <td className="py-3 px-3 text-green-600">{v.completed_bookings}</td>
                      <td className="py-3 px-3 text-red-500">{v.cancelled_bookings}</td>
                      <td className="py-3 px-3 font-bold text-primary-700">₹{parseFloat(v.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!fleetData?.length && <p className="text-gray-400 text-sm text-center py-4">No fleet data</p>}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
