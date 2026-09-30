import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, X, Inbox } from 'lucide-react'
import { http, unwrap, apiError } from '../api/client'
import type { ListingRequest } from '../types'
import { RequestStatusBadge, PageLoader, EmptyState, formatDate } from '../components/ui'
import Coin from '../components/Coin'

export default function IncomingRequests() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['seller-requests'], queryFn: () => unwrap<ListingRequest[]>(http.get('/seller/requests')) })

  const respond = useMutation({
    mutationFn: ({ id, act }: { id: string; act: 'accept' | 'reject' }) => http.post(`/listing-requests/${id}/${act}`),
    onSuccess: (_r, v) => {
      toast.success(v.act === 'accept' ? 'تم قبول الطلب وإتمام الصفقة' : 'تم رفض الطلب')
      qc.invalidateQueries({ queryKey: ['seller-requests'] })
      qc.invalidateQueries({ queryKey: ['unread'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">طلبات العملاء</h1>
        <p className="text-slate-400 text-sm mt-1">اقبل مشتريًا واحدًا فقط لكل عرض — سيُخصم <Coin amount={1} size="sm" /> من كل طرف.</p>
      </div>

      {!data?.length ? (
        <EmptyState icon={<Inbox size={48} />} title="لا توجد طلبات واردة" hint="ستظهر هنا طلبات المشترين على عروضك." />
      ) : (
        <div className="grid gap-3">
          {data.map((r) => {
            const isPending = r.status === 0 || r.status === 'Pending'
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-800 line-clamp-1">{r.listingTitle}</div>
                    <div className="mt-1 text-sm text-slate-500">من: <span className="font-bold">{r.buyerName}</span></div>
                    {r.message && <p className="mt-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{r.message}</p>}
                    <div className="mt-2 text-xs text-slate-400">{formatDate(r.createdAt)}</div>
                  </div>
                  <RequestStatusBadge status={r.status} />
                </div>
                {isPending && (
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button className="btn-primary text-sm flex-1" disabled={respond.isPending} onClick={() => respond.mutate({ id: r.id, act: 'accept' })}>
                      <Check size={16} /> قبول
                    </button>
                    <button className="btn-ghost text-sm flex-1 border border-slate-200" disabled={respond.isPending} onClick={() => respond.mutate({ id: r.id, act: 'reject' })}>
                      <X size={16} /> رفض
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
