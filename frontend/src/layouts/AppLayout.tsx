import { BarChart3, CreditCard, Database, LayoutDashboard, Lightbulb, LineChart, Menu, Sparkles } from 'lucide-react'
import { ReactNode, useState } from 'react'
import { DemoBadge } from '../components/DatasetBar'
import { useDataset } from '../hooks/useDataset'
import { useSubscription } from '../hooks/useSubscription'

export const NAV = [
  { id: 'home', label: 'Product home', icon: Sparkles },
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'analytics', label: 'Analytics Studio', icon: BarChart3 },
  { id: 'forecast', label: 'Forecasting', icon: LineChart },
  { id: 'insights', label: 'Business Insights', icon: Lightbulb },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
] as const
export type PageId = typeof NAV[number]['id']

export default function AppLayout({ page, go, children }: { page: PageId; go: (p: PageId) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { dataset } = useDataset()
  const { plan } = useSubscription()
  const current = NAV.find(n => n.id === page)!

  return (
    <div className="min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
          <button onClick={() => go('home')} className="flex items-center gap-2 text-left">
            <div className="rounded-lg bg-brand-600 p-1.5 text-white"><Sparkles className="h-4 w-4" /></div>
            <span><span className="block text-sm font-bold leading-tight text-slate-900">IntelliBI Flow</span><span className="block text-[10px] leading-tight text-slate-400">Raw data → decisions</span></span>
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(n => {
            const Icon = n.icon
            const active = n.id === page
            return (
              <button key={n.id} onClick={() => { go(n.id); setOpen(false) }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Icon className="h-4 w-4" /> {n.label}
              </button>
            )
          })}
        </nav>
        <div className="m-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="font-medium text-slate-700">Current plan (demo)</p>
          <p className="mt-0.5 text-slate-500">{plan ? `${plan.name} · ${plan.price} MAD/month` : 'No plan selected'}</p>
          <button onClick={() => go('pricing')} className="mt-2 font-medium text-brand-600 hover:underline">{plan ? 'Change plan' : 'Choose a plan'}</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
            <h1 className="text-base font-semibold text-slate-900">{current.label}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {dataset && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="max-w-[220px] truncate text-slate-500">{dataset.name}</span>
                {dataset.is_demo ? <DemoBadge /> : null}
              </div>
            )}
            {plan && <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{plan.name} · demo</span>}
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  )
}
