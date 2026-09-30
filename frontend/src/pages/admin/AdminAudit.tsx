import { useQuery } from '@tanstack/react-query'
import { http, unwrap } from '../../api/client'
import type { Paged } from '../../types'
import { PageLoader, formatDate } from '../../components/ui'

interface Row { id: string; userId?: string; action: string; entityType?: string; details?: string; ipAddress?: string; createdAt: string }

export default function AdminAudit() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => unwrap<Paged<Row>>(http.get('/admin/audit-logs', { params: { pageSize: 80 } })),
  })
  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-800">سجل التدقيق</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">الإجراء</th>
              <th className="px-4 py-3 font-bold">الكيان</th>
              <th className="px-4 py-3 font-bold">التفاصيل</th>
              <th className="px-4 py-3 font-bold">IP</th>
              <th className="px-4 py-3 font-bold">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-700">{r.action}</td>
                <td className="px-4 py-3 text-slate-500">{r.entityType ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{r.details ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{r.ipAddress ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
