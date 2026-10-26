import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { vehiclesApi, categoriesApi } from '../../services/vehicles'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import toast from 'react-hot-toast'
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'

const EMPTY = {
  category_id: '', vehicle_type_id: '', name: '', model: '', make: '',
  passenger_capacity: '', fuel_type: '', transmission: '', ac: false,
  pricing_method: 'daily', base_price: '', security_deposit: '',
  driver_available: false, driver_charge: '0',
  supports_rental: true, supports_seat_booking: false,
  supports_charter: false, supports_goods: false,
  description: '',
}

export default function AdminVehicles() {
  const qc = useQueryClient()
  const [page, setPage]     = useState(1)
  const [modal, setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vehicles', page],
    queryFn: () => vehiclesApi.getAll({ page, limit: 15 }).then(r => r.data),
  })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data.data.categories),
  })

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (v) => {
    setEditing(v)
    setForm({ ...EMPTY, ...v, category_id: v.category_id, vehicle_type_id: v.vehicle_type_id || '' })
    setModal(true)
  }

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await vehiclesApi.update(editing.id, form)
        toast.success('Vehicle updated')
      } else {
        await vehiclesApi.create(form)
        toast.success('Vehicle added')
      }
      qc.invalidateQueries(['admin-vehicles'])
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (v) => {
    try {
      await vehiclesApi.updateStatus(v.id, !v.is_active)
      toast.success(`Vehicle ${v.is_active ? 'deactivated' : 'activated'}`)
      qc.invalidateQueries(['admin-vehicles'])
    } catch { toast.error('Failed') }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Vehicle</button>
      </div>

      {isLoading ? <LoadingOverlay /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['Name','Category','Type','Base Price','Method','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data?.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                      <td className="px-4 py-3 text-gray-600">{v.category_name}</td>
                      <td className="px-4 py-3 text-gray-500">{v.type_name || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-primary-700">₹{parseFloat(v.base_price).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{v.pricing_method}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${v.is_active ? 'badge-green' : 'badge-red'}`}>{v.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <button onClick={() => openEdit(v)} className="btn-ghost btn-sm p-1.5"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleStatus(v)} className="btn-ghost btn-sm p-1.5">
                          {v.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                        </button>
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

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category_id} onChange={set('category_id')}>
              <option value="">Select…</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vehicle Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Toyota Corolla" />
          </div>
          <div>
            <label className="label">Make</label>
            <input className="input" value={form.make} onChange={set('make')} placeholder="Toyota" />
          </div>
          <div>
            <label className="label">Model</label>
            <input className="input" value={form.model} onChange={set('model')} placeholder="Corolla" />
          </div>
          <div>
            <label className="label">Pricing Method</label>
            <select className="input" value={form.pricing_method} onChange={set('pricing_method')}>
              {['hourly','daily','per_km','fixed','seat_based'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Base Price (₹) *</label>
            <input type="number" className="input" value={form.base_price} onChange={set('base_price')} />
          </div>
          <div>
            <label className="label">Passenger Capacity</label>
            <input type="number" className="input" value={form.passenger_capacity} onChange={set('passenger_capacity')} />
          </div>
          <div>
            <label className="label">Security Deposit (₹)</label>
            <input type="number" className="input" value={form.security_deposit} onChange={set('security_deposit')} />
          </div>
          <div>
            <label className="label">Fuel Type</label>
            <select className="input" value={form.fuel_type} onChange={set('fuel_type')}>
              <option value="">Select…</option>
              {['petrol','diesel','electric','hybrid','cng'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Transmission</label>
            <select className="input" value={form.transmission} onChange={set('transmission')}>
              <option value="">Select…</option>
              {['manual','automatic'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} />
          </div>
          <div className="col-span-2 flex flex-wrap gap-4">
            {[['ac','AC'],['driver_available','Driver Available'],['supports_rental','Rental'],['supports_seat_booking','Seat Booking'],['supports_charter','Charter'],['supports_goods','Goods Transport']].map(([k,l]) => (
              <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded text-primary-600" checked={!!form[k]} onChange={set(k)} />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save Vehicle'}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
