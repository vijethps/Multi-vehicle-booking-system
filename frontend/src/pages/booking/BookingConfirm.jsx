import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '../../services/bookings'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import { CheckCircle, Download, ArrowRight } from 'lucide-react'
import { format } from '../../lib/dateUtils'

export default function BookingConfirm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookingId = searchParams.get('booking_id')

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId).then(r => r.data.data.booking),
    enabled: !!bookingId,
  })

  if (isLoading) return <MainLayout><LoadingOverlay /></MainLayout>

  return (
    <MainLayout>
      <div className="page-container section max-w-xl mx-auto text-center">
        <div className="card p-10">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 mb-6">Your booking has been confirmed and payment received.</p>

          {booking && (
            <div className="bg-gray-50 rounded-xl p-5 text-left text-sm mb-6 space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Booking Number</span><span className="font-semibold">{booking.booking_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-semibold">{booking.vehicle_name || 'Bus Trip'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{booking.booking_type?.replace(/_/g, ' ')}</span></div>
              {booking.pickup_datetime && (
                <div className="flex justify-between"><span className="text-gray-500">Pickup</span><span>{format(new Date(booking.pickup_datetime), 'dd MMM yyyy, HH:mm')}</span></div>
              )}
              {booking.seats?.length > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Seats</span><span>{booking.seats.map(s => s.seat_number).join(', ')}</span></div>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
                <span>Amount Paid</span>
                <span>₹{parseFloat(booking.total_amount).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/my-bookings" className="btn-primary">
              View My Bookings <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/" className="btn-secondary">Back to Home</Link>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
