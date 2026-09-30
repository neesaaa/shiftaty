import { NavLink, Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, Users, FolderTree, Store, Handshake, Receipt, ScrollText, ArrowRight, Scissors } from 'lucide-react'
import { useAuth } from '../../store/auth'

const items = [
  { to: '/admin', label: 'لوحة القيادة', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'المستخدمون', icon: Users },
  { to: '/admin/categories', label: 'الأقسام', icon: FolderTree },
  { to: '/admin/listings', label: 'العروض', icon: Store },
  { to: '/admin/deals', label: 'الصفقات', icon: Handshake },
  { to: '/admin/transactions', label: 'المعاملات', icon: Receipt },
  { to: '/admin/audit', label: 'سجل التدقيق', icon: ScrollText },
]

export default function AdminLayout() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-scrub-800 text-white hidden md:flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center"><Scissors className="-rotate-90" size={18} /></div>
          <div>
            <div className="font-extrabold">شيفتاتي</div>
            <div className="text-[10px] text-scrub-200">لوحة الإدارة</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-white text-scrub-800' : 'text-scrub-100 hover:bg-white/10'}`
              }
            >
              <i.icon size={18} /> {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link to="/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-scrub-100 hover:bg-white/10">
            <ArrowRight size={18} /> العودة للتطبيق
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6">
          <h1 className="font-extrabold text-slate-700">مرحبًا، {user?.fullName}</h1>
          <Link to="/dashboard" className="btn-secondary text-sm md:hidden"><ArrowRight size={16} /> التطبيق</Link>
        </header>
        <main className="flex-1 p-6 overflow-x-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
