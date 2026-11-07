import { Loader2, Sparkles, UploadCloud } from 'lucide-react'
import { DragEvent, useRef, useState } from 'react'
import { DemoBadge, ExportButtons } from '../components/DatasetBar'
import { ErrorState, Loading } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useDataset } from '../hooks/useDataset'
import { api } from '../services/api'

export default function DataManagement() {
  const { dataset, datasets, select, upload, loadDemo, error } = useDataset()
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [workbook, setWorkbook] = useState<{ file: File; sheets: string[] } | null>(null)
  const [sheetName, setSheetName] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const { data: preview, loading, error: pErr } = useAsync(() => (dataset ? api.preview(dataset.id) : Promise.resolve(null)), [dataset?.id])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setLocalError(null)
    try { await fn() } catch (e) { setLocalError((e as Error).message) } finally { setBusy(false) }
  }
  const selectFile = async (file: File) => {
    setLocalError(null)
    if (/\.(xlsx|xlsm)$/i.test(file.name)) {
      const sheets = await api.workbookSheets(file)
      if (sheets.length > 1) { setWorkbook({ file, sheets }); setSheetName(sheets[0]); return }
      await upload(file, sheets[0])
      return
    }
    await upload(file)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) run(() => selectFile(f))
  }
  const shownError = localError ?? error

  return (
    <div className="space-y-6">
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
        className={`card flex flex-col items-center border-2 border-dashed px-6 py-12 text-center transition-colors ${drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300'}`}>
        <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600">{busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}</div>
        <h2 className="text-base font-semibold text-slate-900">{dataset ? 'Replace the current dataset' : 'Import your data'}</h2>
        <p className="mt-1 text-sm text-slate-500">Drag &amp; drop a CSV or Excel workbook here (max 10 MB)</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <input ref={input} type="file" accept=".csv,.xlsx,.xlsm" aria-label="Choose CSV or Excel data file" hidden data-testid="file-input"
            onChange={e => { const f = e.target.files?.[0]; if (f) run(() => selectFile(f)); e.target.value = '' }} />
          <button className="btn-primary" disabled={busy} onClick={() => input.current?.click()}>Choose a file</button>
          <button className="btn-secondary" disabled={busy} onClick={() => run(loadDemo)}><Sparkles className="h-4 w-4" /> Load Demo Dataset</button>
        </div>
        <p className="mt-3 text-xs text-slate-400">CSV, XLSX and XLSM supported · Excel workbooks let you select a worksheet · source files remain unchanged</p>
      </div>

      {shownError && <ErrorState message={shownError} />}
      {workbook && (
        <div className="card space-y-4 border-brand-200 p-5">
          <div><h3 className="text-sm font-semibold text-slate-900">Choose a worksheet</h3><p className="mt-1 text-sm text-slate-500">{workbook.file.name} contains multiple sheets. Select one to import.</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <select className="input min-w-56" value={sheetName} onChange={e => setSheetName(e.target.value)} aria-label="Excel worksheet">
              {workbook.sheets.map(sheet => <option key={sheet} value={sheet}>{sheet}</option>)}
            </select>
            <button className="btn-primary" disabled={busy || !sheetName} onClick={() => run(async () => { await upload(workbook.file, sheetName); setWorkbook(null) })}>Import worksheet</button>
            <button className="btn-secondary" disabled={busy} onClick={() => setWorkbook(null)}>Cancel</button>
          </div>
        </div>
      )}

      {datasets.length > 1 && (
        <div className="card p-4">
          <label className="text-xs font-medium uppercase text-slate-500">Active dataset</label>
          <select className="input mt-1 w-full sm:w-96" value={dataset?.id ?? ''} onChange={e => { const d = datasets.find(x => x.id === Number(e.target.value)); if (d) select(d) }}>
            {datasets.map(d => <option key={d.id} value={d.id}>#{d.id} – {d.name}</option>)}
          </select>
        </div>
      )}

      {dataset && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><h3 className="text-lg font-semibold text-slate-900">{dataset.name}</h3>{dataset.is_demo ? <DemoBadge /> : null}</div>
            <ExportButtons dataset={dataset} />
          </div>
          {loading && <Loading label="Reading dataset…" />}
          {pErr && <ErrorState message={pErr} />}
          {preview && (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                {[['Rows', preview.quality.rows], ['Columns', preview.quality.columns], ['Missing values', preview.quality.missing_values], ['Duplicate rows', preview.quality.duplicate_rows]].map(([l, v]) => (
                  <div key={l as string} className="card p-4"><p className="text-xs uppercase text-slate-500">{l}</p><p className="text-2xl font-semibold text-slate-900">{(v as number).toLocaleString()}</p></div>
                ))}
              </div>
              {preview.derived.length > 0 && <p className="text-sm text-slate-500">Derived column: {preview.derived.join(', ')}</p>}

              <div className="card overflow-hidden">
                <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold">Columns &amp; data types{preview.selected_sheet ? ` · ${preview.selected_sheet}` : ""}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-2">Column</th><th className="px-5 py-2">Type</th><th className="px-5 py-2">Missing</th><th className="px-5 py-2">Unique</th><th className="px-5 py-2">IQR outliers</th><th className="px-5 py-2">Detected as</th></tr></thead>
                    <tbody>
                      {preview.quality.column_info.map(c => (
                        <tr key={c.name} className="border-t border-slate-100">
                          <td className="px-5 py-2 font-medium">{c.name}</td><td className="px-5 py-2 text-slate-500">{c.dtype}</td>
                          <td className="px-5 py-2">{c.missing}</td><td className="px-5 py-2">{c.unique}</td><td className="px-5 py-2">{c.outliers_iqr ?? '—'}</td>
                          <td className="px-5 py-2 text-brand-600">{Object.entries(preview.detected_columns).find(([, v]) => v === c.name)?.[0] ?? (c.potential_identifier ? 'possible identifier' : '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card overflow-hidden">
                <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold">Preview (first {preview.rows.length} rows)</h3>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr>{preview.columns.map(c => <th key={c} className="whitespace-nowrap px-4 py-2">{c}</th>)}</tr></thead>
                    <tbody>
                      {preview.rows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          {r.map((v, j) => <td key={j} className="whitespace-nowrap px-4 py-2">{v === null ? <span className="text-slate-300">—</span> : String(v)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
