import { useEffect, useState } from 'react'
import { ChevronLeft, FolderTree, Check } from 'lucide-react'
import { http, unwrap } from '../api/client'
import type { CategoryNode } from '../types'
import { Spinner } from './ui'

interface Props {
  value: CategoryNode | null
  onChange: (node: CategoryNode | null) => void
}

/**
 * Progressive, unlimited-depth category selector.
 * Always asks the API for children — no hard-coded level assumptions.
 */
export default function CategoryPicker({ value, onChange }: Props) {
  const [path, setPath] = useState<CategoryNode[]>([])
  const [options, setOptions] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(false)

  async function loadRoot() {
    setLoading(true)
    try {
      setOptions(await unwrap<CategoryNode[]>(http.get('/categories/root')))
    } finally {
      setLoading(false)
    }
  }

  async function loadChildren(node: CategoryNode) {
    setLoading(true)
    try {
      return await unwrap<CategoryNode[]>(http.get(`/categories/${node.id}/children`))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoot()
  }, [])

  async function select(node: CategoryNode) {
    const children = await loadChildren(node)
    const newPath = [...path, node]
    setPath(newPath)
    if (children.length === 0 || !node.hasChildren) {
      // leaf reached
      onChange(node)
      setOptions([])
    } else {
      onChange(null)
      setOptions(children)
    }
  }

  async function goTo(index: number) {
    // index = -1 => root
    onChange(null)
    if (index < 0) {
      setPath([])
      await loadRoot()
      return
    }
    const newPath = path.slice(0, index + 1)
    setPath(newPath)
    const children = await loadChildren(newPath[newPath.length - 1])
    setOptions(children)
  }

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <button type="button" onClick={() => goTo(-1)} className="badge bg-brand-50 text-brand-700 hover:bg-brand-100">
          <FolderTree size={14} /> الأقسام
        </button>
        {path.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1.5">
            <ChevronLeft size={14} className="text-slate-300" />
            <button
              type="button"
              onClick={() => goTo(i)}
              className="badge bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-700"
            >
              {p.nameAr}
            </button>
          </span>
        ))}
      </div>

      {value ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 font-bold">
          <Check size={18} /> تم اختيار: {value.nameAr}
          <button type="button" className="link mr-auto text-sm" onClick={() => goTo(path.length - 2)}>
            تغيير
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => select(opt)}
              className="group rounded-xl border border-slate-200 bg-white px-4 py-3 text-right hover:border-brand-400 hover:bg-brand-50 transition flex items-center justify-between"
            >
              <span className="font-bold text-slate-700 group-hover:text-brand-700">{opt.nameAr}</span>
              {opt.hasChildren ? (
                <ChevronLeft size={16} className="text-slate-300 group-hover:text-brand-500" />
              ) : (
                <span className="badge bg-scrub-50 text-scrub-600 text-[10px]">اختيار</span>
              )}
            </button>
          ))}
          {options.length === 0 && <p className="col-span-full text-center text-sm text-slate-400 py-4">لا توجد أقسام.</p>}
        </div>
      )}
    </div>
  )
}
