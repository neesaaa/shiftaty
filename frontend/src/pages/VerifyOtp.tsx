import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ShieldCheck } from 'lucide-react'
import AuthShell from './AuthShell'
import { http, apiError } from '../api/client'
import { useAuth } from '../store/auth'
import type { AuthResult } from '../types'
import { Spinner } from '../components/ui'

export default function VerifyOtp() {
  const location = useLocation() as any
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [email] = useState<string>(location.state?.email ?? '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const devOtp: string | undefined = location.state?.devOtp

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await http.post('/auth/verify-otp', { email, code })
      const auth = res.data.data as AuthResult
      setSession(auth)
      toast.success('تم التحقق من الحساب!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    try {
      const res = await http.post('/auth/resend-otp', { email })
      const newOtp = res.data.data?.devOtp
      toast.success(newOtp ? `تم الإرسال (تطوير): ${newOtp}` : 'تم إعادة إرسال الرمز')
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  return (
    <AuthShell title="التحقق من الحساب" subtitle={`أدخل الرمز المُرسل إلى ${email || 'بريدك'}`}>
      {devOtp && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm font-bold text-center">
          <ShieldCheck className="inline ml-1" size={16} />
          رمز التطوير: <span className="text-lg tracking-widest">{devOtp}</span>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <input
          className="input text-center text-2xl tracking-[0.5em] font-extrabold"
          required
          maxLength={6}
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="______"
        />
        <button className="btn-primary w-full py-3" disabled={loading || code.length < 6}>
          {loading ? <Spinner className="w-5 h-5 text-white" /> : 'تأكيد'}
        </button>
      </form>
      <button onClick={resend} className="mt-4 w-full link text-sm">إعادة إرسال الرمز</button>
    </AuthShell>
  )
}
