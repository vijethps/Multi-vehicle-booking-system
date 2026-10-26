import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tripsApi } from '../../services/trips'
import { seatsApi } from '../../services/trips'
import { bookingsApi } from '../../services/bookings'
import { useAuth } from '../../context/AuthContext'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { ChevronLeft, Users } from 'lucide-react'
import clsx from 'clsx'

function SeatMap({ seats, selected, onToggle }) {
  // Group by row
  const rows = {}
  seats.forEach(s => {
    if (!rows[s.row_number]) rows[s.row_number] = []
    rows[s.row_number].push(s)
  })

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-4">
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded seat-btn seat-available inline-block" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-primary-600 inline-block" /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-gray-200 inline-block" /> Booked</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-yellow-100 inline-block" /> Held</span>
      </div>

      {/* Driver row */}
      <div className="flex justify-end mb-2">
        <span className="text-xs bg-gray-100 px-3 py-1 rounded text-gray-500">🚌 Driver</span>
      </div>

      {Object.entries(rows).map(([rowNum, rowSeats]) => (
        <div key={rowNum} className="flex items-center gap-1">
          <span className="w-5 text-xs text-gray-400 text-right mr-1">{rowNum}</span>
          {rowSeats.map(seat => {
            const isSelected = selected.includes(seat.id)
            const status = seat.seat_status
            const disabled = status === 'booked' || status === 'held'

            return (
              <button
                key={seat.id}
                disabled={disabled}
                onClick={() => !disabled && onToggle(seat)}
                title={`Seat ${seat.seat_number}${seat.extra_charge > 0 ? ` (+₹${seat.extra_charge})` : ''}`}
                className={clsx('seat-btn',
                  disabled && status === 'booked' ? 'seat-booked' :
                  disabled && status === 'held'   ? 'seat-held'   :
                  isSelected                       ? 'seat-selected' :
                  'seat-available'
                )}
              >
                {seat.seat_number}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function SeatSelection() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [selected, setSelected]   = useState([])  // seat objects
  const [holding, setHolding]     = useState(false)
  const [booking, setBooking]     = useState(false)
  const [quote, setQuote]         = useState(null)

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getById(id).then(r => r.data.data.trip),
  })

  const { data: seatData, isLoading: seatsLoading, refetch } = useQuery({
    queryKey: ['trip-seats', id],
    queryFn: () => tripsApi.getSeats(id).then(r => r.data.data.seats),
    refetchInterval: 30000, // refresh every 30s
  })

  useEffect(() => {
    if (selected.length === 0) { setQuote(null); return }
    bookingsApi.pricingQuote({
      booking_type: 'seat_booking',
      trip_id: id,
      seat_ids: selected.map(s => s.id),
    }).then(r => setQuote(r.data.data.pricing)).catch(() => {})
  }, [selected, id])

  const toggleSeat = (seat) => {
    setSelected(prev =>
      prev.find(s => s.id === seat.id)
        ? prev.filter(s => s.id !== seat.id)
        : [...prev, seat]
    )
  }

  const handleHoldAndBook = async () => {
    if (!user) { navigate('/login'); return }
    if (!selected.length) { toast.error('Select at least one seat'); return }
    setHolding(true)
    try {
      await seatsApi.holdSeats({ trip_id: id, seat_ids: selected.map(s => s.id) })
      const res = await bookingsApi.create({
        booking_type: 'seat_booking',
        trip_id: id,
        seat_ids: selected.map(s => s.id),
      })
      const bookingId = res.data.data.booking.id
      navigate(`/booking/payment?booking_id=${bookingId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete booking')
      refetch()
    } finally {
      setHolding(false)
    }
  }

  if (tripLoading || seatsLoading) return <MainLayout><LoadingOverlay /></MainLayout>

  return (
    <MainLayout>
      <div className="page-container section">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {trip?.origin} → {trip?.destination}
        </h1>
        <p className="text-gray-500 text-sm mb-6">{trip?.vehicle_name} · Select your seats below</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seat map */}
          <div className="lg:col-span-2 card p-6 overflow-x-auto">
            {seatData ? (
              <SeatMap seats={seatData} selected={selected.map(s => s.id)} onToggle={toggleSeat} />
            ) : (
              <p className="text-gray-400 text-sm">No seat data available</p>
            )}
          </div>

          {/* Summary */}
          <div className="card p-5 h-fit sticky top-24 space-y-4">
            <h3 className="font-semibold text-gray-900">Booking Summary</h3>

            {selected.length === 0 ? (
              <p className="text-sm text-gray-400">No seats selected yet</p>
            ) : (
              <>
                <div className="space-y-1">
                  {selected.map(seat => (
                    <div key={seat.id} className="flex justify-between text-sm text-gray-700">
                      <span>Seat {seat.seat_number} ({seat.seat_type})</span>
                      <span>₹{parseFloat(trip?.base_fare || 0) + parseFloat(seat.extra_charge || 0)}</span>
                    </div>
                  ))}
                </div>

                {quote && (
                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({quote.seat_count} seats)</span>
                      <span>₹{parseFloat(quote.subtotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (5%)</span>
                      <span>₹{parseFloat(quote.tax_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2">
                      <span>Total</span>
                      <span>₹{parseFloat(quote.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleHoldAndBook}
                  disabled={holding}
                  className="btn-primary btn-lg w-full"
                >
                  {holding ? 'Processing…' : `Book ${selected.length} Seat${selected.length > 1 ? 's' : ''}`}
                </button>
                <p className="text-xs text-center text-gray-400">
                  Seats are held for 15 minutes after selection
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
