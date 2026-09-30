import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Home, Store, PlusCircle, Wallet as WalletIcon, Bell, LogOut, Scissors, ShieldCheck, Handshake,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useAuth } from '../store/auth'
import { http, unwrap } from '../api/client'
import Coin from './Coin'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

// Simple, mobile-first primary navigation — no sidebar, just Home / Buy / Sell / Deals / Wallet.
const bottomNav: NavItem[] = [
  { to: '/', label: 'الرئيسية', icon: Home, end: true },
  { to: '/market', label: 'شراء', icon: Store },
  { to: '/listings/new', label: 'بيع', icon: PlusCircle },
  { to: '/deals', label: 'الصفقات', icon: Handshake },
  { to: '/wallet', label: 'المشرط', icon: WalletIcon },
]

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const { data: unread } = useQuery({
    queryKey: ['unread'],
    queryFn: () => unwrap<{ count: number }>(http.get('/notifications/unread-count')),
    refetchInterval: 30000,
  })

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-3xl px-4 h-16 flex items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-soft">
              <Scissors className="text-white -rotate-90" size={22} />
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-brand-800 text-lg">شيفتاتي</div>
              <div className="text-[10px] text-slate-400 font-bold">سوق المناوبات الطبية</div>
            </div>
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-3">
            <Coin amount={user?.balance ?? 0} size="md" showName />
            <NavLink to="/notifications" className="relative btn-ghost p-2">
              <Bell size={20} />
              {!!unread?.count && (
                <span className="absolute -top-0.5 -left-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unread.count}
                </span>
              )}
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className="btn-ghost p-2" title="لوحة الإدارة">
                <ShieldCheck size={20} />
              </NavLink>
            )}
            <button onClick={handleLogout} className="btn-ghost p-2" title="تسجيل الخروج">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl w-full flex-1 px-4 pt-6 pb-24">
        <main className="animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Primary navigation — always bottom, mobile-first */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-3xl grid grid-cols-5">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition',
                  isActive ? 'text-brand-700' : 'text-slate-400',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('flex items-center justify-center w-10 h-7 rounded-full transition', isActive && 'bg-brand-50')}>
                    <item.icon size={20} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

