import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { ChartSpec } from '../types'
import { compact, num } from '../utils/format'

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316']
const tick = { fontSize: 11, fill: '#64748b' }
const fmt = (v: unknown) => (typeof v === 'number' ? num(v) : String(v))

export default function ChartCard({ spec, height = 280 }: { spec: ChartSpec; height?: number }) {
  const key = spec.yKeys[0]
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900">{spec.title}</h3>
      {spec.reason && <p className="mb-4 mt-1 text-xs leading-relaxed text-slate-500">{spec.reason}</p>}
      {!spec.reason && <div className="mb-4" />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === 'line' ? (
            <LineChart data={spec.data} margin={{ left: 8, right: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={spec.xKey} tick={tick} label={{ value: spec.xLabel, position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={tick} tickFormatter={compact} label={{ value: spec.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }} />
              <Tooltip formatter={fmt} />
              <Line type="monotone" dataKey={key} stroke={COLORS[0]} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          ) : spec.type === 'pie' ? (
            <PieChart>
              <Pie data={spec.data} dataKey={key} nameKey={spec.xKey} innerRadius={55} outerRadius={95} paddingAngle={2}>
                {spec.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmt} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          ) : spec.type === 'scatter' ? (
            <ScatterChart margin={{ left: 8, right: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" dataKey="x" name={spec.xLabel} tick={tick} label={{ value: spec.xLabel, position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }} />
              <YAxis type="number" dataKey="y" name={spec.yLabel} tick={tick} tickFormatter={compact} label={{ value: spec.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={fmt} />
              <Scatter data={spec.data} fill={COLORS[1]} />
            </ScatterChart>
          ) : spec.layout === 'vertical' ? (
            <BarChart data={spec.data} layout="vertical" margin={{ left: 16, right: 16, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={tick} tickFormatter={compact} label={{ value: spec.xLabel, position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey={spec.xKey} tick={tick} width={110} />
              <Tooltip formatter={fmt} />
              <Bar dataKey={key} fill={COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          ) : (
            <BarChart data={spec.data} margin={{ left: 8, right: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey={spec.xKey} tick={tick} interval="preserveStartEnd" label={{ value: spec.xLabel, position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={tick} tickFormatter={compact} label={{ value: spec.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }} />
              <Tooltip formatter={fmt} />
              <Bar dataKey={key} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
