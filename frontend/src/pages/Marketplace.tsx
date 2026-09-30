import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, MapPin, SlidersHorizontal, X } from 'lucide-react'
import { http, unwrap } from '../api/client'
import type { CategoryNode, Listing, Paged } from '../types'
import CategoryPicker from '../components/CategoryPicker'
import Coin from '../components/Coin'
import { ListingStatusBadge, PageLoader, EmptyState, formatDate } from '../components/ui'

export default function Marketplace() {
  const [filters, setFilters] = useState({
    search: '', categoryId: '', shiftTiming: '', shiftDuration: '',
    minPrice: '', maxPrice: '', location: '', sortBy: 'newest', page: 1,
  })
  const [category, setCategory] = useState<CategoryNode | null>(null)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  const listings = useQuery({
    queryKey: ['market', filters],
    queryFn: () =>
      unwrap<Paged<Listing>>(
        http.get('/listings', {
          params: {
            search: filters.search || undefined,
            categoryId: filters.categoryId || undefined,
            // Backend enums are bound as numbers (no string enum converter configured).
            shiftTiming: filters.shiftTiming ? (filters.shiftTiming === 'Day' ? 0 : 1) : undefined,
            shiftDuration: filters.shiftDuration ? (filters.shiftDuration === 'Full' ? 0 : 1) : undefined,
            minPrice: filters.minPrice || undefined,
            maxPrice: filters.maxPrice || undefined,
            location: filters.location || undefined,
            sortBy: filters.sortBy === 'price_asc' ? 'price' : filters.sortBy === 'price_desc' ? 'price' : filters.sortBy,
            sortDirection: filters.sortBy === 'price_asc' ? 'asc' : filters.sortBy === 'price_desc' ? 'desc' : undefined,
            page: filters.page,
            pageSize: 12,
          },
        }),
      ),
  })

  function set<K extends keyof typeof filters>(k: K, v: (typeof filters)[K]) {
    setFilters((f) => ({ ...f, [k]: v, page: k === 'page' ? (v as number) : 1 }))
  }

  function selectCategory(node: CategoryNode | null) {
    setCategory(node)
    set('categoryId', node?.id ?? '')
    if (node) setShowCategoryPicker(false)
  }

  function clearCategory() {
    setCategory(null)
    set('categoryId', '')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">السوق</h1>
        <p className="text-slate-400 text-sm mt-1">تصفّح العروض المتاحة وابحث بالمرشحات</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute right-3 top-3 text-slate-400" />
          <input className="input pr-10" placeholder="ابحث عن عرض..." value={filters.search} onChange={(e) => set('search', e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            {category ? (
              <button type="button" className="input flex items-center justify-between text-right" onClick={() => setShowCategoryPicker((s) => !s)}>
                <span className="truncate">{category.nameAr}</span>
                <X size={16} className="text-slate-400 shrink-0" onClick={(e) => { e.stopPropagation(); clearCategory() }} />
              </button>
            ) : (
              <button type="button" className="input text-right text-slate-400" onClick={() => setShowCategoryPicker((s) => !s)}>
                كل الأقسام
              </button>
            )}
          </div>
          <select className="input" value={filters.shiftTiming} onChange={(e) => set('shiftTiming', e.target.value)}>
            <option value="">كل التوقيتات</option>
            <option value="Day">نهاري (Day)</option>
            <option value="Night">ليلي (Night)</option>
          </select>
          <select className="input" value={filters.shiftDuration} onChange={(e) => set('shiftDuration', e.target.value)}>
            <option value="">كل الأنواع</option>
            <option value="Full">كامل (Full)</option>
            <option value="Part">جزئي (Part)</option>
          </select>
          <input className="input" type="number" placeholder="أقل سعر" value={filters.minPrice} onChange={(e) => set('minPrice', e.target.value)} />
          <input className="input" type="number" placeholder="أعلى سعر" value={filters.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="الموقع" value={filters.location} onChange={(e) => set('location', e.target.value)} />
          <select className="input" value={filters.sortBy} onChange={(e) => set('sortBy', e.target.value)}>
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="price_asc">السعر: الأقل أولاً</option>
            <option value="price_desc">السعر: الأعلى أولاً</option>
          </select>
        </div>
        {showCategoryPicker && (
          <div className="rounded-xl border border-slate-100 p-4">
            <CategoryPicker value={category} onChange={selectCategory} />
          </div>
        )}
      </div>

      {listings.isLoading ? (
        <PageLoader />
      ) : !listings.data?.items.length ? (
        <EmptyState icon={<SlidersHorizontal size={48} />} title="لا توجد عروض مطابقة" hint="جرّب تغيير المرشحات أو البحث بكلمات أخرى." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.data.items.map((l) => (
              <Link key={l.id} to={`/listings/${l.id}`} className="card p-5 hover:shadow-card hover:-translate-y-0.5 transition group">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-slate-800 group-hover:text-brand-700 line-clamp-1">{l.title}</h3>
                  <ListingStatusBadge status={l.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500 line-clamp-2 min-h-[40px]">{l.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="badge bg-brand-50 text-brand-700">{l.categoryName}</span>
                  <span className="badge bg-slate-100 text-slate-600">{l.shiftTiming === 0 || l.shiftTiming === 'Day' ? 'نهاري' : 'ليلي'}</span>
                  <span className="badge bg-slate-100 text-slate-600">{l.shiftDuration === 0 || l.shiftDuration === 'Full' ? 'كامل' : 'جزئي'}</span>
                  {l.location && <span className="flex items-center gap-1"><MapPin size={12} /> {l.location}</span>}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-extrabold text-slate-800">{l.price.toLocaleString('ar-EG')} {l.currency}</span>
                  <span className="text-xs text-slate-400">{formatDate(l.publishedAt)}</span>
                </div>
              </Link>
            ))}
          </div>

          {listings.data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button className="btn-secondary" disabled={filters.page <= 1} onClick={() => set('page', filters.page - 1)}>السابق</button>
              <span className="text-sm font-bold text-slate-500">صفحة {filters.page} من {listings.data.totalPages}</span>
              <button className="btn-secondary" disabled={filters.page >= listings.data.totalPages} onClick={() => set('page', filters.page + 1)}>التالي</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
