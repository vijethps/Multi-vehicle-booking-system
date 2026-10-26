import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '../../services/bookings'
import { LoadingOverlay } from '../../components/ui/Spinner'
import { format } from '../../lib/dateUtils'
import { Printer, ArrowLeft, Bus, CheckCircle } from 'lucide-react'

export default function BookingReceipt() {
  const { id } = useParams()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getById(id).then(r => r.data.data.booking),
  })

  if (isLoading) return <LoadingOverlay />
  if (!booking)  return <div className="p-8 text-center text-gray-500">Booking not found</div>

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Print/Back controls — hidden when printing */}
      <div className="print:hidden bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link to={`/my-bookings/${id}`} className="btn-secondary btn-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <button onClick={() => window.print()} className="btn-primary btn-sm">
          <Printer className="w-4 h-4" /> Print Receipt
        </button>
      </div>

      {/* Receipt */}
      <div className="max-w-2xl mx-auto p-6 print:p-0 print:max-w-full">
        <div className="bg-white rounded-2xl shadow-card print:shadow-none p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-dashed">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                <Bus className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TransportHub</h1>
                <p className="text-sm text-gray-400">Booking Receipt</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end text-green-600 mb-1">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold capitalize">{booking.booking_status}</span>
              </div>
              <p className="text-xs text-gray-400">Payment: <span className="capitalize font-medium">{booking.payment_status}</span></p>
            </div>
          </div>

          {/* Booking number */}
          <div className="text-center mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Booking Number</p>
            <p className="text-3xl font-bold text-primary-700 font-mono">{booking.booking_number}</p>
            <p className="text-xs text-gray-400 mt-1">
              Issued: {format(new Date(booking.created_at), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>

          {/* Trip details */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Vehicle</p>
              <p className="font-semibold text-gray-900">{booking.vehicle_name || 'Bus Trip'}</p>
              {booking.model && <p className="text-xs text-gray-500">{booking.model}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Category</p>
              <p className="font-semibold text-gray-900">{booking.category_name || '—'}</p>
              <p className="text-xs text-gray-500 capitalize">{booking.booking_type?.replace(/_/g, ' ')}</p>
            </div>
            {booking.origin && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Route</p>
                <p className="font-semibold text-gray-900">{booking.origin} → {booking.destination}</p>
              </div>
            )}
            {booking.pickup_datetime && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Pickup</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(booking.pickup_datetime), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            )}
            {booking.return_datetime && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Return</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(booking.return_datetime), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            )}
            {booking.departure_time && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Departure</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(booking.departure_time), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            )}
            {booking.pickup_location && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase mb-1">Pickup Location</p>
                <p className="font-semibold text-gray-900">{booking.pickup_location}</p>
              </div>
            )}
          </div>

          {/* Seats */}
          {booking.seats?.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-400 uppercase mb-2">Seats</p>
              <div className="flex flex-wrap gap-2">
                {booking.seats.map((seat, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-semibold">
                    {seat.seat_number}
                    <span className="text-primary-400 font-normal text-xs capitalize">({seat.seat_type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price breakdown */}
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs text-gray-400 uppercase mb-3">Price Breakdown</p>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{parseFloat(booking.subtotal).toLocaleString()}</span>
            </div>
            {parseFloat(booking.driver_charge) > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Driver charge</span>
                <span>₹{parseFloat(booking.driver_charge).toLocaleString()}</span>
              </div>
            )}
            {parseFloat(booking.discount_amount) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-₹{parseFloat(booking.discount_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (GST 5%)</span>
              <span>₹{parseFloat(booking.tax_amount).toLocaleString()}</span>
            </div>
            {parseFloat(booking.security_deposit) > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Security deposit (refundable)</span>
                <span>₹{parseFloat(booking.security_deposit).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-lg border-t-2 border-dashed pt-3 mt-2">
              <span>Total Paid</span>
              <span>₹{parseFloat(booking.total_amount).toLocaleString()}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-xs text-gray-400">
            <p>Thank you for choosing TransportHub!</p>
            <p className="mt-1">For support: support@transporthub.in | +91 98000 00001</p>
            <p className="mt-1 font-mono text-gray-300">{booking.id}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
