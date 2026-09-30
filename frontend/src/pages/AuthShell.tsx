import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Scissors } from 'lucide-react'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/landing" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-card">
            <Scissors className="text-white -rotate-90" size={26} />
          </div>
          <div>
            <div className="font-extrabold text-brand-800 text-xl">شيفتاتي</div>
            <div className="text-[11px] text-slate-400 font-bold">سوق المناوبات الطبية</div>
          </div>
        </Link>
        <div className="card p-7 animate-pop">
          <h1 className="text-2xl font-extrabold text-slate-800 text-center">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-400 text-center">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
