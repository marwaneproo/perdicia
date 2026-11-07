import { ArrowRight, BarChart3, Check, ChevronRight, Database, FileUp, LineChart, ShieldCheck, Sparkles, TableProperties, Zap } from 'lucide-react'
import type { PageId } from '../layouts/AppLayout'

const features = [
  { icon: Database, title: 'Understand every dataset', body: 'Profile columns, spot missing values and potential outliers, and identify useful dimensions and measures automatically.' },
  { icon: BarChart3, title: 'Charts that fit your data', body: 'Explore trends, category comparisons, distributions and relationships selected from your actual dataset.' },
  { icon: LineChart, title: 'See patterns, with context', body: 'Review data-backed summaries and transparent baseline forecasts without confusing them with guarantees.' },
  { icon: TableProperties, title: 'Keep your data in view', body: 'Inspect worksheets and rows before drawing conclusions; export your analysis as CSV or Excel.' },
]

const steps = ['Upload a file', 'Understand its structure', 'Explore suitable charts', 'Review evidence', 'Decide with context']

export default function Landing({ go, hasDataset }: { go: (p: PageId) => void; hasDataset: boolean }) {
  return (
    <div className="-mx-4 -mt-4 overflow-hidden bg-white sm:-mx-8 sm:-mt-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5" aria-label="IntelliBI Flow home">
          <span className="rounded-xl bg-brand-600 p-2 text-white"><Sparkles className="h-5 w-5" /></span>
          <span className="text-base font-bold tracking-tight text-slate-900">IntelliBI <span className="text-brand-600">Flow</span></span>
        </button>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Landing navigation">
          <a href="#features" className="hover:text-slate-900">Platform</a>
          <a href="#workflow" className="hover:text-slate-900">How it works</a>
          <button onClick={() => go('pricing')} className="hover:text-slate-900">Plans</button>
        </nav>
        <button onClick={() => go(hasDataset ? 'overview' : 'data')} className="btn-primary">Open workspace <ArrowRight className="h-4 w-4" /></button>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-y border-slate-100 bg-slate-50/70">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.92fr] lg:py-28">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> DATA ANALYSIS, WITHOUT THE SPREADSHEET MAZE</div>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Turn everyday data into <span className="text-brand-600">clearer decisions.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Transform your data into insights, predictions, and smarter business decisions. Upload a CSV or Excel file and get a useful starting point for analysis in minutes.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => go('data')} className="btn-primary px-5 py-3">{hasDataset ? 'Manage your data' : 'Get started'} <ArrowRight className="h-4 w-4" /></button>
                <a href="#features" className="btn-secondary px-5 py-3">Explore the platform <ChevronRight className="h-4 w-4" /></a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Files stay in your local app storage</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> No payment integration claimed</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-brand-100/80 via-slate-100 to-emerald-100/70 blur-2xl" />
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div><p className="text-xs font-semibold text-slate-900">Analytics overview</p><p className="mt-0.5 text-[10px] text-slate-400">Example workspace · sample values</p></div>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">DATA PROFILED</span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[['Rows scanned', '2,480'], ['Fields found', '8'], ['Missing cells', '1.2%']].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-semibold tracking-tight text-slate-800">{value}</p></div>)}
                </div>
                <div className="px-5 pb-2"><p className="text-xs font-semibold text-slate-800">Weekly activity · example visualization</p></div>
                <div className="px-4 pb-2">
                  <svg viewBox="0 0 500 190" role="img" aria-label="Illustrative weekly trend chart" className="h-auto w-full">
                    <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity=".2" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>
                    {[35, 75, 115, 155].map(y => <line key={y} x1="42" x2="484" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 5" />)}
                    <path d="M44,145 C75,138 86,115 112,121 S157,95 180,108 S223,72 247,91 S287,98 315,69 S354,88 382,55 S426,68 481,29 L481,159 L44,159Z" fill="url(#area)" />
                    <path d="M44,145 C75,138 86,115 112,121 S157,95 180,108 S223,72 247,91 S287,98 315,69 S354,88 382,55 S426,68 481,29" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
                    {['W1','W2','W3','W4','W5','W6','W7'].map((label, i) => <text key={label} x={52 + i * 70} y="180" fill="#94a3b8" fontSize="10">{label}</text>)}
                  </svg>
                </div>
                <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
                  <span className="rounded-lg bg-white p-2 text-brand-600"><Zap className="h-4 w-4" /></span>
                  <div><p className="text-[11px] font-semibold text-slate-800">Explore the evidence</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">Suggested charts include their reason, so you can review how each relates to your dataset.</p></div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><FileUp className="h-4 w-4" /></span><span className="text-xs font-semibold text-slate-700">CSV + Excel import</span></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand-600">Make analysis feel manageable</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">From scattered files to a stronger starting point.</h2><p className="mt-4 text-sm leading-6 text-slate-500">Skip repetitive first-pass cleanup and explore your data with understandable summaries, transparent suggestions, and exports you control.</p></div>
          <div id="features" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><span className="inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-600"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></article>)}
          </div>
        </section>

        <section id="workflow" className="border-y border-slate-100 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand-600">A guided workflow</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Less manual sorting. More useful context.</h2></div>
            <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{steps.map((step, i) => <li key={step} className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs font-bold text-brand-600">0{i + 1}</span><p className="mt-2 text-sm font-semibold text-slate-800">{step}</p></li>)}</ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 rounded-3xl bg-slate-950 p-8 text-white sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-300">Start with the file you already have</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">A clearer first look at your business data starts here.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Explore sample data or bring your own. No subscription or payment is required to open the workspace.</p></div><button onClick={() => go('data')} className="btn-primary w-fit bg-white text-slate-900 hover:bg-slate-100">Open data workspace <ArrowRight className="h-4 w-4" /></button></div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-semibold text-slate-700">IntelliBI Flow · Raw data to decisions</span><span>Local analysis workspace · Plan selection and payments are demo-only</span><button onClick={() => go('pricing')} className="text-left font-medium text-brand-600 hover:underline">View plan options</button></div></footer>
    </div>
  )
}
