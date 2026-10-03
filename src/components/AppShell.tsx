import { Plus } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const onAddPage = location.pathname === '/add'

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto min-h-screen max-w-lg bg-slate-50 pb-28">
        <Outlet />
      </main>

      {!onAddPage && (
        <button
          type="button"
          onClick={() => navigate('/add')}
          className="fixed bottom-[82px] left-1/2 z-50 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 active:scale-95"
          aria-label="Add reading"
        >
          <Plus size={32} strokeWidth={2.6} />
        </button>
      )}

      {!onAddPage && <BottomNav />}
    </div>
  )
}
