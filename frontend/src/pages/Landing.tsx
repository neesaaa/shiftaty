import { Link } from 'react-router-dom'
import { Scissors, Stethoscope, Store, ClipboardList, ShieldCheck } from 'lucide-react'
import Coin from '../components/Coin'

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <Scissors className="text-white -rotate-90" size={22} />
          </div>
          <span className="font-extrabold text-brand-800 text-lg">شيفتاتي</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-secondary">تسجيل الدخول</Link>
          <Link to="/register" className="btn-primary">إنشاء حساب</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 text-brand-700 px-4 py-1.5 text-sm font-bold mb-6">
          <Stethoscope size={16} /> منصة عربية للكوادر الطبية
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 leading-tight">
          سوق <span className="text-brand-600">المناوبات</span> والخدمات الطبية
        </h1>
        <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
          انشر عروضك، تصفّح المناوبات، وأنشئ طلبات دقيقة — كل ذلك باستخدام عملة{' '}
          <Coin showName size="sm" /> الافتراضية. كل حساب جديد يبدأ بـ ١٠٠ مشرط مجانًا.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/register" className="btn-primary text-base px-6 py-3">ابدأ الآن مجانًا</Link>
          <Link to="/login" className="btn-secondary text-base px-6 py-3">لديك حساب؟</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 grid sm:grid-cols-3 gap-5">
        {[
          { icon: Store, title: 'انشر عروضك', desc: 'أضف تفاصيل دقيقة عبر تصنيفات مرنة غير محدودة العمق.' },
          { icon: ClipboardList, title: 'أنشئ طلبًا', desc: 'صف ما تحتاجه بدقة، ودع النظام يطابقك مع أفضل العروض.' },
          { icon: ShieldCheck, title: 'صفقات آمنة', desc: 'قبول مشترٍ واحد فقط لكل عرض، بمعاملات محمية بالكامل.' },
        ].map((f) => (
          <div key={f.title} className="card p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
              <f.icon size={24} />
            </div>
            <h3 className="font-extrabold text-slate-800">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
