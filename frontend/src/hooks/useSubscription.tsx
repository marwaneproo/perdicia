import { createContext, useContext, useState, ReactNode } from 'react'
import type { Plan } from '../types'

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 99, features: ['CSV and Excel imports', 'Commercial dashboard', 'Sales analysis', 'Basic business reports'] },
  { id: 'pro', name: 'Pro', price: 249, popular: true, features: ['Everything included in Starter', 'Sales forecasting', 'Stock alerts', 'Intelligent AI-assisted recommendations', 'Automated reports'] },
  { id: 'business', name: 'Business', price: 499, features: ['Everything included in Pro', 'Multiple users', 'Multiple stores', 'Advanced analytics', 'Custom exports', 'Priority support'] },
]
const KEY = 'intellibi.plan'

interface Ctx { plan: Plan | null; choose: (id: Plan['id']) => void }
const SubCtx = createContext<Ctx>(null as unknown as Ctx)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(() => {
    try { return PLANS.find(p => p.id === localStorage.getItem(KEY)) ?? null } catch { return null }
  })
  const choose = (id: Plan['id']) => {
    const p = PLANS.find(x => x.id === id) ?? null
    setPlan(p)
    try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
  }
  return <SubCtx.Provider value={{ plan, choose }}>{children}</SubCtx.Provider>
}
export const useSubscription = () => useContext(SubCtx)
