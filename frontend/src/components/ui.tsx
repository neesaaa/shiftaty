import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin text-brand-500', className)} />
}

export function PageLoader({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
      <Spinner className="w-8 h-8" />
      <p className="text-sm font-bold">{label}</p>
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {icon && <div className="mb-4 text-brand-300">{icon}</div>}
      <h3 className="text-lg font-extrabold text-slate-700">{title}</h3>
      {hint && <p className="mt-1 text-sm text-slate-400 max-w-sm">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

const listingStatusMap: Record<string, { label: string; cls: string }> = {
  Draft: { label: 'مسودة', cls: 'bg-slate-100 text-slate-600' },
  Published: { label: 'منشور', cls: 'bg-emerald-100 text-emerald-700' },
  Paused: { label: 'متوقف', cls: 'bg-amber-100 text-amber-700' },
  Selected: { label: 'تم الاختيار', cls: 'bg-brand-100 text-brand-700' },
  Expired: { label: 'منتهٍ', cls: 'bg-slate-100 text-slate-500' },
  Cancelled: { label: 'ملغي', cls: 'bg-rose-100 text-rose-600' },
  Completed: { label: 'مكتمل', cls: 'bg-scrub-100 text-scrub-700' },
}

const listingStatusByNum = ['Draft', 'Published', 'Paused', 'Selected', 'Expired', 'Cancelled', 'Completed']
const requestStatusByNum = ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Expired']
const requestStatusMap: Record<string, { label: string; cls: string }> = {
  Pending: { label: 'معلّق', cls: 'bg-amber-100 text-amber-700' },
  Accepted: { label: 'مقبول', cls: 'bg-emerald-100 text-emerald-700' },
  Rejected: { label: 'مرفوض', cls: 'bg-rose-100 text-rose-600' },
  Cancelled: { label: 'ملغي', cls: 'bg-slate-100 text-slate-500' },
  Expired: { label: 'منتهٍ', cls: 'bg-slate-100 text-slate-500' },
}

export function ListingStatusBadge({ status }: { status: number | string }) {
  const key = typeof status === 'number' ? listingStatusByNum[status] : status
  const m = listingStatusMap[key] ?? { label: String(status), cls: 'bg-slate-100 text-slate-600' }
  return <span className={clsx('badge', m.cls)}>{m.label}</span>
}

export function RequestStatusBadge({ status }: { status: number | string }) {
  const key = typeof status === 'number' ? requestStatusByNum[status] : status
  const m = requestStatusMap[key] ?? { label: String(status), cls: 'bg-slate-100 text-slate-600' }
  return <span className={clsx('badge', m.cls)}>{m.label}</span>
}

export function formatDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}
