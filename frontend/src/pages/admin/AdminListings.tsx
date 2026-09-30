import { useQuery } from '@tanstack/react-query'
import { http, unwrap } from '../../api/client'
import type { Paged } from '../../types'
import { PageLoader, formatDate } from '../../components/ui'

interface Row { id: string; title: string; seller: string; category: string; price: number; currency: string; status: string; createdAt: string }

export default function AdminListings() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: () => unwrap<Paged<Row>>(http.get('/admin/listings', { params: { pageSize: 50 } })),
  })
  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-800">العروض</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">العنوان</th>
              <th className="px-4 py-3 font-bold">البائع</th>
              <th className="px-4 py-3 font-bold">القسم</th>
              <th className="px-4 py-3 font-bold">السعر</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-700">{r.title}</td>
                <td className="px-4 py-3 text-slate-500">{r.seller}</td>
                <td className="px-4 py-3"><span className="badge bg-brand-50 text-brand-700">{r.category}</span></td>
                <td className="px-4 py-3 font-extrabold">{r.price} {r.currency}</td>
                <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-600">{r.status}</span></td>
                <td className="px-4 py-3 text-slate-400">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
