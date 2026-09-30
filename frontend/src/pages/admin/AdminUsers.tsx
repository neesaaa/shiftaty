import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, Coins, Power } from 'lucide-react'
import { http, unwrap, apiError } from '../../api/client'
import type { AdminUser, Paged } from '../../types'
import { PageLoader, formatDate } from '../../components/ui'

export default function AdminUsers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [adjust, setAdjust] = useState<{ id: string; name: string } | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => unwrap<Paged<AdminUser>>(http.get('/admin/users', { params: { search: search || undefined, pageSize: 50 } })),
  })

  const toggle = useMutation({
    mutationFn: (id: string) => http.post(`/admin/users/${id}/toggle-active`),
    onSuccess: () => {
      toast.success('تم تحديث الحالة')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const adjustCoins = useMutation({
    mutationFn: () => http.post(`/admin/users/${adjust!.id}/adjust-coins`, { amount: Number(amount), reason }),
    onSuccess: () => {
      toast.success('تم تعديل الرصيد')
      setAdjust(null); setAmount(''); setReason('')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-800">المستخدمون</h1>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute right-3 top-3 text-slate-400" />
        <input className="input pr-10" placeholder="بحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-right">
            <tr>
              <th className="px-4 py-3 font-bold">الاسم</th>
              <th className="px-4 py-3 font-bold">البريد</th>
              <th className="px-4 py-3 font-bold">الأدوار</th>
              <th className="px-4 py-3 font-bold">الرصيد</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-700">{u.fullName}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => <span key={r} className="badge bg-brand-50 text-brand-700">{r}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 font-extrabold">{u.balance}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>{u.isActive ? 'نشط' : 'معطّل'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button className="btn-ghost text-xs border border-slate-200" onClick={() => setAdjust({ id: u.id, name: u.fullName })}><Coins size={14} /> رصيد</button>
                    <button className="btn-ghost text-xs border border-slate-200" onClick={() => toggle.mutate(u.id)}><Power size={14} /> {u.isActive ? 'تعطيل' : 'تفعيل'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjust && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAdjust(null)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-extrabold text-slate-800 mb-1">تعديل رصيد {adjust.name}</h2>
            <p className="text-sm text-slate-400 mb-4">استخدم قيمة موجبة للإضافة أو سالبة للخصم.</p>
            <div className="space-y-3">
              <input className="input" type="number" placeholder="القيمة (مثال: 50 أو -10)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input className="input" placeholder="السبب" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setAdjust(null)}>إلغاء</button>
                <button className="btn-primary flex-1" disabled={!amount || !reason || adjustCoins.isPending} onClick={() => adjustCoins.mutate()}>تأكيد</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
