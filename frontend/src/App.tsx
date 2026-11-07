import { useEffect, useState } from 'react'
import { DatasetProvider, useDataset } from './hooks/useDataset'
import { SubscriptionProvider } from './hooks/useSubscription'
import AppLayout, { NAV, PageId } from './layouts/AppLayout'
import Analytics from './pages/Analytics'
import DataManagement from './pages/DataManagement'
import Forecast from './pages/Forecast'
import Insights from './pages/Insights'
import Landing from './pages/Landing'
import Overview from './pages/Overview'
import Pricing from './pages/Pricing'

const fromHash = (): PageId => {
  const h = window.location.hash.replace('#/', '') as PageId
  return NAV.some(n => n.id === h) ? h : 'home'
}

function AppContent({ page, go }: { page: PageId; go: (p: PageId) => void }) {
  const { dataset, loading } = useDataset()
  if (page === 'home') return <Landing go={go} hasDataset={!loading && !!dataset} />
  return <AppLayout page={page} go={go}>
    {page === 'overview' && <Overview go={go} />}
    {page === 'data' && <DataManagement />}
    {page === 'analytics' && <Analytics go={go} />}
    {page === 'forecast' && <Forecast go={go} />}
    {page === 'insights' && <Insights go={go} />}
    {page === 'pricing' && <Pricing />}
  </AppLayout>
}

export default function App() {
  const [page, setPage] = useState<PageId>(fromHash())
  useEffect(() => {
    const on = () => setPage(fromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (p: PageId) => { window.location.hash = `/${p}` }

  return <SubscriptionProvider><DatasetProvider><AppContent page={page} go={go} /></DatasetProvider></SubscriptionProvider>
}
