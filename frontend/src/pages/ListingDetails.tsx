import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MapPin, Calendar, User, Send, ArrowRight } from 'lucide-react'
import { http, unwrap, apiError } from '../api/client'
import type { Listing } from '../types'
import { useAuth } from '../store/auth'
import Coin from '../components/Coin'
import { ListingStatusBadge, PageLoader, formatDate } from '../components/ui'

export default function ListingDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [message, setMessage] = useState('')

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => unwrap<Listing>(http.get(`/listings/${id}`)),
    enabled: !!id,
  })

  const sendRequest = useMutation({
    mutationFn: () => http.post(`/listings/${id}/requests`, { message }),
    onSuccess: () => {
      toast.success('تم إرسال الطلب إلى البائع')
      setMessage('')
      qc.invalidateQueries({ queryKey: ['listing', id] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading || !listing) return <PageLoader />

  const isOwner = listing.sellerId === user?.id
  const canRequest = !isOwner && (listing.status === 1 || listing.status === 'Published')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost"><ArrowRight size={18} /> رجوع</button>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-slate-800">{listing.title}</h1>
          <ListingStatusBadge status={listing.status} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span className="badge bg-brand-50 text-brand-700">{listing.categoryName}</span>
          <span className="badge bg-slate-100 text-slate-600">{listing.shiftTiming === 0 || listing.shiftTiming === 'Day' ? 'نهاري' : 'ليلي'}</span>
          <span className="badge bg-slate-100 text-slate-600">{listing.shiftDuration === 0 || listing.shiftDuration === 'Full' ? 'كامل' : 'جزئي'}</span>
          <span className="flex items-center gap-1"><User size={14} /> {listing.sellerName}</span>
          {listing.location && <span className="flex items-center gap-1"><MapPin size={14} /> {listing.location}</span>}
          <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(listing.publishedAt)}</span>
        </div>

        <p className="mt-5 text-slate-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4">
          <span className="text-slate-500 font-bold">السعر</span>
          <span className="text-xl font-extrabold text-slate-800">{listing.price.toLocaleString('ar-EG')} {listing.currency}</span>
        </div>

        {(listing.availableFrom || listing.availableTo) && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="text-slate-400 text-xs">متاح من</div>
              <div className="font-bold text-slate-700">{formatDate(listing.availableFrom)}</div>
            </div>
            <div className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="text-slate-400 text-xs">متاح إلى</div>
              <div className="font-bold text-slate-700">{formatDate(listing.availableTo)}</div>
            </div>
          </div>
        )}
      </div>

      {canRequest && (
        <div className="card p-6">
          <h2 className="font-extrabold text-slate-700 mb-1">إرسال طلب على هذا العرض</h2>
          <p className="text-sm text-slate-400 mb-4">عند قبول البائع لك، سيُخصم <Coin amount={1} size="sm" /> من كل طرف.</p>
          <textarea className="input min-h-[90px]" placeholder="رسالة اختيارية للبائع..." value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="btn-primary mt-3 w-full py-3" disabled={sendRequest.isPending} onClick={() => sendRequest.mutate()}>
            <Send size={18} /> إرسال الطلب
          </button>
        </div>
      )}

      {isOwner && (
        <div className="card p-6 text-center text-sm text-slate-500">
          هذا عرضك. يمكنك إدارة الطلبات الواردة من صفحة <button className="link" onClick={() => navigate('/incoming')}>طلبات العملاء</button>.
        </div>
      )}
    </div>
  )
}
