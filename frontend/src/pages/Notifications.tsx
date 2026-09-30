import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { http, unwrap } from '../api/client'
import type { Notification } from '../types'
import { PageLoader, EmptyState, formatDate } from '../components/ui'
import clsx from 'clsx'

export default function Notifications() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => unwrap<Notification[]>(http.get('/notifications')) })

  const markAll = useMutation({
    mutationFn: () => http.post('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['unread'] })
    },
  })

  const markOne = useMutation({
    mutationFn: (id: string) => http.post(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['unread'] })
    },
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">الإشعارات</h1>
        <button className="btn-secondary text-sm" onClick={() => markAll.mutate()}><CheckCheck size={16} /> تعليم الكل كمقروء</button>
      </div>

      {!data?.length ? (
        <EmptyState icon={<Bell size={48} />} title="لا توجد إشعارات" />
      ) : (
        <div className="space-y-2">
          {data.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markOne.mutate(n.id)}
              className={clsx('w-full text-right card p-4 flex items-start gap-3 transition', !n.isRead && 'border-brand-200 bg-brand-50/40')}
            >
              <div className={clsx('mt-0.5 w-2.5 h-2.5 rounded-full shrink-0', n.isRead ? 'bg-slate-200' : 'bg-brand-500')} />
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-800 text-sm">{n.titleAr}</div>
                <div className="text-sm text-slate-500 mt-0.5">{n.bodyAr}</div>
                <div className="text-xs text-slate-400 mt-1">{formatDate(n.createdAt)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
