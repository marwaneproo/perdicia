import { AlertCircle, DatabaseZap, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" /> <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div><p className="font-medium">Something went wrong</p><p>{message}</p></div>
    </div>
  )
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-brand-50 p-3 text-brand-600"><DatabaseZap className="h-6 w-6" /></div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
