import { BarChart3, CheckCircle2, Database } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import { DemoBadge, ExportButtons } from '../components/DatasetBar'
import KpiCard from '../components/KpiCard'
import NoDataset from '../components/NoDataset'
import { ErrorState, Loading } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useDataset } from '../hooks/useDataset'
import { api } from '../services/api'
import type { PageId } from '../layouts/AppLayout'

export default function Overview({ go }: { go: (p: PageId) => void }) {
  const { dataset, loading: dsLoading, error: dsError } = useDataset()
  const { data, loading, error } = useAsync(() => (dataset ? api.analysis(dataset.id) : Promise.resolve(null)), [dataset?.id])

  if (dsLoading) return <Loading />
  if (dsError && !dataset) return <ErrorState message={dsError} />
  if (!dataset) return <NoDataset go={go} />
  if (loading) return <Loading label="Analyzing dataset…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null
  const q = data.quality

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-xl font-semibold text-slate-900">{dataset.name}</h2>{dataset.is_demo ? <DemoBadge /> : null}</div>
          <p className="text-sm text-slate-500">{q.rows.toLocaleString()} rows · {q.columns} columns · uploaded {dataset.created_at}</p>
        </div>
        <ExportButtons dataset={dataset} />
      </div>

      {data.kpis.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{data.kpis.map(k => <KpiCard key={k.key} kpi={k} />)}</div>
      ) : <ErrorState message="No supported KPI could be computed from this dataset. Detected columns and charts are still available where possible." />}

      <div className="grid gap-6 lg:grid-cols-2">
        {data.charts.map(c => <ChartCard key={c.id} spec={c} />)}
      </div>
      {data.charts.length === 0 && <div className="card flex items-start gap-3 p-5 text-sm text-slate-600"><BarChart3 className="h-5 w-5 shrink-0 text-brand-600" /><div><p className="font-medium text-slate-900">No suitable visualizations detected</p><p className="mt-1">This dataset can still be explored. Review its column profile or import data with numeric, date, or categorical fields.</p></div></div>}
      {data.notes.length > 0 && (
        <div className="card p-4 text-sm text-slate-600">
          <p className="mb-1 font-medium text-slate-800">Visualizations not available</p>
          <ul className="list-disc pl-5">{data.notes.map(n => <li key={n}>{n}</li>)}</ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Database className="h-4 w-4 text-brand-600" /> Dataset information</h3>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">File</dt><dd className="truncate text-right">{dataset.filename}</dd>
            <dt className="text-slate-500">Rows / Columns</dt><dd className="text-right">{q.rows} / {q.columns}</dd>
            <dt className="text-slate-500">Suggested roles</dt><dd className="text-right">{Object.keys(data.detected_columns).join(', ') || 'None detected'}</dd>
          </dl>
        </div>
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Data quality &amp; analysis status</h3>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Quality score</dt><dd className="text-right font-semibold">{q.score}/100</dd>
            <dt className="text-slate-500">Missing values</dt><dd className="text-right">{q.missing_values} ({q.missing_pct}%)</dd>
            <dt className="text-slate-500">Duplicate rows</dt><dd className="text-right">{q.duplicate_rows}</dd>
            <dt className="text-slate-500">Latest analysis</dt><dd className="text-right text-emerald-600">Completed</dd>
          </dl>
        </div>
      </div>
    </div>
  )
}
