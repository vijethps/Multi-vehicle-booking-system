import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { vehiclesApi } from '../../services/vehicles'
import { bookingsApi } from '../../services/bookings'
import { useAuth } from '../../context/AuthContext'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Users, Fuel, Zap, Car, Star, MapPin,
  Calendar, Clock, ChevronLeft, CheckCircle
} from 'lucide-react'
import { format } from '../../lib/dateUtils'

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState({
    pickup_datetime: '',
    return_datetime: '',
    pickup_location: '',
    dropoff_location: '',
    driver_required: false,
  })
  const [quote, setQuote]     = useState(null)
  const [quoting, setQuoting] = useState(false)
  const [booking, setBooking] = useState(false)
  const [imgIdx, setImgIdx]   = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.getById(id).then(r => r.data.data.vehicle),
  })
  const vehicle = data

  const getQuote = async () => {
    if (!form.pickup_datetime || !form.return_datetime) return toast.error('Select pickup and return date/time')
    setQuoting(true)
    try {
      const res = await bookingsApi.pricingQuote({
        booking_type: 'vehicle_rental',
        vehicle_id: id,
        pickup_datetime: form.pickup_datetime,
        return_datetime: form.return_datetime,
        driver_required: form.driver_required,
      })
      setQuote(res.data.data.pricing)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not calculate price')
    } finally {
      setQuoting(false)
    }
  }

  const handleBook = async () => {
    if (!user) { navigate('/login'); return }
    if (!quote) { toast.error('Get a quote first'); return }
    setBooking(true)
    try {
      const res = await bookingsApi.create({
        booking_type: vehicle.supports_goods ? 'goods_transport' : 'vehicle_rental',
        vehicle_id: id,
        pickup_datetime: form.pickup_datetime,
        return_datetime: form.return_datetime,
        pickup_location: form.pickup_location,
        dropoff_location: form.dropoff_location,
        driver_required: form.driver_required,
      })
      const bookingId = res.data.data.booking.id
      navigate(`/booking/payment?booking_id=${bookingId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed')
    } finally {
      setBooking(false)
    }
  }

  if (isLoading) return <MainLayout><LoadingOverlay /></MainLayout>
  if (!vehicle) return <MainLayout><div className="page-container py-20 text-center text-gray-500">Vehicle not found</div></MainLayout>

  const images = vehicle.images || []
  const amenities = vehicle.amenities || []

  return (
    <MainLayout>
      <div className="page-container section">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: images + details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image gallery */}
            <div className="card overflow-hidden">
              <div className="h-72 bg-gray-100">
                {images.length > 0 ? (
                  <img src={images[imgIdx].url} alt={vehicle.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car className="w-24 h-24 text-gray-300" />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ring-2 ${i === imgIdx ? 'ring-primary-500' : 'ring-transparent'}`}>
                      <img src={img.url} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{vehicle.name}</h1>
                  <p className="text-gray-500">{vehicle.category_name} · {vehicle.type_name || vehicle.model}</p>
                </div>
                {vehicle.rating > 0 && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold">{parseFloat(vehicle.rating).toFixed(1)}</span>
                    <span className="text-gray-400 text-sm">({vehicle.total_reviews})</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {vehicle.passenger_capacity && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-primary-500" />
                    <span>{vehicle.passenger_capacity} seats</span>
                  </div>
                )}
                {vehicle.fuel_type && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Fuel className="w-4 h-4 text-primary-500" />
                    <span className="capitalize">{vehicle.fuel_type}</span>
                  </div>
                )}
                {vehicle.ac && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Zap className="w-4 h-4 text-primary-500" />
                    <span>Air conditioned</span>
                  </div>
                )}
                {vehicle.transmission && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 capitalize">
                    <Car className="w-4 h-4 text-primary-500" />
                    <span>{vehicle.transmission}</span>
                  </div>
                )}
              </div>

              {vehicle.description && (
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{vehicle.description}</p>
              )}

              {amenities.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a, i) => (
                      <span key={i} className="badge-blue text-xs">{a.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: booking form */}
          <div className="space-y-4">
            <div className="card p-5 sticky top-24">
              <div className="mb-4">
                <span className="text-3xl font-bold text-primary-700">
                  ₹{parseFloat(vehicle.base_price).toLocaleString()}
                </span>
                <span className="text-gray-400 text-sm ml-1">
                  {vehicle.pricing_method === 'daily' ? '/day'
                    : vehicle.pricing_method === 'hourly' ? '/hour'
                    : vehicle.pricing_method === 'per_km' ? '/km' : ''}
                </span>
              </div>
              {vehicle.security_deposit > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  Security deposit: ₹{parseFloat(vehicle.security_deposit).toLocaleString()} (refundable)
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <label className="label"><Calendar className="w-3.5 h-3.5 inline mr-1" />Pickup date & time</label>
                  <input type="datetime-local" className="input"
                    value={form.pickup_datetime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={e => setForm(f => ({ ...f, pickup_datetime: e.target.value }))} />
                </div>
                <div>
                  <label className="label"><Calendar className="w-3.5 h-3.5 inline mr-1" />Return date & time</label>
                  <input type="datetime-local" className="input"
                    value={form.return_datetime}
                    min={form.pickup_datetime || new Date().toISOString().slice(0, 16)}
                    onChange={e => setForm(f => ({ ...f, return_datetime: e.target.value }))} />
                </div>
                <div>
                  <label className="label"><MapPin className="w-3.5 h-3.5 inline mr-1" />Pickup location</label>
                  <input type="text" className="input" placeholder="e.g. Mumbai Airport"
                    value={form.pickup_location}
                    onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value }))} />
                </div>
                {vehicle.driver_available && (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="checkbox" className="rounded text-primary-600"
                      checked={form.driver_required}
                      onChange={e => setForm(f => ({ ...f, driver_required: e.target.checked }))} />
                    Add driver (₹{parseFloat(vehicle.driver_charge || 0).toLocaleString()}/day)
                  </label>
                )}

                <button onClick={getQuote} disabled={quoting} className="btn-secondary w-full">
                  {quoting ? 'Calculating…' : 'Get Price Quote'}
                </button>

                {quote && (
                  <div className="bg-primary-50 rounded-xl p-4 text-sm space-y-1">
                    <div className="font-semibold text-gray-800 mb-2">Price Breakdown</div>
                    {quote.breakdown?.map((b, i) => (
                      <div key={i} className="flex justify-between text-gray-600">
                        <span>{b.label}</span>
                        <span>₹{parseFloat(b.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (5%)</span>
                      <span>₹{parseFloat(quote.tax_amount).toLocaleString()}</span>
                    </div>
                    {quote.security_deposit > 0 && (
                      <div className="flex justify-between text-gray-500 text-xs">
                        <span>Security deposit (refundable)</span>
                        <span>₹{parseFloat(quote.security_deposit).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2 mt-1">
                      <span>Total</span>
                      <span>₹{parseFloat(quote.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBook}
                  disabled={!quote || booking || !vehicle.is_available}
                  className="btn-primary btn-lg w-full"
                >
                  {booking ? 'Processing…' : !vehicle.is_available ? 'Currently Unavailable' : 'Book Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
