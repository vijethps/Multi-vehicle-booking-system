import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { vehiclesApi } from '../../services/vehicles'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { Truck, Package, Weight, ArrowRight } from 'lucide-react'

export default function TrucksPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState({ pickup: '', delivery: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => vehiclesApi.getAll({ supports_goods: 'true', limit: 20 }).then(r => r.data),
  })

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-10">
        <div className="page-container text-center">
          <h1 className="text-3xl font-bold mb-2">Freight & Goods Transport</h1>
          <p className="text-gray-300 mb-6">Mini trucks, pickups, medium and heavy trucks for all your cargo needs</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto bg-white rounded-xl p-4">
            <input className="input text-gray-900" placeholder="Pickup address"
              value={search.pickup} onChange={e => setSearch(s => ({ ...s, pickup: e.target.value }))} />
            <input className="input text-gray-900" placeholder="Delivery address"
              value={search.delivery} onChange={e => setSearch(s => ({ ...s, delivery: e.target.value }))} />
            <button className="btn-primary" onClick={() => {}}>
              Search <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="page-container section">
        {isLoading ? (
          <LoadingOverlay message="Loading trucks…" />
        ) : !data?.data?.length ? (
          <EmptyState icon={Truck} title="No trucks available" description="Check back soon" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.data.map(v => (
              <TruckCard key={v.id} vehicle={v} onClick={() => navigate(`/vehicles/${v.id}`)} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

function TruckCard({ vehicle, onClick }) {
  const img = vehicle.images?.find(i => i.is_primary) || vehicle.images?.[0]
  return (
    <div onClick={onClick} className="card-hover cursor-pointer overflow-hidden">
      <div className="h-44 bg-gray-100">
        {img ? (
          <img src={img.url} alt={vehicle.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Truck className="w-16 h-16 text-gray-300" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{vehicle.name}</h3>
        <p className="text-xs text-gray-400 mb-3">{vehicle.type_name || vehicle.model}</p>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
          {vehicle.cargo_capacity_kg && (
            <span className="flex items-center gap-1">
              <Weight className="w-3 h-3" /> {vehicle.cargo_capacity_kg} kg
            </span>
          )}
          {vehicle.cargo_capacity_cbm && (
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" /> {vehicle.cargo_capacity_cbm} m³
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-primary-700">
              ₹{parseFloat(vehicle.base_price).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 ml-1">
              {vehicle.pricing_method === 'per_km' ? '/km' : vehicle.pricing_method === 'fixed' ? '/trip' : '/day'}
            </span>
          </div>
          <button className="btn-primary btn-sm">Book</button>
        </div>
      </div>
    </div>
  )
}
