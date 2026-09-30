import { useQuery } from '@tanstack/react-query'
import { http, unwrap } from '../../api/client'
import type { Paged } from '../../types'
import { PageLoader, formatDate } from '../../components/ui'

interface Row { id: string; userId: string; type: string; amount: number; balanceBefore: number; balanceAfter: number; descriptionAr: string; createdAt: string }

export default function AdminTransactions() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-tx'],
    queryFn: () => unwrap<Paged<Row>>(http.get('/admin/transactions', { params: { pageSize: 60 } })),
  })
  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-800">معاملات المشرط</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">النوع</th>
              <th className="px-4 py-3 font-bold">الوصف</th>
              <th className="px-4 py-3 font-bold">القيمة</th>
              <th className="px-4 py-3 font-bold">قبل</th>
              <th className="px-4 py-3 font-bold">بعد</th>
              <th className="px-4 py-3 font-bold">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><span className="badge bg-brand-50 text-brand-700">{r.type}</span></td>
                <td className="px-4 py-3 text-slate-500">{r.descriptionAr}</td>
                <td className={`px-4 py-3 font-extrabold ${r.amount >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{r.amount >= 0 ? '+' : ''}{r.amount}</td>
                <td className="px-4 py-3 text-slate-400">{r.balanceBefore}</td>
                <td className="px-4 py-3 text-slate-700 font-bold">{r.balanceAfter}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
