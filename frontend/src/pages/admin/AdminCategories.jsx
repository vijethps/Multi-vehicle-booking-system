import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../../services/vehicles'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { Edit2, Car, Bus, Truck, Bike } from 'lucide-react'

const categoryIcons = { car: Car, bike: Bike, bus: Bus, mini_bus: Bus, tempo: Car, truck: Truck, other: Car }

export default function AdminCategories() {
  const qc = useQueryClient()
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data.data.categories),
  })

  const openEdit = (cat) => {
    setEditing(cat)
    setForm({
      supports_rental:       cat.supports_rental,
      supports_seat_booking: cat.supports_seat_booking,
      supports_charter:      cat.supports_charter,
      supports_goods:        cat.supports_goods,
      is_active:             cat.is_active,
      description:           cat.description || '',
      sort_order:            cat.sort_order || 0,
    })
    setModal(true)
  }

  const set = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await categoriesApi.update(editing.id, form)
      toast.success('Category updated')
      qc.invalidateQueries(['categories'])
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Vehicle Categories</h1>

      {isLoading ? <LoadingOverlay /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map(cat => {
            const Icon = categoryIcons[cat.category] || Car
            return (
              <div key={cat.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">{cat.category}</p>
                    </div>
                  </div>
                  <button onClick={() => openEdit(cat)} className="btn-ghost btn-sm p-1.5">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{cat.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Rental',       cat.supports_rental],
                    ['Seat Booking', cat.supports_seat_booking],
                    ['Charter',      cat.supports_charter],
                    ['Goods',        cat.supports_goods],
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${val ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={val ? 'text-green-700' : 'text-gray-400'}>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <span className={`badge ${cat.is_active ? 'badge-green' : 'badge-red'}`}>
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-400">{cat.available_count} vehicles</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={`Edit: ${editing?.name}`}>
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input type="number" className="input" value={form.sort_order} onChange={set('sort_order')} />
            </div>

            <div>
              <label className="label mb-3">Booking Capabilities</label>
              <div className="space-y-2">
                {[
                  ['supports_rental',       'Supports Vehicle Rental',       'Customers can rent the whole vehicle'],
                  ['supports_seat_booking', 'Supports Seat Booking',         'Customers can book individual seats'],
                  ['supports_charter',      'Supports Charter/Full Vehicle', 'Customers can charter the whole vehicle'],
                  ['supports_goods',        'Supports Goods Transport',      'Vehicle used for cargo/freight'],
                  ['is_active',             'Category Active',               'Visible to customers'],
                ].map(([key, label, hint]) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded text-primary-600"
                      checked={!!form[key]}
                      onChange={set(key)}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{hint}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
