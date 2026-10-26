import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '../services/vehicles'
import {
  Car, Bike, Bus, Truck, MapPin, Calendar,
  Users, ArrowRight, Star, Shield, Clock, Headphones
} from 'lucide-react'
import MainLayout from '../components/layout/MainLayout'
import Spinner from '../components/ui/Spinner'

const categoryIcons = {
  car: Car, bike: Bike, bus: Bus, mini_bus: Bus,
  tempo: Users, truck: Truck, other: Car,
}

const features = [
  { icon: Shield,     title: 'Safe & Verified',     desc: 'All vehicles are inspected and insured' },
  { icon: Clock,      title: '24/7 Availability',   desc: 'Book anytime, day or night' },
  { icon: Star,       title: 'Best Prices',          desc: 'Transparent pricing, no hidden charges' },
  { icon: Headphones, title: 'Dedicated Support',    desc: 'Customer support whenever you need it' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [search, setSearch]   = useState({ pickup: '', destination: '', date: '' })

  const { data: catData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data.data.categories),
  })

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search.pickup)      params.set('pickup', search.pickup)
    if (search.destination) params.set('destination', search.destination)
    if (search.date)        params.set('date', search.date)
    navigate(`/vehicles?${params.toString()}`)
  }

  return (
    <MainLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white py-20">
        <div className="page-container text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Book Your Perfect <br />
            <span className="text-primary-200">Transport</span>
          </h1>
          <p className="text-primary-100 text-lg mb-10 max-w-2xl mx-auto">
            Cars, bikes, buses, tempos, trucks — all on one platform.
            Rent a vehicle or book individual bus seats in seconds.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl p-4 md:p-6 max-w-3xl mx-auto shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pickup location"
                  className="input pl-9 text-gray-900"
                  value={search.pickup}
                  onChange={e => setSearch(s => ({ ...s, pickup: e.target.value }))}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Destination (optional)"
                  className="input pl-9 text-gray-900"
                  value={search.destination}
                  onChange={e => setSearch(s => ({ ...s, destination: e.target.value }))}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  className="input pl-9 text-gray-900"
                  value={search.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setSearch(s => ({ ...s, date: e.target.value }))}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary btn-lg w-full mt-4">
              Search Vehicles <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="section page-container">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Browse by Category</h2>
          <p className="text-gray-500 mt-2">Choose the right vehicle for every journey</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {catData?.map(cat => {
              const Icon = categoryIcons[cat.category] || Car
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(cat.category === 'bus' || cat.category === 'mini_bus'
                    ? '/buses'
                    : cat.category === 'truck'
                    ? '/trucks'
                    : `/vehicles?category_slug=${cat.slug}`
                  )}
                  className="card-hover p-5 flex flex-col items-center gap-3 cursor-pointer group"
                >
                  <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <Icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-400">{cat.available_count || 0} available</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="page-container">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Why TransportHub?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 text-center">
                <div className="w-12 h-12 bg-primary-50 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section page-container text-center">
        <div className="bg-primary-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-3">Ready to hit the road?</h2>
          <p className="text-primary-100 mb-6 text-lg">Join thousands of travellers booking smart with TransportHub</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate('/vehicles')} className="bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition">
              Rent a Vehicle
            </button>
            <button onClick={() => navigate('/buses')} className="border border-primary-300 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-700 transition">
              Book a Bus Seat
            </button>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
