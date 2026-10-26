import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { routesApi } from '../../services/trips'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, MapPin } from 'lucide-react'

export default function AdminRoutes() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ origin: '', destination: '', distance_km: '' })
  const [saving, setSaving] = useState(false)

  const { data: routes, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routesApi.getAll().then(r => r.data.data.routes),
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleCreate = async () => {
    setSaving(true)
    try {
      await routesApi.create(form)
      toast.success('Route created')
      qc.invalidateQueries(['routes'])
      setModal(false)
      setForm({ origin: '', destination: '', distance_km: '' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Route</button>
      </div>

      {isLoading ? <LoadingOverlay /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes?.map(r => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-primary-500" />
                <span className="font-semibold text-gray-900">{r.origin} → {r.destination}</span>
              </div>
              {r.distance_km && <p className="text-sm text-gray-500 mb-3">{r.distance_km} km</p>}
              {r.stops?.length > 0 && (
                <div className="space-y-1">
                  {r.stops.map(s => (
                    <p key={s.id} className="text-xs text-gray-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      {s.stop_name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Route">
        <div className="space-y-4">
          <div>
            <label className="label">Origin *</label>
            <input className="input" value={form.origin} onChange={set('origin')} placeholder="Mumbai" />
          </div>
          <div>
            <label className="label">Destination *</label>
            <input className="input" value={form.destination} onChange={set('destination')} placeholder="Pune" />
          </div>
          <div>
            <label className="label">Distance (km)</label>
            <input type="number" className="input" value={form.distance_km} onChange={set('distance_km')} placeholder="148" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : 'Add Route'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
