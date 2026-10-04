import { Outlet, Link, useLocation } from 'react-router-dom'
import { Activity, Archive, BarChart, Search, Sun, Moon, Shield, Sparkles } from 'lucide-react'
import { useAppStore, Role } from '../lib/store'
import { cn } from '../lib/utils'
import { ToastContainer } from '../components/ui/Toast'
import { CairnquillLogo } from '../components/ui/CairnquillLogo'

export function Layout() {
  const { pathname } = useLocation()
  const { role, user, setRole, theme, toggleTheme, demoMode } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col bg-canvas selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Ambient Highlight */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-5xl h-24 bg-gradient-to-b from-cyan-500/10 via-accent/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Glass Top Bar */}
      <header className="glass-bar sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between border-b border-hairline/60">
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center transition-transform hover:scale-[1.02]">
            <CairnquillLogo size={36} showText={true} />
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-surface-2/60 rounded-full border border-hairline/60 backdrop-blur-md">
            <NavLink to="/queue" current={pathname} icon={<Activity size={15} />} label="Queue" />
            <NavLink to="/filings" current={pathname} icon={<Archive size={15} />} label="Filings" />
            {(role === 'dev' || role === 'auditor') && (
              <NavLink to="/eval" current={pathname} icon={<BarChart size={15} />} label="Eval" />
            )}
            <NavLink to="/ask" current={pathname} icon={<Search size={15} />} label="Ask Cortex" />
          </nav>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Live Engine Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-medium">Snowflake Cortex Live</span>
          </div>

          {/* Role Switcher Pill */}
          <div className="flex items-center gap-2 bg-surface-2/80 px-3 py-1.5 rounded-full border border-hairline/80 shadow-sm">
            <Shield size={14} className="text-accent" />
            <span className="text-xs text-ink-2 font-medium hidden sm:inline">Role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="bg-transparent border-none outline-none text-xs font-semibold text-ink cursor-pointer capitalize"
            >
              <option value="investigator">Investigator (Maker)</option>
              <option value="approver">Approver (Checker)</option>
              <option value="auditor">Auditor (Read-Only)</option>
              <option value="dev">Dev (Demo Injection)</option>
            </select>
          </div>
          
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full hover:bg-surface-2 text-ink-2 hover:text-ink transition-colors border border-hairline/40"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <div className="hidden sm:flex flex-col items-end text-right leading-none">
            <span className="font-semibold text-xs text-ink">{user}</span>
            {demoMode && (
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold mt-0.5">
                Demo Sandbox
              </span>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Awwwards Polished Footer */}
      <footer className="mt-auto border-t border-hairline/60 bg-surface/40 backdrop-blur-md py-8 px-6 text-xs text-ink-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CairnquillLogo size={24} showText={false} glow={false} />
            <span className="font-medium text-ink">Cairnquill Protocol</span>
            <span className="text-hairline">•</span>
            <span>Snowflake CoCo Hackathon GCC 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-ink-2">
              <Sparkles size={14} className="text-accent" />
              Problem 1: Risk, Fraud & Regulatory Intelligence
            </span>
            <Link to="/eval" className="hover:text-ink transition-colors font-mono">Scoreboard</Link>
            <Link to="/ask" className="hover:text-ink transition-colors font-mono">PMLA Docs</Link>
          </div>
        </div>
      </footer>

      <ToastContainer />
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
