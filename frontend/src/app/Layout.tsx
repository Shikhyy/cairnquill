import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAppStore, Role } from '../lib/store'
import { cn } from '../lib/utils'
import { ToastContainer } from '../components/ui/Toast'
import { CairnquillLogo } from '../components/ui/CairnquillLogo'
import { PersistentCairnCanvas } from '../components/canvas/PersistentCairnCanvas'
import { FilmGrain } from '../components/FilmGrain'
import { SmoothScroll } from '../components/SmoothScroll'
import { SoundToggle } from '../components/SoundToggle'
import { LegalArchitecture } from '../components/modals/LegalModals'
import { Button } from '../components/ui/Button'
import { sound } from '../lib/soundEngine'
import { ArrowRight, ChevronDown } from 'lucide-react'

export function Layout() {
  const { pathname } = useLocation()
  const { role, setRole } = useAppStore()

  return (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col bg-canvas text-ink selection:bg-accent/20 selection:text-accent-light relative">
        {/* Persistent 3D WebGL Background */}
        <PersistentCairnCanvas />

        {/* 2% Subtle SVG Grain to eliminate banding */}
        <FilmGrain />

        {/* Global Toast Notifications */}
        <ToastContainer />

        {/* Executive Header */}
        <header className="sticky top-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl transition-all">
          <div className="flex items-center gap-8">
            <Link 
              to="/" 
              onClick={() => sound.playClick(800, 0.02)}
              className="flex items-center gap-3 group select-none" 
            >
              <CairnquillLogo size={24} showText={false} />
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-base tracking-tight text-white group-hover:text-accent transition-colors font-sans">
                  Cairnquill
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-white/[0.06]">
                  Snowflake Native
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <HeaderNavLink to="/queue" current={pathname} label="Triage Queue" />
              <HeaderNavLink to="/filings" current={pathname} label="Sealed Filings" />
              <HeaderNavLink to="/eval" current={pathname} label="Evaluation Benchmark" />
              <HeaderNavLink to="/ask" current={pathname} label="Regulatory Assistant" />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Procedural Web Audio Sound Engine */}
            <SoundToggle />

            {/* Verification Engine Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900/80 border border-white/[0.06] text-zinc-300 text-xs font-sans select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cortex Verifier Online</span>
            </div>

            {/* Hardware Role Switcher */}
            <div className="relative flex items-center bg-zinc-900/90 pl-2.5 pr-2 py-1 rounded-md border border-white/[0.08] text-xs font-sans">
              <span className="text-zinc-500 mr-1.5 text-[11px] font-mono">ROLE:</span>
              <select
                value={role}
                onChange={(e) => {
                  sound.playClick(600, 0.03)
                  setRole(e.target.value as Role)
                }}
                className="bg-transparent border-none outline-none font-medium text-zinc-200 cursor-pointer text-xs pr-4 appearance-none"
              >
                <option value="investigator" className="bg-zinc-900 text-zinc-100">Investigator (Maker)</option>
                <option value="approver" className="bg-zinc-900 text-zinc-100">Approver (Checker)</option>
                <option value="auditor" className="bg-zinc-900 text-zinc-100">Auditor (Read-Only)</option>
                <option value="dev" className="bg-zinc-900 text-zinc-100">Dev (Testing Mode)</option>
              </select>
              <ChevronDown size={12} className="absolute right-1.5 pointer-events-none text-zinc-400" />
            </div>

            {/* Direct Launch CTA */}
            <Link to="/queue" className="hidden sm:inline-flex">
              <Button 
                size="sm" 
                variant="primary" 
                className="gap-1.5 font-sans"
              >
                <span>Launch Queue</span>
                <ArrowRight size={13} />
              </Button>
            </Link>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <Outlet />
        </main>

        {/* Clean Executive Footer */}
        <footer className="mt-auto border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur-md py-8 px-6 text-xs text-zinc-400 relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <CairnquillLogo size={18} showText={false} />
              <span className="font-semibold text-zinc-200">Cairnquill</span>
              <span className="text-zinc-600">·</span>
              <span>Deterministic STR Verification on Snowflake</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500 font-mono text-[11px]">Synthetic AML Sandbox</span>
            </div>

            <LegalArchitecture />
          </div>
        </footer>
      </div>
    </SmoothScroll>
  )
}

function HeaderNavLink({ to, current, label }: { to: string; current: string; label: string }) {
  const isActive = current === to || (to !== '/' && current.startsWith(to))
  return (
    <Link
      to={to}
      onClick={() => sound.playClick(900, 0.02)}
      className={cn(
        "px-3 py-1.5 rounded-md transition-colors font-sans text-sm",
        isActive 
          ? "text-white font-medium bg-zinc-800/80 shadow-sm" 
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
      )}
    >
      {label}
    </Link>
  )
}
