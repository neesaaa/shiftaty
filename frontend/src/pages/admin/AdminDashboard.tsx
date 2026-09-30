import { useQuery } from '@tanstack/react-query'
import { Users, Store, ShoppingBag, Handshake, FolderTree, Coins } from 'lucide-react'
import { http, unwrap } from '../../api/client'
import type { AdminStats } from '../../types'
import { PageLoader } from '../../components/ui'

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: () => unwrap<AdminStats>(http.get('/admin/stats')) })
  if (isLoading || !data) return <PageLoader />

  const cards = [
    { label: 'المستخدمون', value: data.totalUsers, icon: Users, color: 'bg-brand-500' },
    { label: 'إجمالي العروض', value: data.totalListings, icon: Store, color: 'bg-scrub-500' },
    { label: 'العروض المنشورة', value: data.publishedListings, icon: ShoppingBag, color: 'bg-emerald-500' },
    { label: 'الطلبات', value: data.totalRequests, icon: ShoppingBag, color: 'bg-amber-500' },
    { label: 'الصفقات', value: data.totalDeals, icon: Handshake, color: 'bg-violet-500' },
    { label: 'الأقسام', value: data.totalCategories, icon: FolderTree, color: 'bg-rose-500' },
    { label: 'المشرط المتداول', value: data.coinsInCirculation, icon: Coins, color: 'bg-slate-700' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">لوحة القيادة</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className={`w-11 h-11 rounded-xl ${c.color} text-white flex items-center justify-center mb-3`}>
              <c.icon size={22} />
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{Number(c.value).toLocaleString('ar-EG')}</div>
            <div className="text-xs text-slate-400 font-bold mt-1">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
