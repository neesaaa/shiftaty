import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthShell from './AuthShell'
import { http, apiError } from '../api/client'
import { Spinner } from '../components/ui'

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [devOtp, setDevOtp] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function request(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await http.post('/auth/forgot-password', { email })
      setDevOtp(res.data.data?.devOtp)
      toast.success('إذا كان البريد مسجلاً، سيصلك رمز.')
      setStep(2)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await http.post('/auth/reset-password', { email, code, newPassword })
      toast.success('تم تغيير كلمة المرور!')
      navigate('/login')
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="استعادة كلمة المرور" subtitle={step === 1 ? 'أدخل بريدك الإلكتروني' : 'أدخل الرمز وكلمة المرور الجديدة'}>
      {step === 1 ? (
        <form onSubmit={request} className="space-y-4">
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button className="btn-primary w-full py-3" disabled={loading}>
            {loading ? <Spinner className="w-5 h-5 text-white" /> : 'إرسال الرمز'}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          {devOtp && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-amber-800 text-sm font-bold text-center">
              رمز التطوير: <span className="tracking-widest">{devOtp}</span>
            </div>
          )}
          <input className="input text-center tracking-widest" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="رمز التحقق" />
          <input className="input" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة المرور الجديدة" />
          <button className="btn-primary w-full py-3" disabled={loading}>
            {loading ? <Spinner className="w-5 h-5 text-white" /> : 'تغيير كلمة المرور'}
          </button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-slate-500">
        <Link to="/login" className="link">العودة لتسجيل الدخول</Link>
      </p>
    </AuthShell>
  )
}
