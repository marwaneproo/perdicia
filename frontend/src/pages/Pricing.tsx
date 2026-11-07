import { Check } from 'lucide-react'
import { useState } from 'react'
import Modal from '../components/Modal'
import { PLANS, useSubscription } from '../hooks/useSubscription'
import type { Plan } from '../types'

export default function Pricing() {
  const { plan: current, choose } = useSubscription()
  const [pending, setPending] = useState<Plan | null>(null)

  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Simple, transparent pricing</h2>
        <p className="mt-3 text-slate-500">Choose the right plan to turn your business data into intelligent decisions.</p>
        {current && <p className="mt-4 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">Current demo selection: {current.name}</p>}
      </div>

      <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Plan tiers below are product mock-ups only. Choosing one stores a local demo preference; no billing, payment processing, subscription enforcement, or account service is connected.</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {PLANS.map(p => {
          const selected = current?.id === p.id
          return (
            <div key={p.id} className={`card relative flex flex-col p-8 ${p.popular ? 'border-brand-500 ring-2 ring-brand-500/20 lg:-my-3' : ''}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold tracking-wide text-white">MOST POPULAR</span>}
              <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
              <p className="mt-4"><span className="text-4xl font-bold text-slate-900">{p.price} MAD</span><span className="text-slate-500"> / month</span></p>
              <ul className="my-6 flex-1 space-y-3">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {f}</li>
                ))}
              </ul>
              <button className={p.popular ? 'btn-primary w-full py-2.5' : 'btn-secondary w-full py-2.5'} onClick={() => setPending(p)}>
                {selected ? `Current: ${p.name}` : `Choose ${p.name}`}
              </button>
            </div>
          )
        })}
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">Demo only — selecting a plan is stored in your browser. No payment is requested or processed.</p>

      <Modal open={!!pending} onClose={() => setPending(null)} title="Confirm plan selection">
        {pending && (
          <>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Selected plan</p>
              <p className="text-xl font-semibold text-slate-900">{pending.name}</p>
              <p className="text-sm text-slate-600">{pending.price} MAD / month</p>
            </div>
            <p className="mt-3 text-xs text-amber-700">This is a demo selection. No real payment will occur and no card details are requested.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => { choose(pending.id); setPending(null) }}>Confirm demo selection</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
