import { Scissors } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  amount?: number
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 14, text: 'text-sm', pad: 'px-2 py-0.5' },
  md: { icon: 18, text: 'text-base', pad: 'px-3 py-1' },
  lg: { icon: 24, text: 'text-xl', pad: 'px-4 py-1.5' },
}

/** The "مشرط" (scalpel) coin — represented with a scissors/surgical icon. */
export default function Coin({ amount, size = 'md', showName = false, className }: Props) {
  const s = sizes[size]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-scrub-100 to-brand-100 font-extrabold text-brand-800 border border-brand-200',
        s.pad,
        s.text,
        className,
      )}
      title="مشرط — عملة المنصة"
    >
      <Scissors size={s.icon} className="text-scrub-600 -rotate-90" />
      {amount !== undefined && <span>{amount.toLocaleString('ar-EG')}</span>}
      {showName && <span className="text-brand-600 font-bold">مشرط</span>}
    </span>
  )
}
