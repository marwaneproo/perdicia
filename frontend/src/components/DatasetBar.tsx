import { Download, FileSpreadsheet } from 'lucide-react'
import { api } from '../services/api'
import type { Dataset } from '../types'

export function DemoBadge() {
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Demo data</span>
}

export function ExportButtons({ dataset }: { dataset: Dataset }) {
  return (
    <div className="flex gap-2">
      <a className="btn-secondary" href={api.exportUrl(dataset.id, 'csv')}><Download className="h-4 w-4" /> Export CSV</a>
      <a className="btn-primary" href={api.exportUrl(dataset.id, 'excel')}><FileSpreadsheet className="h-4 w-4" /> Export Excel</a>
    </div>
  )
}
