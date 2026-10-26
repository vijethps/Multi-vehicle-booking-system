import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '../../services/bookings'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import { BookOpen, ArrowRight, Calendar } from 'lucide-react'
import { format } from '../../lib/dateUtils'
import clsx from 'clsx'

const STATUS_TABS = [
  { label: 'All',       value: '' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Pending',   value: 'pending_payment' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

export default function MyBookingsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings', status, page],
    queryFn: () => bookingsApi.getMyBookings({ status: status || undefined, page, limit: 10 }).then(r => r.data),
  })

  return (
    <MainLayout>
      <div className="page-container section">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

        {/* Status tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setStatus(tab.value); setPage(1) }}
              className={clsx('btn-sm rounded-full flex-shrink-0',
                status === tab.value ? 'btn-primary' : 'btn-secondary')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? <LoadingOverlay /> :
         !data?.data?.length ? (
          <EmptyState
            icon={BookOpen}
            title="No bookings found"
            description={status ? `No ${status.replace(/_/g, ' ')} bookings` : 'You have not made any bookings yet'}
            action={<Link to="/vehicles" className="btn-primary">Browse Vehicles</Link>}
          />
        ) : (
          <>
            <div className="space-y-3">
              {data.data.map(b => (
                <Link
                  key={b.id}
                  to={`/my-bookings/${b.id}`}
                  className="card hover:shadow-card-hover transition-shadow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {b.vehicle_name || `${b.origin || '?'} → ${b.destination || '?'}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          #{b.booking_number} · {b.booking_type?.replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {b.pickup_datetime
                            ? format(new Date(b.pickup_datetime), 'dd MMM yyyy, HH:mm')
                            : b.departure_time
                            ? format(new Date(b.departure_time), 'dd MMM yyyy, HH:mm')
                            : format(new Date(b.created_at), 'dd MMM yyyy')}
                        </div>
                        {b.seats?.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">Seats: {b.seats.map(s => s.seat_number).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                    <StatusBadge status={b.booking_status} />
                    <span className="font-bold text-gray-900">₹{parseFloat(b.total_amount).toLocaleString()}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
                  </div>
                </Link>
              ))}
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </MainLayout>
  )
}
