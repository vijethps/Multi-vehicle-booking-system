import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tripsApi } from '../../services/trips'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import { format } from '../../lib/dateUtils'
import { Bus, MapPin, Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react'

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getById(id).then(r => r.data.data.trip),
  })

  if (isLoading) return <MainLayout><LoadingOverlay /></MainLayout>
  if (!trip) return <MainLayout><div className="page-container py-20 text-center">Trip not found</div></MainLayout>

  const avail = parseInt(trip.total_seats) - parseInt(trip.booked_seats)

  return (
    <MainLayout>
      <div className="page-container section max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to search
        </button>

        <div className="card p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{trip.origin} → {trip.destination}</h1>
              <p className="text-gray-500 text-sm">{trip.vehicle_name} · {trip.category_name}</p>
            </div>
            <span className={`badge ${trip.status === 'scheduled' ? 'badge-blue' : 'badge-gray'} capitalize`}>{trip.status}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Departure</p>
              <p className="font-bold text-gray-900">{format(new Date(trip.departure_time), 'HH:mm')}</p>
              <p className="text-xs text-gray-500">{format(new Date(trip.departure_time), 'dd MMM')}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Arrival</p>
              <p className="font-bold text-gray-900">{format(new Date(trip.arrival_time), 'HH:mm')}</p>
              <p className="text-xs text-gray-500">{format(new Date(trip.arrival_time), 'dd MMM')}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Available Seats</p>
              <p className="font-bold text-gray-900">{avail}</p>
              <p className="text-xs text-gray-500">of {trip.total_seats}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Base Fare</p>
              <p className="font-bold text-primary-700">₹{parseFloat(trip.base_fare).toLocaleString()}</p>
              <p className="text-xs text-gray-500">per seat</p>
            </div>
          </div>

          {trip.stops?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Route Stops</h3>
              <div className="space-y-2">
                {trip.stops.map((stop, i) => (
                  <div key={stop.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i === 0 || i === trip.stops.length - 1 ? 'bg-primary-600' : 'bg-gray-300'}`} />
                    <span className="font-medium text-gray-700">{stop.stop_name}</span>
                    {stop.arrival_offset_minutes && (
                      <span className="text-gray-400 ml-auto">+{stop.arrival_offset_minutes} min</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate(`/buses/${id}/seats`)}
          disabled={avail === 0}
          className="btn-primary btn-lg w-full"
        >
          {avail === 0 ? 'No Seats Available' : 'Select Seats'} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </MainLayout>
  )
}
