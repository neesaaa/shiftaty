import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowDownCircle, ArrowUpCircle, Wallet as WalletIcon } from 'lucide-react'
import { http, unwrap, apiError } from '../api/client'
import { useAuth } from '../store/auth'
import type { Paged, WalletTransaction } from '../types'
import { PageLoader, EmptyState, formatDate } from '../components/ui'
import Coin from '../components/Coin'

const typeLabels: Record<string, string> = {
  TrialCredit: 'رصيد تجريبي',
  ListingPublish: 'نشر عرض',
  DealAcceptedSeller: 'قبول صفقة (بائع)',
  DealAcceptedBuyer: 'قبول صفقة (مشتري)',
  Refund: 'استرداد',
  AdminAdjustment: 'تعديل إداري',
  Topup: 'شحن رصيد',
}
const typeByNum = ['TrialCredit', 'ListingPublish', 'DealAcceptedSeller', 'DealAcceptedBuyer', 'Refund', 'AdminAdjustment', 'Topup']

const packages = [50, 150, 300, 500, 1000]

export default function WalletPage() {
  const { user, refreshUser } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['wallet-tx'],
    queryFn: () => unwrap<Paged<WalletTransaction>>(http.get('/wallet/transactions', { params: { pageSize: 50 } })),
  })

  const topup = useMutation({
    mutationFn: (amount: number) => http.post('/wallet/topup', { amount }),
    onSuccess: async () => {
      toast.success('تم شحن رصيدك بنجاح')
      await refreshUser()
      qc.invalidateQueries({ queryKey: ['wallet-tx'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">المحفظة</h1>

      <div className="card p-6 bg-gradient-to-l from-brand-600 to-brand-700 text-white">
        <div className="flex items-center gap-2 text-brand-100 font-bold text-sm">
          <WalletIcon size={18} /> رصيدك الحالي
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-4xl font-extrabold">{(user?.balance ?? 0).toLocaleString('ar-EG')}</span>
          <Coin size="lg" showName className="bg-white/20 text-white border-white/30" />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-extrabold text-slate-700 mb-1">شراء مشرط إضافي</h2>
        <p className="text-sm text-slate-400 mb-4">اختر باقة لشحن رصيدك فورًا.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {packages.map((amount) => (
            <button
              key={amount}
              className="rounded-xl border border-slate-200 p-4 text-center hover:border-brand-400 hover:bg-brand-50 transition disabled:opacity-50"
              disabled={topup.isPending}
              onClick={() => topup.mutate(amount)}
            >
              <div className="font-extrabold text-slate-800 text-lg">{amount}</div>
              <div className="text-[11px] text-slate-400 font-bold">مشرط</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-extrabold text-slate-700 mb-4">سجل المعاملات</h2>
        {!data?.items.length ? (
          <EmptyState title="لا توجد معاملات" />
        ) : (
          <div className="divide-y divide-slate-100">
            {data.items.map((t) => {
              const key = typeof t.type === 'number' ? typeByNum[t.type] : (t.type as string)
              const positive = t.amount >= 0
              return (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <div className={positive ? 'text-emerald-500' : 'text-rose-500'}>
                    {positive ? <ArrowUpCircle size={26} /> : <ArrowDownCircle size={26} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-700 text-sm">{typeLabels[key] ?? key}</div>
                    <div className="text-xs text-slate-400">{t.descriptionAr} · {formatDate(t.createdAt)}</div>
                  </div>
                  <div className={`font-extrabold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {positive ? '+' : ''}{t.amount}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

