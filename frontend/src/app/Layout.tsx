import { Outlet, Link, useLocation } from 'react-router-dom'
import { Activity, Archive, BarChart, Search, Sun, Moon } from 'lucide-react'
import { useAppStore, Role } from '../lib/store'
import { cn } from '../lib/utils'

export function Layout() {
  const { pathname } = useLocation()
  const { role, user, setRole, theme, toggleTheme, demoMode, setDemoMode } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass-bar sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold">
              CQ
            </div>
            <span className="font-semibold text-title2 tracking-tight hidden sm:block">Cairnquill</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <NavLink to="/queue" current={pathname} icon={<Activity size={16} />} label="Queue" />
            <NavLink to="/filings" current={pathname} icon={<Archive size={16} />} label="Filings" />
            {(role === 'dev' || role === 'auditor') && (
              <NavLink to="/eval" current={pathname} icon={<BarChart size={16} />} label="Eval" />
            )}
            <NavLink to="/ask" current={pathname} icon={<Search size={16} />} label="Ask" />
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Demo Controls */}
          <div className="flex items-center gap-2 bg-surface-2 px-3 py-1.5 rounded-full">
            <span className="text-ink-2">Role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="bg-transparent border-none outline-none font-medium text-ink cursor-pointer"
            >
              <option value="investigator">Investigator</option>
              <option value="approver">Approver</option>
              <option value="auditor">Auditor</option>
              <option value="dev">Dev</option>
            </select>
          </div>
          
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface-2 text-ink-2">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div className="flex flex-col items-end leading-tight">
            <span className="font-medium">{user}</span>
            {demoMode && <span className="text-[11px] text-accent uppercase tracking-wider font-bold">Demo Mode</span>}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

function NavLink({ to, current, icon, label }: { to: string, current: string, icon: React.ReactNode, label: string }) {
  const active = current.startsWith(to)
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors",
        active ? "bg-surface-2 text-ink font-semibold" : "text-ink-2 hover:bg-surface-2/50"
      )}
    >
      {icon}
      {label}
    </Link>
  )
}
