import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, ChevronLeft } from 'lucide-react'
import { http, unwrap, apiError } from '../api/client'
import type { AttributeDefinition, AttributeValue, CategoryNode, Listing } from '../types'
import CategoryPicker from '../components/CategoryPicker'
import DynamicAttributes from '../components/DynamicAttributes'
import Coin from '../components/Coin'
import { Spinner } from '../components/ui'

export default function CreateListing() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState<CategoryNode | null>(null)
  const [definitions, setDefinitions] = useState<AttributeDefinition[]>([])
  const [attrValues, setAttrValues] = useState<Record<string, AttributeValue>>({})
  const [form, setForm] = useState({
    title: '', description: '', price: '', currency: 'EGP', location: '', governorate: '', city: '',
    availableFrom: '', availableTo: '', shiftTiming: 'Day', shiftDuration: 'Full',
  })

  useEffect(() => {
    if (category) {
      unwrap<AttributeDefinition[]>(http.get(`/categories/${category.id}/attributes`)).then(setDefinitions)
    } else {
      setDefinitions([])
    }
  }, [category])

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const create = useMutation({
    mutationFn: async (publish: boolean) => {
      const payload = {
        categoryNodeId: category!.id,
        title: form.title,
        description: form.description,
        price: Number(form.price) || 0,
        currency: form.currency,
        location: form.location || null,
        governorate: form.governorate || null,
        city: form.city || null,
        // Backend enums are serialized/bound as numbers (no string enum converter configured).
        shiftTiming: form.shiftTiming === 'Day' ? 0 : 1,
        shiftDuration: form.shiftDuration === 'Full' ? 0 : 1,
        availableFrom: form.availableFrom || null,
        availableTo: form.availableTo || null,
        attributes: Object.values(attrValues),
        imageUrls: [],
      }
      const listing = await unwrap<Listing>(http.post('/listings', payload))
      if (publish) await http.post(`/listings/${listing.id}/publish`)
      return listing
    },
    onSuccess: (_l, publish) => {
      toast.success(publish ? 'تم نشر العرض وخصم 1 مشرط' : 'تم حفظ العرض كمسودة')
      navigate('/my-listings')
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const steps = ['القسم', 'التفاصيل', 'المعاينة']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">إضافة عرض جديد</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {step > i + 1 ? <Check size={16} /> : i + 1}
            </div>
            <span className={`text-sm font-bold ${step === i + 1 ? 'text-brand-700' : 'text-slate-400'}`}>{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-0.5 bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="card p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="label">اختر القسم المناسب</label>
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
            <button className="btn-primary w-full py-3" disabled={!category} onClick={() => setStep(2)}>
              التالي <ChevronLeft size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="label">عنوان العرض *</label>
              <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="مثال: مناوبة ليلية - عناية مركزة" />
            </div>
            <div>
              <label className="label">الوصف *</label>
              <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">السعر *</label>
                <input className="input" type="number" value={form.price} onChange={(e) => set('price', e.target.value)} />
              </div>
              <div>
                <label className="label">العملة</label>
                <select className="input" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                  <option value="EGP">جنيه مصري</option>
                  <option value="SAR">ريال سعودي</option>
                  <option value="USD">دولار</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">المحافظة</label><input className="input" value={form.governorate} onChange={(e) => set('governorate', e.target.value)} /></div>
              <div><label className="label">المدينة/الموقع</label><input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">التوقيت</label>
                <select className="input" value={form.shiftTiming} onChange={(e) => set('shiftTiming', e.target.value)}>
                  <option value="Day">نهاري (Day)</option>
                  <option value="Night">ليلي (Night)</option>
                </select>
              </div>
              <div>
                <label className="label">نوع الدوام</label>
                <select className="input" value={form.shiftDuration} onChange={(e) => set('shiftDuration', e.target.value)}>
                  <option value="Full">كامل (Full)</option>
                  <option value="Part">جزئي (Part)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">متاح من</label><input className="input" type="date" value={form.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} /></div>
              <div><label className="label">متاح إلى</label><input className="input" type="date" value={form.availableTo} onChange={(e) => set('availableTo', e.target.value)} /></div>
            </div>

            {definitions.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-extrabold text-slate-700 mb-3">خصائص {category?.nameAr}</h3>
                <DynamicAttributes definitions={definitions} values={attrValues} onChange={setAttrValues} />
              </div>
            )}

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep(1)}>رجوع</button>
              <button className="btn-primary flex-1" disabled={!form.title || !form.description || !form.price} onClick={() => setStep(3)}>معاينة</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-800">{form.title}</h3>
                <span className="badge bg-brand-50 text-brand-700">{category?.nameAr}</span>
              </div>
              <p className="text-sm text-slate-500 whitespace-pre-wrap">{form.description}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="badge bg-slate-100 text-slate-600">{form.shiftTiming === 'Day' ? 'نهاري' : 'ليلي'}</span>
                <span className="badge bg-slate-100 text-slate-600">{form.shiftDuration === 'Full' ? 'كامل' : 'جزئي'}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold">السعر</span>
                <span className="font-extrabold">{Number(form.price).toLocaleString('ar-EG')} {form.currency}</span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm font-bold flex items-center gap-2">
              نشر العرض يكلّف <Coin amount={1} size="sm" /> من رصيدك.
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep(2)} disabled={create.isPending}>رجوع</button>
              <button className="btn-ghost flex-1 border border-slate-200" onClick={() => create.mutate(false)} disabled={create.isPending}>حفظ كمسودة</button>
              <button className="btn-primary flex-1" onClick={() => create.mutate(true)} disabled={create.isPending}>
                {create.isPending ? <Spinner className="w-5 h-5 text-white" /> : 'نشر العرض'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
