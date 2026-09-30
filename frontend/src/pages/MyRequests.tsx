import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, PlusCircle, Search } from 'lucide-react'
import { http, unwrap } from '../api/client'
import type { BuyerRequest, Listing } from '../types'
import { RequestStatusBadge, PageLoader, EmptyState, formatDate } from '../components/ui'

export default function MyRequests() {
  const [matchesFor, setMatchesFor] = useState<string | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['my-requests'], queryFn: () => unwrap<BuyerRequest[]>(http.get('/requests')) })

  const matches = useQuery({
    queryKey: ['matches', matchesFor],
    queryFn: () => unwrap<Listing[]>(http.get(`/requests/${matchesFor}/matches`)),
    enabled: !!matchesFor,
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">طلباتي</h1>
        <Link to="/requests/new" className="btn-primary"><PlusCircle size={18} /> طلب جديد</Link>
      </div>

      {!data?.length ? (
        <EmptyState icon={<ClipboardList size={48} />} title="لا توجد طلبات بعد" hint="أنشئ طلبًا يصف ما تحتاجه بدقة." action={<Link to="/requests/new" className="btn-primary">طلب جديد</Link>} />
      ) : (
        <div className="grid gap-4">
          {data.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-800 line-clamp-1">{r.title}</div>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{r.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="badge bg-brand-50 text-brand-700">{r.categoryName}</span>
                    {(r.budgetMin || r.budgetMax) && <span>الميزانية: {r.budgetMin ?? 0} - {r.budgetMax ?? '∞'}</span>}
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                </div>
                <RequestStatusBadge status={r.status} />
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <button className="btn-secondary text-xs" onClick={() => setMatchesFor(matchesFor === r.id ? null : r.id)}>
                  <Search size={14} /> العروض المطابقة
                </button>
              </div>

              {matchesFor === r.id && (
                <div className="mt-3 space-y-2">
                  {matches.isLoading ? (
                    <p className="text-sm text-slate-400">جارٍ البحث...</p>
                  ) : matches.data?.length ? (
                    matches.data.map((l) => (
                      <Link key={l.id} to={`/listings/${l.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-brand-50">
                        <span className="font-bold text-slate-700 line-clamp-1">{l.title}</span>
                        <span className="text-sm font-extrabold">{l.price.toLocaleString('ar-EG')} {l.currency}</span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">لا توجد عروض مطابقة حاليًا.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
