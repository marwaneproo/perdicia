import { TrendingDown, TrendingUp } from 'lucide-react'
import type { Kpi } from '../types'
import { money, num, pct } from '../utils/format'

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  const isGrowth = kpi.format === 'percent'
  const value = kpi.format === 'currency' ? money(kpi.value) : isGrowth ? pct(kpi.value) : num(kpi.value)
  return (
    <div className="card p-5 transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className={`text-2xl font-semibold ${isGrowth ? (kpi.value >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-slate-900'}`}>{value}</p>
        {isGrowth && (kpi.value >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />)}
      </div>
    </div>
  )
}
