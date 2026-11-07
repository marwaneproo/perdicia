import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { api, errorMessage } from '../services/api'
import type { Dataset } from '../types'

interface Ctx {
  dataset: Dataset | null
  loading: boolean
  error: string | null
  upload: (f: File, sheetName?: string) => Promise<void>
  loadDemo: () => Promise<void>
  select: (d: Dataset) => void
  datasets: Dataset[]
}
const DatasetCtx = createContext<Ctx>(null as unknown as Ctx)
const KEY = 'intellibi.dataset'

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.datasets()
      .then(list => {
        setDatasets(list)
        let saved: number | null = null
        try { saved = Number(localStorage.getItem(KEY)) || null } catch { /* ignore */ }
        setDataset(list.find(d => d.id === saved) ?? list[0] ?? null)
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  const select = useCallback((d: Dataset) => {
    setDataset(d)
    try { localStorage.setItem(KEY, String(d.id)) } catch { /* ignore */ }
  }, [])

  const add = useCallback(async (p: Promise<Dataset>) => {
    setError(null)
    try {
      const d = await p
      setDatasets(prev => [d, ...prev])
      select(d)
    } catch (e) {
      const msg = errorMessage(e)
      setError(msg)
      throw new Error(msg)
    }
  }, [select])

  return (
    <DatasetCtx.Provider value={{
      dataset, datasets, loading, error, select,
      upload: (f, sheetName) => add(api.upload(f, sheetName)),
      loadDemo: () => add(api.demo()),
    }}>
      {children}
    </DatasetCtx.Provider>
  )
}
export const useDataset = () => useContext(DatasetCtx)
