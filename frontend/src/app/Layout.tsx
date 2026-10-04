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

      {/* Minimal Top Navigation */}
      <header className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between border-b border-hairline/60 bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <CairnquillLogo size={28} showText={false} glow={false} />
            <span className="font-semibold text-sm tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              Cairnquill
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-zinc-400 border border-hairline/60">
              STR Copilot
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
            <NavLink to="/queue" current={pathname} label="Triage Queue" />
            <NavLink to="/filings" current={pathname} label="Sealed Filings" />
            {(role === 'dev' || role === 'auditor') && (
              <NavLink to="/eval" current={pathname} label="Scoreboard" />
            )}
            <NavLink to="/ask" current={pathname} label="Ask Cortex" />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Subtle Connection Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-2/60 border border-hairline/60 text-zinc-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Snowflake Cortex</span>
          </div>

          {/* Minimal Role Selector */}
          <div className="flex items-center gap-1.5 bg-surface-2/60 px-2.5 py-1 rounded-md border border-hairline/60 text-xs">
            <span className="text-zinc-500 font-mono">Role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="bg-transparent border-none outline-none font-medium text-white cursor-pointer text-xs capitalize"
            >
              <option value="investigator" className="bg-surface text-ink">Investigator (Maker)</option>
              <option value="approver" className="bg-surface text-ink">Approver (Checker)</option>
              <option value="auditor" className="bg-surface text-ink">Auditor (Read-Only)</option>
              <option value="dev" className="bg-surface text-ink">Dev (Demo Injection)</option>
            </select>
          </div>
          
          <button 
            onClick={toggleTheme} 
            className="p-1.5 rounded-md hover:bg-surface-2 text-zinc-400 hover:text-white transition-colors border border-hairline/40"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
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

function NavLink({ to, current, icon, label }: { to: string, current: string, icon?: React.ReactNode, label: string }) {
  const active = current.startsWith(to)
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 py-1 text-xs transition-colors",
        active ? "text-white font-semibold border-b border-white" : "text-zinc-400 hover:text-white"
      )}
    >
      {icon && icon}
      {label}
    </Link>
  )
}
