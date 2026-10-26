import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '../../services/bookings'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { ChevronLeft, MapPin, Calendar, Users, CreditCard, AlertTriangle, Receipt } from 'lucide-react'
import { format } from '../../lib/dateUtils'

export default function BookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [cancelModal, setCancelModal] = useState(false)
  const [reason, setReason]           = useState('')
  const [cancelling, setCancelling]   = useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getById(id).then(r => r.data.data.booking),
  })

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await bookingsApi.cancel(id, reason)
      toast.success('Booking cancelled')
      queryClient.invalidateQueries(['booking', id])
      queryClient.invalidateQueries(['my-bookings'])
      setCancelModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed')
    } finally {
      setCancelling(false)
    }
  }

  if (isLoading) return <MainLayout><LoadingOverlay /></MainLayout>
  if (!booking)  return <MainLayout><div className="page-container py-20 text-center">Booking not found</div></MainLayout>

  const canCancel = ['pending_payment', 'pending_approval', 'confirmed'].includes(booking.booking_status)

  return (
    <MainLayout>
      <div className="page-container section max-w-2xl">
        <button onClick={() => navigate('/my-bookings')} className="flex items-center gap-2 text-gray-500 mb-4 text-sm hover:text-gray-800">
          <ChevronLeft className="w-4 h-4" /> My Bookings
        </button>

        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Booking #{booking.booking_number}</h1>
            <p className="text-gray-500 text-sm capitalize mt-0.5">{booking.booking_type?.replace(/_/g, ' ')}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.booking_status} className="text-sm" />
            <StatusBadge status={booking.payment_status} className="text-sm" />
          </div>
        </div>

        <div className="space-y-4">
          {/* Vehicle / Trip info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">
              {booking.vehicle_name ? 'Vehicle Details' : 'Trip Details'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {booking.vehicle_name && <div><span className="text-gray-400">Vehicle</span><p className="font-medium">{booking.vehicle_name} {booking.model}</p></div>}
              {booking.category_name && <div><span className="text-gray-400">Category</span><p className="font-medium">{booking.category_name}</p></div>}
              {booking.origin && <div><span className="text-gray-400">Route</span><p className="font-medium">{booking.origin} → {booking.destination}</p></div>}
              {booking.pickup_datetime && <div><span className="text-gray-400">Pickup</span><p className="font-medium">{format(new Date(booking.pickup_datetime), 'dd MMM yyyy, HH:mm')}</p></div>}
              {booking.return_datetime && <div><span className="text-gray-400">Return</span><p className="font-medium">{format(new Date(booking.return_datetime), 'dd MMM yyyy, HH:mm')}</p></div>}
              {booking.departure_time && <div><span className="text-gray-400">Departure</span><p className="font-medium">{format(new Date(booking.departure_time), 'dd MMM yyyy, HH:mm')}</p></div>}
              {booking.pickup_location && <div><span className="text-gray-400">Pickup Location</span><p className="font-medium">{booking.pickup_location}</p></div>}
            </div>
          </div>

          {/* Seats */}
          {booking.seats?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Seats</h3>
              <div className="grid grid-cols-2 gap-2">
                {booking.seats.map((seat, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-semibold">Seat {seat.seat_number} <span className="text-gray-400 font-normal capitalize">({seat.seat_type})</span></p>
                    {seat.passenger_name && <p className="text-gray-500">{seat.passenger_name}</p>}
                    <p className="text-primary-700 font-medium">₹{parseFloat(seat.seat_price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{parseFloat(booking.subtotal).toLocaleString()}</span></div>
              {parseFloat(booking.driver_charge) > 0 && <div className="flex justify-between text-gray-600"><span>Driver</span><span>₹{parseFloat(booking.driver_charge).toLocaleString()}</span></div>}
              {parseFloat(booking.discount_amount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{parseFloat(booking.discount_amount).toLocaleString()}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Tax</span><span>₹{parseFloat(booking.tax_amount).toLocaleString()}</span></div>
              {parseFloat(booking.security_deposit) > 0 && <div className="flex justify-between text-gray-500 text-xs"><span>Security deposit</span><span>₹{parseFloat(booking.security_deposit).toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2"><span>Total</span><span>₹{parseFloat(booking.total_amount).toLocaleString()}</span></div>
              {booking.refund_amount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Refund amount</span><span>₹{parseFloat(booking.refund_amount).toLocaleString()}</span></div>}
            </div>
          </div>

          {/* Actions */}
          <button onClick={() => navigate(`/my-bookings/${id}/receipt`)} className="btn-secondary w-full">
            <Receipt className="w-4 h-4" /> View / Print Receipt
          </button>

          {canCancel && (
            <button onClick={() => setCancelModal(true)} className="btn-danger w-full">
              <AlertTriangle className="w-4 h-4" /> Cancel Booking
            </button>
          )}

          {booking.booking_status === 'pending_payment' && (
            <button onClick={() => navigate(`/booking/payment?booking_id=${id}`)} className="btn-primary w-full">
              <CreditCard className="w-4 h-4" /> Complete Payment
            </button>
          )}
        </div>
      </div>

      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Booking">
        <p className="text-gray-600 text-sm mb-4">Are you sure you want to cancel this booking? This action cannot be undone.</p>
        <div className="mb-4">
          <label className="label">Reason (optional)</label>
          <textarea className="input resize-none" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Tell us why you're cancelling…" />
        </div>
        <div className="flex gap-3">
          <button onClick={() => setCancelModal(false)} className="btn-secondary flex-1">Keep Booking</button>
          <button onClick={handleCancel} disabled={cancelling} className="btn-danger flex-1">
            {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
          </button>
        </div>
      </Modal>
    </MainLayout>
  )
}
