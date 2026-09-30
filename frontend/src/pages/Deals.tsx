import { useQuery } from '@tanstack/react-query'
import { Handshake, Phone, Mail, User as UserIcon } from 'lucide-react'
import { http, unwrap } from '../api/client'
import { useAuth } from '../store/auth'
import type { Deal } from '../types'
import { PageLoader, EmptyState, formatDate } from '../components/ui'
import Coin from '../components/Coin'

export default function Deals() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({ queryKey: ['deals'], queryFn: () => unwrap<Deal[]>(http.get('/deals')) })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">الصفقات</h1>

      {!data?.length ? (
        <EmptyState icon={<Handshake size={48} />} title="لا توجد صفقات بعد" hint="ستظهر هنا الصفقات المكتملة كبائع أو مشترٍ." />
      ) : (
        <div className="grid gap-3">
          {data.map((d) => {
            const asSeller = d.sellerId === user?.id
            // Contact of the OTHER party (revealed after selection)
            const contactName = asSeller ? d.buyerName : d.sellerName
            const contactPhone = asSeller ? d.buyerPhone : d.sellerPhone
            const contactEmail = asSeller ? d.buyerEmail : d.sellerEmail
            return (
              <div key={d.id} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-800 line-clamp-1">{d.listingTitle}</div>
                    <div className="mt-1 text-xs text-slate-400">{formatDate(d.createdAt)}</div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className={`badge ${asSeller ? 'bg-brand-100 text-brand-700' : 'bg-scrub-100 text-scrub-700'}`}>{asSeller ? 'كبائع' : 'كمشترٍ'}</span>
                    <div className="mt-2 flex items-center justify-end gap-1 text-xs text-slate-400">التكلفة <Coin amount={asSeller ? d.sellerCoinCost : d.buyerCoinCost} size="sm" /></div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-xs font-bold text-slate-500 mb-2">{asSeller ? 'بيانات المشتري' : 'بيانات البائع'}</div>
                  <div className="grid sm:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <UserIcon size={16} className="text-slate-400 shrink-0" />
                      <span className="font-bold truncate">{contactName}</span>
                    </div>
                    {contactPhone && (
                      <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-brand-700 hover:underline">
                        <Phone size={16} className="text-slate-400 shrink-0" />
                        <span dir="ltr" className="truncate">{contactPhone}</span>
                      </a>
                    )}
                    {contactEmail && (
                      <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-brand-700 hover:underline">
                        <Mail size={16} className="text-slate-400 shrink-0" />
                        <span dir="ltr" className="truncate">{contactEmail}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
