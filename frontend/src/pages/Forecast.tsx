import { Info } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import NoDataset from '../components/NoDataset'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useDataset } from '../hooks/useDataset'
import { api } from '../services/api'
import { compact, money } from '../utils/format'
import type { PageId } from '../layouts/AppLayout'

export default function Forecast({ go }: { go: (p: PageId) => void }) {
  const { dataset } = useDataset()
  const { data, loading, error } = useAsync(() => (dataset ? api.forecast(dataset.id) : Promise.resolve(null)), [dataset?.id])
  if (!dataset) return <NoDataset go={go} />
  if (loading) return <Loading label="Computing forecast…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null
  if (!data.available) return <EmptyState title="Forecast unavailable" text={`${data.reason} ${data.method}`} />

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Forecasts are indicative baseline estimates—not guarantees. Check data coverage and model limitations before using them to make decisions.</div>
      {data.validation && <div className="grid gap-4 sm:grid-cols-3"><div className="card p-4"><p className="text-xs uppercase text-slate-500">Holdout periods</p><p className="mt-1 text-xl font-semibold">{data.validation.periods}</p></div><div className="card p-4"><p className="text-xs uppercase text-slate-500">Mean absolute error</p><p className="mt-1 text-xl font-semibold">{money(data.validation.mae)}</p></div><div className="card p-4"><p className="text-xs uppercase text-slate-500">Holdout MAPE</p><p className="mt-1 text-xl font-semibold">{data.validation.mape_pct === null ? "Unavailable (zero actuals)" : `${data.validation.mape_pct.toFixed(1)}%`}</p></div></div>}
      <div className="grid gap-4 sm:grid-cols-3">
        {data.forecast!.map(f => (
          <div key={f.month} className="card p-5">
            <p className="text-xs uppercase text-slate-500">Indicative · {f.month}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{money(f.forecast)}</p>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold">Monthly revenue: history and 3-month forecast</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.data} margin={{ left: 8, right: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Month', position: 'insideBottom', offset: -10, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={compact} label={{ value: 'Revenue (detected measure)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? money(v) : String(v))} />
              <Legend />
              <Line type="monotone" dataKey="actual" name="Historical" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card flex gap-3 bg-brand-50/50 p-4 text-sm text-slate-600">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <div><p className="font-medium text-slate-800">How this forecast works</p><p>{data.method} Based on {data.history_months} consecutive monthly periods. Holdout error is a retrospective baseline check, not a confidence interval.</p></div>
      </div>
    </div>
  )
}
