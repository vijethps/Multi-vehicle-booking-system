import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { vehiclesApi, categoriesApi } from '../../services/vehicles'
import MainLayout from '../../components/layout/MainLayout'
import Spinner, { LoadingOverlay } from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import { Car, Filter, Star, Users, Fuel, Zap } from 'lucide-react'
import clsx from 'clsx'

const pricingLabel = { hourly: '/hr', daily: '/day', per_km: '/km', fixed: '/trip', seat_based: '/seat' }

function VehicleCard({ vehicle, onClick }) {
  const img = vehicle.images?.find(i => i.is_primary) || vehicle.images?.[0]
  return (
    <div onClick={onClick} className="card-hover cursor-pointer overflow-hidden">
      <div className="h-48 bg-gray-100 relative overflow-hidden">
        {img ? (
          <img src={img.url} alt={vehicle.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-16 h-16 text-gray-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="badge-blue text-xs">{vehicle.category_name}</span>
        </div>
        {!vehicle.is_available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm">{vehicle.name}</h3>
          {vehicle.rating > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-500 font-medium flex-shrink-0">
              <Star className="w-3 h-3 fill-current" /> {parseFloat(vehicle.rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">{vehicle.type_name || vehicle.model}</p>

        <div className="flex flex-wrap gap-2 mb-4 text-xs text-gray-500">
          {vehicle.passenger_capacity && (
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {vehicle.passenger_capacity}</span>
          )}
          {vehicle.fuel_type && (
            <span className="flex items-center gap-1"><Fuel className="w-3 h-3" /> {vehicle.fuel_type}</span>
          )}
          {vehicle.ac && (
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> AC</span>
          )}
          {vehicle.transmission && (
            <span className="capitalize">{vehicle.transmission}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-primary-700">₹{parseFloat(vehicle.base_price).toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-1">{pricingLabel[vehicle.pricing_method] || ''}</span>
          </div>
          <button className="btn-primary btn-sm">Book Now</button>
        </div>
      </div>
    </div>
  )
}

export default function VehiclesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    category_slug: searchParams.get('category_slug') || '',
    ac: '',
    fuel_type: '',
    max_price: '',
    supports_rental: '',
    supports_goods: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data.data.categories),
  })

  const { data: catData } = useQuery({
    queryKey: ['category', filters.category_slug],
    queryFn: () => categoriesApi.getBySlug(filters.category_slug).then(r => r.data.data.category),
    enabled: !!filters.category_slug,
  })

  const queryParams = {
    page,
    limit: 12,
    ...(catData ? { category_id: catData.id } : {}),
    ...(filters.ac ? { ac: filters.ac } : {}),
    ...(filters.fuel_type ? { fuel_type: filters.fuel_type } : {}),
    ...(filters.max_price ? { max_price: filters.max_price } : {}),
    ...(filters.supports_goods === 'true' ? { supports_goods: 'true' } : { supports_rental: 'true' }),
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['vehicles', queryParams],
    queryFn: () => vehiclesApi.getAll(queryParams).then(r => r.data),
  })

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }

  return (
    <MainLayout>
      <div className="page-container section">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {filters.category_slug ? (catData?.name || 'Vehicles') : 'All Vehicles'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{data?.pagination?.total || 0} vehicles found</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('category_slug', '')}
            className={clsx('btn-sm rounded-full flex-shrink-0', !filters.category_slug ? 'btn-primary' : 'btn-secondary')}
          >
            All
          </button>
          {categories?.filter(c => c.category !== 'bus' && c.category !== 'mini_bus').map(c => (
            <button
              key={c.slug}
              onClick={() => setFilter('category_slug', c.slug)}
              className={clsx('btn-sm rounded-full flex-shrink-0', filters.category_slug === c.slug ? 'btn-primary' : 'btn-secondary')}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="card p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">AC</label>
              <select className="input" value={filters.ac} onChange={e => setFilter('ac', e.target.value)}>
                <option value="">Any</option>
                <option value="true">AC Only</option>
                <option value="false">Non-AC Only</option>
              </select>
            </div>
            <div>
              <label className="label">Fuel Type</label>
              <select className="input" value={filters.fuel_type} onChange={e => setFilter('fuel_type', e.target.value)}>
                <option value="">Any</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
                <option value="cng">CNG</option>
              </select>
            </div>
            <div>
              <label className="label">Max Price (₹)</label>
              <input type="number" className="input" placeholder="e.g. 5000" value={filters.max_price}
                onChange={e => setFilter('max_price', e.target.value)} />
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilters({ category_slug: '', ac: '', fuel_type: '', max_price: '' }); setPage(1) }}
                className="btn-secondary w-full">Clear filters</button>
            </div>
          </div>
        )}

        {/* Grid */}
        {isLoading || isFetching ? (
          <LoadingOverlay message="Finding vehicles…" />
        ) : !data?.data?.length ? (
          <EmptyState icon={Car} title="No vehicles found" description="Try adjusting your filters" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {data.data.map(v => (
                <VehicleCard key={v.id} vehicle={v} onClick={() => navigate(`/vehicles/${v.id}`)} />
              ))}
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </MainLayout>
  )
}
