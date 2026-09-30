import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { http, unwrap, apiError } from '../api/client'
import type { AttributeDefinition, AttributeValue, CategoryNode } from '../types'
import CategoryPicker from '../components/CategoryPicker'
import DynamicAttributes from '../components/DynamicAttributes'
import { Spinner } from '../components/ui'

export default function CreateRequest() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<CategoryNode | null>(null)
  const [definitions, setDefinitions] = useState<AttributeDefinition[]>([])
  const [attrValues, setAttrValues] = useState<Record<string, AttributeValue>>({})
  const [form, setForm] = useState({ title: '', description: '', budgetMin: '', budgetMax: '', location: '', expiresAt: '' })

  useEffect(() => {
    if (category) unwrap<AttributeDefinition[]>(http.get(`/categories/${category.id}/attributes`)).then(setDefinitions)
    else setDefinitions([])
  }, [category])

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const create = useMutation({
    mutationFn: () =>
      http.post('/requests', {
        categoryNodeId: category!.id,
        title: form.title,
        description: form.description,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
        location: form.location || null,
        expiresAt: form.expiresAt || null,
        attributes: Object.values(attrValues),
      }),
    onSuccess: () => {
      toast.success('تم إنشاء الطلب')
      navigate('/my-requests')
    },
    onError: (e) => toast.error(apiError(e)),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">طلب جديد</h1>

      <div className="card p-6 space-y-5">
        <div>
          <label className="label">القسم المطلوب</label>
          <CategoryPicker value={category} onChange={setCategory} />
        </div>

        <div>
          <label className="label">عنوان الطلب *</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="مثال: أبحث عن مناوبة عناية مركزة" />
        </div>
        <div>
          <label className="label">التفاصيل *</label>
          <textarea className="input min-h-[90px]" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">الميزانية من</label><input className="input" type="number" value={form.budgetMin} onChange={(e) => set('budgetMin', e.target.value)} /></div>
          <div><label className="label">الميزانية إلى</label><input className="input" type="number" value={form.budgetMax} onChange={(e) => set('budgetMax', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">الموقع</label><input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
          <div><label className="label">ينتهي في</label><input className="input" type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></div>
        </div>

        {definitions.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-extrabold text-slate-700 mb-3">خصائص {category?.nameAr}</h3>
            <DynamicAttributes definitions={definitions} values={attrValues} onChange={setAttrValues} />
          </div>
        )}

        <button className="btn-primary w-full py-3" disabled={!category || !form.title || !form.description || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <Spinner className="w-5 h-5 text-white" /> : 'إنشاء الطلب'}
        </button>
      </div>
    </div>
  )
}
