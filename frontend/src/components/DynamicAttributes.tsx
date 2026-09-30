import type { AttributeDefinition, AttributeValue } from '../types'

interface Props {
  definitions: AttributeDefinition[]
  values: Record<string, AttributeValue>
  onChange: (values: Record<string, AttributeValue>) => void
}

// DataType enum numeric mapping from backend
const T = {
  Text: 0, LongText: 1, Number: 2, Decimal: 3, Boolean: 4, Date: 5,
  DateTime: 6, Time: 7, Select: 8, MultiSelect: 9, Range: 10, Currency: 11,
}

function typeOf(d: AttributeDefinition): number {
  return typeof d.dataType === 'number' ? d.dataType : (T as Record<string, number>)[d.dataType] ?? 0
}

export default function DynamicAttributes({ definitions, values, onChange }: Props) {
  function set(defId: string, patch: Partial<AttributeValue>) {
    onChange({
      ...values,
      [defId]: { attributeDefinitionId: defId, ...values[defId], ...patch },
    })
  }

  if (definitions.length === 0) return null

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {definitions.map((d) => {
        const t = typeOf(d)
        const v = values[d.id]
        return (
          <div key={d.id} className={t === T.LongText ? 'sm:col-span-2' : ''}>
            <label className="label">
              {d.nameAr} {d.isRequired && <span className="text-rose-500">*</span>}
            </label>

            {(t === T.Text || t === T.Time) && (
              <input className="input" value={v?.text ?? ''} onChange={(e) => set(d.id, { text: e.target.value })} />
            )}

            {t === T.LongText && (
              <textarea className="input min-h-[80px]" value={v?.text ?? ''} onChange={(e) => set(d.id, { text: e.target.value })} />
            )}

            {(t === T.Number || t === T.Decimal || t === T.Currency || t === T.Range) && (
              <input
                type="number"
                className="input"
                value={v?.number ?? ''}
                onChange={(e) => set(d.id, { number: e.target.value === '' ? null : Number(e.target.value) })}
              />
            )}

            {t === T.Boolean && (
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-brand-600"
                  checked={!!v?.boolean}
                  onChange={(e) => set(d.id, { boolean: e.target.checked })}
                />
                <span className="text-sm text-slate-600 font-bold">نعم</span>
              </label>
            )}

            {(t === T.Date || t === T.DateTime) && (
              <input type="date" className="input" value={v?.date?.slice(0, 10) ?? ''} onChange={(e) => set(d.id, { date: e.target.value || null })} />
            )}

            {t === T.Select && (
              <select className="input" value={v?.text ?? ''} onChange={(e) => set(d.id, { text: e.target.value })}>
                <option value="">اختر...</option>
                {d.options.map((o) => (
                  <option key={o.id} value={o.value}>
                    {o.labelAr}
                  </option>
                ))}
              </select>
            )}

            {t === T.MultiSelect && (
              <div className="flex flex-wrap gap-2 mt-1">
                {d.options.map((o) => {
                  const selected = (v?.json ? JSON.parse(v.json) : []) as string[]
                  const on = selected.includes(o.value)
                  return (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => {
                        const next = on ? selected.filter((x) => x !== o.value) : [...selected, o.value]
                        set(d.id, { json: JSON.stringify(next) })
                      }}
                      className={`badge cursor-pointer ${on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {o.labelAr}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
