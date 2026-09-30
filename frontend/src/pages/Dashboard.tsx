import { Link } from 'react-router-dom'
import { Store, Search, ArrowLeft } from 'lucide-react'
import { useAuth } from '../store/auth'
import Coin from '../components/Coin'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center pt-2 sm:pt-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">مرحبًا، {user?.fullName} 👋</h1>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">ماذا تريد أن تفعل اليوم؟</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white border border-slate-100 px-4 py-2 shadow-sm">
          <span className="text-sm text-slate-400 font-bold">رصيدك</span>
          <Coin amount={user?.balance ?? 0} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Sell */}
        <Link
          to="/listings/new"
          className="group card p-6 sm:p-8 flex flex-col items-center text-center gap-4 border-2 border-transparent hover:border-brand-300 active:scale-[0.99] hover:shadow-lg transition"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-105 transition">
            <Store className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">أريد أن أبيع</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              انشر وردية أو خدمة وأضف كل بياناتها، وسيصلك المشترون المهتمون.
            </p>
          </div>
          <span className="btn-primary mt-1 group-hover:gap-3">
            إضافة عرض <ArrowLeft size={16} />
          </span>
        </Link>

        {/* Buy */}
        <Link
          to="/market"
          className="group card p-6 sm:p-8 flex flex-col items-center text-center gap-4 border-2 border-transparent hover:border-scrub-300 active:scale-[0.99] hover:shadow-lg transition"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-scrub-50 text-scrub-600 flex items-center justify-center group-hover:scale-105 transition">
            <Search className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">أريد أن أشتري</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              ابحث في الورديات والخدمات المتاحة وفلترها حسب احتياجك تمامًا.
            </p>
          </div>
          <span className="btn-secondary mt-1 group-hover:gap-3">
            تصفّح السوق <ArrowLeft size={16} />
          </span>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
        <Link to="/my-listings" className="link">عروضي</Link>
        <Link to="/incoming" className="link">الطلبات الواردة</Link>
        <Link to="/deals" className="link">صفقاتي</Link>
        <Link to="/wallet" className="link">محفظتي</Link>
      </div>
    </div>
  )
}
