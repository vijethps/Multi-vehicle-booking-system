import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../services/admin'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { format } from '../../lib/dateUtils'
import { Search, Eye, CheckCircle, RefreshCw } from 'lucide-react'

export default function AdminBookings() {
  const qc = useQueryClient()
  const [page, setPage]     = useState(1)
  const [filters, setFilters] = useState({ status: '', booking_type: '' })
  const [detail, setDetail]   = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', filters, page],
    queryFn: () => adminApi.getBookings({ ...filters, page, limit: 15 }).then(r => r.data),
  })

  const handleConfirm = async (id) => {
    try {
      await adminApi.confirmBooking(id)
      toast.success('Booking confirmed')
      qc.invalidateQueries(['admin-bookings'])
      setDetail(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleRefund = async (id) => {
    try {
      await adminApi.refundBooking(id)
      toast.success('Refund processed')
      qc.invalidateQueries(['admin-bookings'])
      setDetail(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500 text-sm">{data?.pagination?.total || 0} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input w-44" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {['pending_payment','confirmed','active','completed','cancelled','payment_failed'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select className="input w-44" value={filters.booking_type} onChange={e => setFilters(f => ({ ...f, booking_type: e.target.value }))}>
          <option value="">All types</option>
          {['vehicle_rental','seat_booking','full_vehicle_charter','goods_transport'].map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? <LoadingOverlay /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Booking #','Customer','Vehicle / Route','Type','Status','Payment','Amount','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data?.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.booking_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{b.first_name} {b.last_name}</p>
                        <p className="text-xs text-gray-400">{b.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{b.vehicle_name || `${b.origin || ''}→${b.destination || ''}`}</td>
                      <td className="px-4 py-3"><span className="badge-gray text-xs capitalize">{b.booking_type?.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={b.booking_status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={b.payment_status} /></td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{parseFloat(b.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetail(b)} className="btn-ghost btn-sm p-1.5">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={`Booking #${detail?.booking_number}`} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Customer', `${detail.first_name} ${detail.last_name} (${detail.email})`],
                ['Vehicle', detail.vehicle_name || 'Bus Trip'],
                ['Type', detail.booking_type?.replace(/_/g, ' ')],
                ['Created', format(new Date(detail.created_at), 'dd MMM yyyy, HH:mm')],
                ['Booking Status', detail.booking_status],
                ['Payment Status', detail.payment_status],
                ['Total', `₹${parseFloat(detail.total_amount).toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k}><span className="text-gray-400 text-xs">{k}</span><p className="font-medium">{v}</p></div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              {detail.booking_status === 'pending_approval' && (
                <button onClick={() => handleConfirm(detail.id)} className="btn-primary flex-1">
                  <CheckCircle className="w-4 h-4" /> Confirm
                </button>
              )}
              {detail.booking_status === 'cancelled' && detail.payment_status === 'success' && (
                <button onClick={() => handleRefund(detail.id)} className="btn-secondary flex-1">
                  <RefreshCw className="w-4 h-4" /> Process Refund
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
