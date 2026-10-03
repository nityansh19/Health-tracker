import { BarChart3, Clock3, Home, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/history', label: 'History', icon: Clock3 },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-slate-200 bg-white/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition ' +
              (isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800')
            }
          >
            <Icon size={22} strokeWidth={2.2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
