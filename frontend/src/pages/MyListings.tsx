import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PlusCircle, Send, Pause, XCircle, Store } from 'lucide-react'
import { http, unwrap, apiError } from '../api/client'
import type { Listing } from '../types'
import { ListingStatusBadge, PageLoader, EmptyState } from '../components/ui'
import Coin from '../components/Coin'

export default function MyListings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['my-listings'], queryFn: () => unwrap<Listing[]>(http.get('/listings/mine')) })

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) => http.post(`/listings/${id}/${act}`),
    onSuccess: () => {
      toast.success('تم تنفيذ العملية')
      qc.invalidateQueries({ queryKey: ['my-listings'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">عروضي</h1>
        <Link to="/listings/new" className="btn-primary"><PlusCircle size={18} /> إضافة عرض</Link>
      </div>

      {!data?.length ? (
        <EmptyState icon={<Store size={48} />} title="لا توجد عروض بعد" hint="ابدأ بإضافة أول عرض لك." action={<Link to="/listings/new" className="btn-primary">إضافة عرض</Link>} />
      ) : (
        <div className="grid gap-4">
          {data.map((l) => {
            const isDraft = l.status === 0 || l.status === 'Draft'
            const isPublished = l.status === 1 || l.status === 'Published'
            return (
              <div key={l.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/listings/${l.id}`} className="font-extrabold text-slate-800 hover:text-brand-700 line-clamp-1">{l.title}</Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="badge bg-brand-50 text-brand-700">{l.categoryName}</span>
                      <span>{l.requestCount} طلب</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ListingStatusBadge status={l.status} />
                    <Coin amount={l.price} size="sm" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {isDraft && <button className="btn-primary text-xs" onClick={() => action.mutate({ id: l.id, act: 'publish' })}><Send size={14} /> نشر</button>}
                  {isPublished && <button className="btn-secondary text-xs" onClick={() => action.mutate({ id: l.id, act: 'pause' })}><Pause size={14} /> إيقاف</button>}
                  {(isDraft || isPublished) && <button className="btn-ghost text-xs border border-slate-200" onClick={() => action.mutate({ id: l.id, act: 'cancel' })}><XCircle size={14} /> إلغاء</button>}
                  <Link to={`/incoming`} className="btn-ghost text-xs mr-auto">عرض الطلبات</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
