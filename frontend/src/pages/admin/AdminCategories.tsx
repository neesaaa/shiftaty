import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, ChevronLeft, Power, FolderTree, Pencil, Trash2 } from 'lucide-react'
import { http, unwrap, apiError } from '../../api/client'
import type { CategoryNode } from '../../types'
import { PageLoader } from '../../components/ui'
import clsx from 'clsx'

export default function AdminCategories() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-tree'], queryFn: () => unwrap<CategoryNode[]>(http.get('/categories/tree')) })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [addUnder, setAddUnder] = useState<{ parentId: string | null; parentName: string } | null>(null)
  const [editing, setEditing] = useState<CategoryNode | null>(null)
  const [deleting, setDeleting] = useState<CategoryNode | null>(null)
  const [name, setName] = useState('')

  const create = useMutation({
    mutationFn: () => http.post('/categories', { parentId: addUnder!.parentId, nameAr: name, nameEn: name, nodeType: 'option', sortOrder: 0 }),
    onSuccess: () => {
      toast.success('تمت الإضافة')
      setAddUnder(null); setName('')
      qc.invalidateQueries({ queryKey: ['admin-tree'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const update = useMutation({
    mutationFn: () => http.put(`/categories/${editing!.id}`, { nameAr: name, nameEn: name, isActive: editing!.isActive, sortOrder: editing!.sortOrder }),
    onSuccess: () => {
      toast.success('تم الحفظ')
      setEditing(null); setName('')
      qc.invalidateQueries({ queryKey: ['admin-tree'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const toggle = useMutation({
    mutationFn: (n: CategoryNode) => http.put(`/categories/${n.id}`, { nameAr: n.nameAr, nameEn: n.nameEn, isActive: !n.isActive, sortOrder: n.sortOrder }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tree'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const remove = useMutation({
    mutationFn: (n: CategoryNode) => http.delete(`/categories/${n.id}/permanent`),
    onSuccess: () => {
      toast.success('تم الحذف نهائيًا')
      setDeleting(null)
      qc.invalidateQueries({ queryKey: ['admin-tree'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading || !data) return <PageLoader />

  const byParent = (pid: string | null) => data.filter((n) => n.parentId === pid).sort((a, b) => a.sortOrder - b.sortOrder)

  function Node({ node, depth }: { node: CategoryNode; depth: number }) {
    const children = byParent(node.id)
    const isOpen = expanded.has(node.id)
    return (
      <div>
        <div className="flex items-center gap-2 rounded-xl hover:bg-slate-50 px-2 py-2" style={{ paddingRight: depth * 20 + 8 }}>
          {children.length > 0 ? (
            <button
              onClick={() => setExpanded((s) => { const n = new Set(s); n.has(node.id) ? n.delete(node.id) : n.add(node.id); return n })}
              className="text-slate-400"
            >
              <ChevronLeft size={16} className={clsx('transition', isOpen && '-rotate-90')} />
            </button>
          ) : (
            <span className="w-4" />
          )}
          <FolderTree size={16} className="text-brand-400" />
          <span className={clsx('font-bold', node.isActive ? 'text-slate-700' : 'text-slate-300 line-through')}>{node.nameAr}</span>
          <span className="badge bg-slate-100 text-slate-400 text-[10px]">مستوى {node.level}</span>
          <div className="mr-auto flex gap-1">
            <button className="btn-ghost text-xs" onClick={() => setAddUnder({ parentId: node.id, parentName: node.nameAr })}><Plus size={14} /> فرعي</button>
            <button className="btn-ghost text-xs" onClick={() => { setEditing(node); setName(node.nameAr) }}><Pencil size={14} /></button>
            <button className="btn-ghost text-xs" onClick={() => toggle.mutate(node)}><Power size={14} /></button>
            <button className="btn-ghost text-xs text-rose-500" onClick={() => setDeleting(node)}><Trash2 size={14} /></button>
          </div>
        </div>
        {isOpen && children.map((c) => <Node key={c.id} node={c} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">شجرة الأقسام</h1>
        <button className="btn-primary" onClick={() => setAddUnder({ parentId: null, parentName: 'الجذر' })}><Plus size={18} /> قسم رئيسي</button>
      </div>

      <div className="card p-3">
        {byParent(null).map((n) => <Node key={n.id} node={n} depth={0} />)}
      </div>

      {addUnder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAddUnder(null)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-extrabold text-slate-800 mb-4">إضافة قسم تحت: {addUnder.parentName}</h2>
            <input className="input" placeholder="اسم القسم" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setAddUnder(null)}>إلغاء</button>
              <button className="btn-primary flex-1" disabled={!name || create.isPending} onClick={() => create.mutate()}>إضافة</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-extrabold text-slate-800 mb-4">تعديل: {editing.nameAr}</h2>
            <input className="input" placeholder="اسم القسم" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setEditing(null)}>إلغاء</button>
              <button className="btn-primary flex-1" disabled={!name || update.isPending} onClick={() => update.mutate()}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-extrabold text-slate-800 mb-2">حذف "{deleting.nameAr}" نهائيًا؟</h2>
            <p className="text-sm text-slate-500 mb-4">سيتم حذف هذا القسم وكل ما تحته من أقسام فرعية نهائيًا. لا يمكن التراجع عن هذا الإجراء، ولن يُسمح بالحذف إذا كان مستخدمًا في عروض أو طلبات حالية.</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setDeleting(null)}>إلغاء</button>
              <button className="btn-primary flex-1 bg-rose-600 hover:bg-rose-700" disabled={remove.isPending} onClick={() => remove.mutate(deleting)}>حذف نهائي</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

