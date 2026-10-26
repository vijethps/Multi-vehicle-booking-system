import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tripsApi, routesApi } from '../../services/trips'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import { Bus, MapPin, Calendar, Clock, Users, ArrowRight } from 'lucide-react'
import { format } from '../../lib/dateUtils'

export default function BusesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState({
    origin: '', destination: '', travel_date: new Date().toISOString().split('T')[0]
  })
  const [query, setQuery]   = useState({ travel_date: new Date().toISOString().split('T')[0] })
  const [page, setPage]     = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['trips', { ...query, page }],
    queryFn: () => tripsApi.getAll({ ...query, page, limit: 10 }).then(r => r.data),
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setQuery({ ...search })
    setPage(1)
  }

  return (
    <MainLayout>
      {/* Search */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white py-10">
        <div className="page-container">
          <h1 className="text-3xl font-bold mb-6 text-center">Book Bus Tickets</h1>
          <form onSubmit={handleSearch} className="bg-white rounded-2xl p-4 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-9 text-gray-900" placeholder="From (e.g. Mumbai)"
                  value={search.origin} onChange={e => setSearch(s => ({ ...s, origin: e.target.value }))} />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-9 text-gray-900" placeholder="To (e.g. Pune)"
                  value={search.destination} onChange={e => setSearch(s => ({ ...s, destination: e.target.value }))} />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="date" className="input pl-9 text-gray-900"
                  value={search.travel_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setSearch(s => ({ ...s, travel_date: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="btn-primary btn-lg w-full mt-3">
              Search Buses <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="page-container section">
        {isLoading ? (
          <LoadingOverlay message="Searching buses…" />
        ) : !data?.data?.length ? (
          <EmptyState
            icon={Bus}
            title="No buses found"
            description="Try a different date or route"
          />
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{data.pagination?.total} trips found</p>
            <div className="space-y-4">
              {data.data.map(trip => (
                <TripCard key={trip.id} trip={trip} onBook={() => navigate(`/buses/${trip.id}/seats`)} onDetail={() => navigate(`/buses/${trip.id}`)} />
              ))}
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </MainLayout>
  )
}

function TripCard({ trip, onBook, onDetail }) {
  const dep = new Date(trip.departure_time)
  const arr = new Date(trip.arrival_time)
  const avail = parseInt(trip.total_seats) - parseInt(trip.booked_seats)

  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{format(dep, 'HH:mm')}</p>
              <p className="text-sm text-gray-500">{trip.origin}</p>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-300" />
                <Bus className="w-4 h-4 text-primary-400" />
                <div className="h-px flex-1 bg-gray-300" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{trip.distance_km ? `${trip.distance_km} km` : 'Direct'}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{format(arr, 'HH:mm')}</p>
              <p className="text-sm text-gray-500">{trip.destination}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>{trip.vehicle_name}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {avail > 0 ? `${avail} seats available` : <span className="text-red-500">Full</span>}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(dep, 'dd MMM yyyy')}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-gray-400">Starting from</p>
            <p className="text-2xl font-bold text-primary-700">₹{parseFloat(trip.base_fare).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onDetail} className="btn-secondary btn-sm">Details</button>
            <button onClick={onBook} disabled={avail === 0} className="btn-primary btn-sm">Select Seats</button>
          </div>
        </div>
      </div>
    </div>
  )
}
