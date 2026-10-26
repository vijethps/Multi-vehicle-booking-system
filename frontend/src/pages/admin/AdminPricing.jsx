import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { vehiclesApi } from '../../services/vehicles'
import api from '../../lib/axios'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Trash2, DollarSign } from 'lucide-react'

const EMPTY_RULE = { name: '', pricing_method: 'daily', base_rate: '', min_amount: '', max_amount: '' }

export default function AdminPricing() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null) // selected vehicle
  const [modal, setModal]       = useState(false)
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE)
  const [saving, setSaving]     = useState(false)

  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['admin-vehicles-pricing'],
    queryFn: () => vehiclesApi.getAll({ limit: 100 }).then(r => r.data),
  })

  const { data: rulesData } = useQuery({
    queryKey: ['pricing-rules', selected?.id],
    queryFn: () => api.get(`/vehicles/${selected.id}/pricing-rules`).then(r => r.data.data.rules),
    enabled: !!selected,
  })

  const set = k => e => setRuleForm(f => ({ ...f, [k]: e.target.value }))

  const handleAddRule = async () => {
    setSaving(true)
    try {
      await api.post(`/vehicles/${selected.id}/pricing-rules`, ruleForm)
      toast.success('Pricing rule added')
      qc.invalidateQueries(['pricing-rules', selected.id])
      setModal(false)
      setRuleForm(EMPTY_RULE)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (ruleId) => {
    try {
      await api.delete(`/vehicles/${selected.id}/pricing-rules/${ruleId}`)
      toast.success('Rule deleted')
      qc.invalidateQueries(['pricing-rules', selected.id])
    } catch { toast.error('Failed') }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pricing Configuration</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle list */}
        <div className="lg:col-span-1 card overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Select Vehicle</p>
          </div>
          {isLoading ? <LoadingOverlay /> : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {vehiclesData?.data?.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === v.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''}`}
                >
                  <p className="text-sm font-medium text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.category_name} · ₹{parseFloat(v.base_price).toLocaleString()} {v.pricing_method === 'daily' ? '/day' : v.pricing_method === 'hourly' ? '/hr' : v.pricing_method === 'per_km' ? '/km' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rules panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card p-12 text-center text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a vehicle to manage its pricing rules</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                  <p className="text-xs text-gray-400">Pricing rules override the base price for specific scenarios</p>
                </div>
                <button onClick={() => setModal(true)} className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> Add Rule
                </button>
              </div>

              <div className="p-4">
                {/* Base price info */}
                <div className="bg-blue-50 rounded-xl p-4 mb-4 flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium">Base Price</span>
                  <span className="font-bold text-blue-900">
                    ₹{parseFloat(selected.base_price).toLocaleString()} / {selected.pricing_method}
                  </span>
                </div>

                {!rulesData?.length ? (
                  <p className="text-gray-400 text-sm text-center py-6">No custom pricing rules. Base price applies.</p>
                ) : (
                  <div className="space-y-3">
                    {rulesData.map(rule => (
                      <div key={rule.id} className="flex items-center justify-between p-3 border rounded-xl">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{rule.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 capitalize">
                            {rule.pricing_method} · ₹{parseFloat(rule.base_rate).toLocaleString()}
                            {rule.min_amount && ` · Min ₹${parseFloat(rule.min_amount).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${rule.is_active ? 'badge-green' : 'badge-gray'}`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <button onClick={() => handleDelete(rule.id)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Pricing Rule">
        <div className="space-y-4">
          <div>
            <label className="label">Rule Name *</label>
            <input className="input" value={ruleForm.name} onChange={set('name')} placeholder="e.g. Weekend Rate" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pricing Method *</label>
              <select className="input" value={ruleForm.pricing_method} onChange={set('pricing_method')}>
                {['hourly','daily','per_km','fixed','seat_based'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rate (₹) *</label>
              <input type="number" className="input" value={ruleForm.base_rate} onChange={set('base_rate')} placeholder="e.g. 3000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min Amount (₹)</label>
              <input type="number" className="input" value={ruleForm.min_amount} onChange={set('min_amount')} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Max Amount (₹)</label>
              <input type="number" className="input" value={ruleForm.max_amount} onChange={set('max_amount')} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleAddRule} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : 'Add Rule'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
