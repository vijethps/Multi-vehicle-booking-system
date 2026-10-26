import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../services/admin'
import AdminLayout from '../../components/layout/AdminLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import toast from 'react-hot-toast'
import { format } from '../../lib/dateUtils'
import { ToggleLeft, ToggleRight, Search } from 'lucide-react'

export default function AdminUsers() {
  const qc = useQueryClient()
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole]     = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, role],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search: search || undefined, role: role || undefined }).then(r => r.data.data),
  })

  const toggleUser = async (user) => {
    try {
      await adminApi.toggleUser(user.id, !user.is_active)
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
      qc.invalidateQueries(['admin-users'])
    } catch { toast.error('Failed') }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or email…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-40" value={role} onChange={e => { setRole(e.target.value); setPage(1) }}>
          <option value="">All roles</option>
          {['customer','admin','fleet_manager','staff'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingOverlay /> : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Name','Email','Phone','Role','Status','Joined','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.users?.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.first_name} {u.last_name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3"><span className="badge-blue capitalize">{u.role}</span></td>
                    <td className="px-4 py-3"><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(u.created_at), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleUser(u)} className="btn-ghost btn-sm p-1.5">
                        {u.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            pagination={{ total: data?.total, page: data?.page, limit: data?.limit, totalPages: Math.ceil(data?.total / data?.limit), hasPrevPage: data?.page > 1, hasNextPage: data?.page < Math.ceil(data?.total / data?.limit) }}
            onPageChange={setPage}
          />
        </>
      )}
    </AdminLayout>
  )
}
