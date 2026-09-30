import { useQuery } from '@tanstack/react-query'
import { http, unwrap } from '../../api/client'
import { PageLoader, formatDate } from '../../components/ui'

interface Row { id: string; listing: string; seller: string; buyer: string; sellerCoinCost: number; buyerCoinCost: number; status: string; createdAt: string }

export default function AdminDeals() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-deals'], queryFn: () => unwrap<Row[]>(http.get('/admin/deals')) })
  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-800">الصفقات</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">العرض</th>
              <th className="px-4 py-3 font-bold">البائع</th>
              <th className="px-4 py-3 font-bold">المشتري</th>
              <th className="px-4 py-3 font-bold">تكلفة (بائع/مشتري)</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-700">{r.listing}</td>
                <td className="px-4 py-3 text-slate-500">{r.seller}</td>
                <td className="px-4 py-3 text-slate-500">{r.buyer}</td>
                <td className="px-4 py-3 font-extrabold">{r.sellerCoinCost} / {r.buyerCoinCost}</td>
                <td className="px-4 py-3"><span className="badge bg-scrub-100 text-scrub-700">{r.status}</span></td>
                <td className="px-4 py-3 text-slate-400">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">لا توجد صفقات.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
