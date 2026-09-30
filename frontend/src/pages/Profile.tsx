import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { UserCircle, KeyRound } from 'lucide-react'
import { http, unwrap, apiError } from '../api/client'
import { useAuth } from '../store/auth'
import Coin from '../components/Coin'
import { PageLoader } from '../components/ui'

interface ProfileData {
  id: string; fullName: string; email: string; phoneNumber?: string; city?: string; area?: string
  bio?: string; company?: string; roles: string[]; balance: number; emailConfirmed: boolean
}

export default function Profile() {
  const { refreshUser } = useAuth()
  const { data, isLoading, refetch } = useQuery({ queryKey: ['profile'], queryFn: () => unwrap<ProfileData>(http.get('/profile')) })
  const [form, setForm] = useState({ fullName: '', city: '', area: '', bio: '', company: '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })

  useEffect(() => {
    if (data) setForm({ fullName: data.fullName, city: data.city ?? '', area: data.area ?? '', bio: data.bio ?? '', company: data.company ?? '' })
  }, [data])

  const save = useMutation({
    mutationFn: () => http.put('/profile', { ...form, profileImage: null }),
    onSuccess: async () => {
      toast.success('تم تحديث الملف الشخصي')
      await refetch()
      await refreshUser()
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const changePw = useMutation({
    mutationFn: () => http.post('/auth/change-password', pw),
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور')
      setPw({ currentPassword: '', newPassword: '' })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading || !data) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">الملف الشخصي</h1>

      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600">
          <UserCircle size={40} />
        </div>
        <div className="flex-1">
          <div className="font-extrabold text-slate-800 text-lg">{data.fullName}</div>
          <div className="text-sm text-slate-400">{data.email}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {data.roles.map((r) => <span key={r} className="badge bg-slate-100 text-slate-600">{r}</span>)}
          </div>
        </div>
        <Coin amount={data.balance} size="lg" showName />
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-extrabold text-slate-700">تعديل البيانات</h2>
        <div><label className="label">الاسم الكامل</label><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">المدينة</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">المنطقة</label><input className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
        </div>
        <div><label className="label">جهة العمل</label><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
        <div><label className="label">نبذة</label><textarea className="input min-h-[70px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>حفظ التغييرات</button>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-extrabold text-slate-700 flex items-center gap-2"><KeyRound size={18} /> تغيير كلمة المرور</h2>
        <div><label className="label">كلمة المرور الحالية</label><input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
        <div><label className="label">كلمة المرور الجديدة</label><input className="input" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
        <button className="btn-secondary" disabled={changePw.isPending || !pw.currentPassword || pw.newPassword.length < 8} onClick={() => changePw.mutate()}>تغيير كلمة المرور</button>
      </div>
    </div>
  )
}
