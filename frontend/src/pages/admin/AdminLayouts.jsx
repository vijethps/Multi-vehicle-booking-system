import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { seatsApi } from '../../services/trips'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Grid, Eye } from 'lucide-react'
import clsx from 'clsx'

export default function AdminLayouts() {
  const qc = useQueryClient()
  const [modal, setModal]     = useState(false)
  const [preview, setPreview] = useState(null)
  const [form, setForm]       = useState({
    name: '', description: '', rows: 10, cols_lower: 4, has_upper_deck: false
  })
  const [saving, setSaving] = useState(false)

  const { data: layouts, isLoading } = useQuery({
    queryKey: ['layouts'],
    queryFn: () => seatsApi.getLayouts().then(r => r.data.data.layouts),
  })

  const { data: previewData } = useQuery({
    queryKey: ['layout-preview', preview?.id],
    queryFn: () => seatsApi.getLayout(preview.id).then(r => r.data.data),
    enabled: !!preview,
  })

  const set = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      // Auto-generate seats: rows x cols with A/B aisle C/D
      const positions = ['window', 'aisle', 'aisle', 'window']
      const cols = ['A', 'B', 'C', 'D'].slice(0, form.cols_lower)
      const seats = []
      for (let row = 1; row <= parseInt(form.rows); row++) {
        for (let c = 0; c < parseInt(form.cols_lower); c++) {
          seats.push({
            seat_number: `${row}${cols[c]}`,
            row_number: row,
            position: positions[c] || 'window',
            deck: 'single',
            seat_type: 'seater',
            extra_charge: 0,
          })
        }
      }
      await seatsApi.createLayout({ ...form, rows: parseInt(form.rows), cols_lower: parseInt(form.cols_lower), seats })
      toast.success('Seat layout created')
      qc.invalidateQueries(['layouts'])
      setModal(false)
      setForm({ name: '', description: '', rows: 10, cols_lower: 4, has_upper_deck: false })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Seat Layouts</h1>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Layout
        </button>
      </div>

      {isLoading ? <LoadingOverlay /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {layouts?.map(layout => (
            <div key={layout.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Grid className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{layout.name}</h3>
                    <p className="text-xs text-gray-400">{layout.rows} rows × {layout.cols_lower} cols</p>
                  </div>
                </div>
              </div>
              {layout.description && (
                <p className="text-xs text-gray-500 mb-3">{layout.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-xs text-gray-500">
                  <span>{layout.rows * layout.cols_lower} seats</span>
                  {layout.has_upper_deck && <span className="badge-purple">Double deck</span>}
                </div>
                <button
                  onClick={() => setPreview(layout)}
                  className="btn-secondary btn-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
              </div>
            </div>
          ))}
          {!layouts?.length && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Grid className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No seat layouts yet</p>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Create Seat Layout">
        <div className="space-y-4">
          <div>
            <label className="label">Layout Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Standard 2+2 Seater" />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={set('description')} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Number of Rows *</label>
              <input type="number" className="input" value={form.rows} onChange={set('rows')} min={1} max={30} />
            </div>
            <div>
              <label className="label">Seats per Row *</label>
              <select className="input" value={form.cols_lower} onChange={set('cols_lower')}>
                <option value={2}>2 (1+1)</option>
                <option value={3}>3 (2+1)</option>
                <option value={4}>4 (2+2)</option>
                <option value={5}>5 (2+3)</option>
              </select>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            This will auto-generate <strong>{form.rows * form.cols_lower}</strong> seats with standard window/aisle positions.
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded text-primary-600" checked={form.has_upper_deck} onChange={set('has_upper_deck')} />
            <span className="text-sm text-gray-700">Has upper deck (double-decker)</span>
          </label>
          <div className="flex gap-3">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.name} className="btn-primary flex-1">
              {saving ? 'Creating…' : 'Create Layout'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={`Preview: ${preview?.name}`} size="lg">
        {previewData && (
          <div>
            <div className="flex justify-end mb-3">
              <span className="text-xs bg-gray-100 px-3 py-1 rounded text-gray-500">🚌 Driver</span>
            </div>
            <div className="overflow-x-auto">
              {Array.from({ length: previewData.layout.rows }, (_, i) => i + 1).map(row => {
                const rowSeats = previewData.seats.filter(s => s.row_number === row)
                return (
                  <div key={row} className="flex items-center gap-1 mb-1">
                    <span className="w-5 text-xs text-gray-400 text-right">{row}</span>
                    {rowSeats.map(seat => (
                      <div
                        key={seat.id}
                        className="w-9 h-9 rounded bg-white border-2 border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600"
                      >
                        {seat.seat_number}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              {previewData.seats.length} total seats
            </p>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
