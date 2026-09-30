import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { User, Mail, Lock, Phone } from 'lucide-react'
import AuthShell from './AuthShell'
import { http, apiError } from '../api/client'
import { Spinner } from '../components/ui'

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين')
      return
    }
    setLoading(true)
    try {
      const res = await http.post('/auth/register', form)
      const devOtp = res.data.data?.devOtp
      toast.success('تم إنشاء الحساب! تحقق من بريدك.')
      navigate('/verify-otp', { state: { email: form.email, devOtp } })
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="إنشاء حساب" subtitle="ابدأ رحلتك مع ١٠٠ مشرط مجانًا">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">الاسم الكامل</label>
          <div className="relative">
            <User size={18} className="absolute right-3 top-3 text-slate-400" />
            <input className="input pr-10" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="د. أحمد نصار" />
          </div>
        </div>
        <div>
          <label className="label">البريد الإلكتروني</label>
          <div className="relative">
            <Mail size={18} className="absolute right-3 top-3 text-slate-400" />
            <input className="input pr-10" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
          </div>
        </div>
        <div>
          <label className="label">رقم الجوال</label>
          <div className="relative">
            <Phone size={18} className="absolute right-3 top-3 text-slate-400" />
            <input className="input pr-10" type="tel" required value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="05xxxxxxxx" />
          </div>
        </div>
        <div>
          <label className="label">كلمة المرور</label>
          <div className="relative">
            <Lock size={18} className="absolute right-3 top-3 text-slate-400" />
            <input className="input pr-10" type="password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="8 أحرف على الأقل" />
          </div>
        </div>
        <div>
          <label className="label">تأكيد كلمة المرور</label>
          <div className="relative">
            <Lock size={18} className="absolute right-3 top-3 text-slate-400" />
            <input className="input pr-10" type="password" required value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <button className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner className="w-5 h-5 text-white" /> : 'إنشاء الحساب'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        لديك حساب؟ <Link to="/login" className="link">تسجيل الدخول</Link>
      </p>
    </AuthShell>
  )
}
