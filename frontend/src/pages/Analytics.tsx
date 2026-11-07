import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import KpiCard from '../components/KpiCard'
import NoDataset from '../components/NoDataset'
import { ErrorState, Loading } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useDataset } from '../hooks/useDataset'
import { api } from '../services/api'
import type { PageId } from '../layouts/AppLayout'

export default function Analytics({ go }: { go: (p: PageId) => void }) {
  const { dataset } = useDataset()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('')
  const { data, loading, error } = useAsync(
    () => dataset ? api.analysis(dataset.id, { date_from: from || undefined, date_to: to || undefined, category: category || undefined }) : Promise.resolve(null),
    [dataset?.id, from, to, category],
  )
  if (!dataset) return <NoDataset go={go} />
  const f = data?.filters

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-end gap-4 p-4">
        <div><label className="block text-xs font-medium text-slate-500">From</label>
          <input type="date" className="input" value={from} min={f?.date_min ?? undefined} max={f?.date_max ?? undefined} onChange={e => setFrom(e.target.value)} disabled={!f?.date_min} /></div>
        <div><label className="block text-xs font-medium text-slate-500">To</label>
          <input type="date" className="input" value={to} min={f?.date_min ?? undefined} max={f?.date_max ?? undefined} onChange={e => setTo(e.target.value)} disabled={!f?.date_min} /></div>
        <div><label className="block text-xs font-medium text-slate-500">{f?.category_label ?? 'Group'}</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)} disabled={!f?.categories.length}>
            <option value="">All groups</option>
            {f?.categories.map(c => <option key={c}>{c}</option>)}
          </select></div>
        <button className="btn-secondary" onClick={() => { setFrom(''); setTo(''); setCategory('') }}>Reset filters</button>
        {data && <p className="ml-auto text-sm text-slate-500">{data.filtered_rows.toLocaleString()} rows match</p>}
      </div>

      {loading && <Loading label="Updating charts…" />}
      {error && <ErrorState message={error} />}
      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{data.kpis.map(k => <KpiCard key={k.key} kpi={k} />)}</div>
          <div className="grid gap-6 lg:grid-cols-2">{data.charts.map(c => <ChartCard key={c.id} spec={c} />)}</div>
          {data.charts.length === 0 && <div className="card flex items-start gap-3 p-5 text-sm text-slate-600"><BarChart3 className="h-5 w-5 shrink-0 text-brand-600" /><div><p className="font-medium text-slate-900">No suitable visualizations for these filters</p><p className="mt-1">Try widening the filters or reviewing the detected column types in Data Management.</p></div></div>}
          {data.notes.length > 0 && <div className="card p-4 text-sm text-slate-600"><ul className="list-disc pl-5">{data.notes.map(n => <li key={n}>{n}</li>)}</ul></div>}
        </>
      )}
    </div>
  )
}
