import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tripsApi, routesApi, seatsApi } from '../../services/trips'
import { vehiclesApi } from '../../services/vehicles'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import StatusBadge from '../../components/ui/StatusBadge'
import toast from 'react-hot-toast'
import { format } from '../../lib/dateUtils'
import { Plus, Users } from 'lucide-react'

const EMPTY = { route_id: '', vehicle_id: '', layout_id: '', departure_time: '', arrival_time: '', base_fare: '', notes: '' }

export default function AdminTrips() {
  const qc = useQueryClient()
  const [page, setPage]   = useState(1)
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-trips', page],
    queryFn: () => tripsApi.getAll({ page, limit: 15 }).then(r => r.data),
  })
  const { data: routes }  = useQuery({ queryKey: ['routes'],  queryFn: () => routesApi.getAll().then(r => r.data.data.routes) })
  const { data: vehicles }= useQuery({ queryKey: ['vehicles-bus'], queryFn: () => vehiclesApi.getAll({ supports_seat_booking: 'true', limit: 50 }).then(r => r.data) })
  const { data: layouts } = useQuery({ queryKey: ['layouts'], queryFn: () => seatsApi.getLayouts().then(r => r.data.data.layouts) })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleCreate = async () => {
    setSaving(true)
    try {
      await tripsApi.create(form)
      toast.success('Trip created')
      qc.invalidateQueries(['admin-trips'])
      setModal(false)
      setForm(EMPTY)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleStatus = async (id, status) => {
    try {
      await tripsApi.updateStatus(id, status)
      toast.success('Status updated')
      qc.invalidateQueries(['admin-trips'])
    } catch { toast.error('Failed') }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bus Trips</h1>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Schedule Trip</button>
      </div>

      {isLoading ? <LoadingOverlay /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['Route','Vehicle','Date','Departure','Fare','Seats','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data?.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{t.origin} → {t.destination}</td>
                      <td className="px-4 py-3 text-gray-600">{t.vehicle_name}</td>
                      <td className="px-4 py-3 text-gray-500">{format(new Date(t.departure_time), 'dd MMM yy')}</td>
                      <td className="px-4 py-3 text-gray-500">{format(new Date(t.departure_time), 'HH:mm')}</td>
                      <td className="px-4 py-3 font-semibold text-primary-700">₹{parseFloat(t.base_fare).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs">
                          <Users className="w-3 h-3" />
                          {parseInt(t.total_seats) - parseInt(t.booked_seats)}/{t.total_seats}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3">
                        {t.status === 'scheduled' && (
                          <select className="input text-xs py-1 w-28" onChange={e => e.target.value && handleStatus(t.id, e.target.value)}>
                            <option value="">Change…</option>
                            {['boarding','departed','completed','cancelled','delayed'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Schedule Bus Trip">
        <div className="space-y-4">
          <div>
            <label className="label">Route *</label>
            <select className="input" value={form.route_id} onChange={set('route_id')}>
              <option value="">Select route…</option>
              {routes?.map(r => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bus *</label>
            <select className="input" value={form.vehicle_id} onChange={set('vehicle_id')}>
              <option value="">Select bus…</option>
              {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Seat Layout *</label>
            <select className="input" value={form.layout_id} onChange={set('layout_id')}>
              <option value="">Select layout…</option>
              {layouts?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Departure *</label>
              <input type="datetime-local" className="input" value={form.departure_time} onChange={set('departure_time')} />
            </div>
            <div>
              <label className="label">Arrival *</label>
              <input type="datetime-local" className="input" value={form.arrival_time} onChange={set('arrival_time')} />
            </div>
          </div>
          <div>
            <label className="label">Base Fare (₹) *</label>
            <input type="number" className="input" value={form.base_fare} onChange={set('base_fare')} placeholder="600" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Scheduling…' : 'Schedule Trip'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
