import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { format } from '../../lib/dateUtils'
import clsx from 'clsx'

const typeStyles = {
  info:    { icon: Info,          bg: 'bg-blue-50',   text: 'text-blue-600'  },
  success: { icon: CheckCircle,   bg: 'bg-green-50',  text: 'text-green-600' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50',  text: 'text-amber-600' },
  error:   { icon: XCircle,       bg: 'bg-red-50',    text: 'text-red-600'   },
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => api.get('/users/notifications', { params: { unread_only: unreadOnly } })
      .then(r => r.data.data),
  })

  const markRead = async (id) => {
    try {
      await api.patch(`/users/notifications/${id}/read`)
      qc.invalidateQueries(['notifications'])
    } catch { /* silent */ }
  }

  const markAllRead = async () => {
    const unread = data?.notifications?.filter(n => !n.is_read) || []
    await Promise.all(unread.map(n => api.patch(`/users/notifications/${n.id}/read`)))
    qc.invalidateQueries(['notifications'])
  }

  return (
    <MainLayout>
      <div className="page-container section max-w-2xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {data?.unread_count > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                {data.unread_count} unread notification{data.unread_count > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={e => setUnreadOnly(e.target.checked)}
                className="rounded text-primary-600"
              />
              Unread only
            </label>
            {data?.unread_count > 0 && (
              <button onClick={markAllRead} className="btn-secondary btn-sm">
                <CheckCheck className="w-4 h-4" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {isLoading ? <LoadingOverlay /> :
         !data?.notifications?.length ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description={unreadOnly ? 'No unread notifications' : "You're all caught up!"}
          />
        ) : (
          <div className="space-y-2">
            {data.notifications.map(n => {
              const style = typeStyles[n.type] || typeStyles.info
              const Icon  = style.icon
              return (
                <div
                  key={n.id}
                  className={clsx(
                    'card p-4 flex items-start gap-3 transition-all',
                    !n.is_read && 'border-l-4 border-primary-500'
                  )}
                >
                  <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', style.bg)}>
                    <Icon className={clsx('w-4 h-4', style.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={clsx('text-sm font-medium', n.is_read ? 'text-gray-700' : 'text-gray-900')}>
                        {n.title}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {format(new Date(n.created_at), 'dd MMM yyyy, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => markRead(n.id)} className="btn-ghost btn-sm p-1.5 flex-shrink-0" title="Mark as read">
                      <CheckCheck className="w-4 h-4 text-primary-500" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
