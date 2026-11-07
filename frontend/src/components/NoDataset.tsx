import { Sparkles, Upload } from 'lucide-react'
import { EmptyState } from './States'

export default function NoDataset({ go }: { go: (p: 'data') => void }) {
  return (
    <EmptyState
      title="No dataset yet"
      text="Upload a CSV or Excel file, or load the synthetic demo dataset to explore IntelliBI Flow."
      action={<button className="btn-primary" onClick={() => go('data')}><Upload className="h-4 w-4" /> Go to Data Management <Sparkles className="h-4 w-4" /></button>}
    />
  )
}
