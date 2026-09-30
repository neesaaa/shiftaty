import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock } from 'lucide-react'
import AuthShell from './AuthShell'
import { http, apiError, unwrap } from '../api/client'
import { useAuth } from '../store/auth'
import type { AuthResult } from '../types'
import { Spinner } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await http.post('/auth/login', { email, password })
      const data = res.data.data
      if (data?.requiresOtp) {
        toast('يرجى تأكيد بريدك الإلكتروني أولاً.')
        navigate('/verify-otp', { state: { email, devOtp: data.devOtp } })
        return
      }
      const auth = data as AuthResult
      setSession(auth)
      toast.success('تم تسجيل الدخول بنجاح')
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="تسجيل الدخول" subtitle="أهلاً بعودتك إلى شيفتاتي">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">البريد الإلكتروني</label>
          <div className="relative">
            <Mail size={18} className="absolute right-3 top-3 text-slate-400" />
            <input className="input pr-10" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </div>
        <div>
          <label className="label">كلمة المرور</label>
          <div className="relative">
            <Lock size={18} className="absolute right-3 top-3 text-slate-400" />
            <input className="input pr-10" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="link text-sm">نسيت كلمة المرور؟</Link>
        </div>
        <button className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner className="w-5 h-5 text-white" /> : 'دخول'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        ليس لديك حساب؟ <Link to="/register" className="link">إنشاء حساب جديد</Link>
      </p>
    </AuthShell>
  )
}
