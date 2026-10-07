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
        {/* Subtle Ambient 3D Depth */}
        <PersistentCairnCanvas />

        {/* 2% Subtle SVG Grain to eliminate banding */}
        <FilmGrain />

        {/* Global Toast Notifications */}
        <ToastContainer />

        {/* Executive Header – Linear Caliber */}
        <header className="sticky top-0 z-50 h-14 border-b border-hairline bg-canvas/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            
            {/* Brand + Navigation */}
            <div className="flex items-center gap-7">
              <Link 
                to="/" 
                onClick={() => sound.playClick(800, 0.02)}
                className="flex items-center gap-2.5 group select-none py-1" 
              >
                <CairnquillLogo size={22} showText={false} />
                <span className="font-semibold text-sm tracking-tight text-ink group-hover:text-white transition-colors">
                  Cairnquill
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                <HeaderNavLink to="/queue" current={pathname} label="Queue" />
                <HeaderNavLink to="/filings" current={pathname} label="Filings" />
                <HeaderNavLink to="/eval" current={pathname} label="Benchmark" />
                <HeaderNavLink to="/ask" current={pathname} label="Assistant" />
              </nav>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2.5">
              {/* Quiet Audio Engine Toggle */}
              <SoundToggle />

              {/* Minimal Role Switcher */}
              <div className="relative flex items-center bg-surface-2 border border-hairline hover:border-hairline-bold rounded-md px-2.5 h-8 text-xs transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 shrink-0" />
                <select
                  value={role}
                  onChange={(e) => {
                    sound.playClick(600, 0.03)
                    setRole(e.target.value as Role)
                  }}
                  className="bg-transparent border-none outline-none font-medium text-ink cursor-pointer text-xs pr-4 appearance-none"
                  title="Switch user role"
                >
                  <option value="investigator" className="bg-surface-2 text-ink">Investigator</option>
                  <option value="approver" className="bg-surface-2 text-ink">Approver</option>
                  <option value="auditor" className="bg-surface-2 text-ink">Auditor</option>
                  <option value="dev" className="bg-surface-2 text-ink">Dev Mode</option>
                </select>
                <ChevronDown size={11} className="absolute right-2 pointer-events-none text-ink-faint" />
              </div>

              {/* Action Button */}
              <Link to="/queue" className="hidden sm:inline-flex">
                <Button 
                  size="sm" 
                  variant="primary" 
                  className="h-8 px-3 text-xs font-medium gap-1.5"
                >
                  <span>Open Queue</span>
                  <ArrowRight size={12} className="opacity-70" />
                </Button>
              </Link>
            </div>

          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <Outlet />
        </main>

        {/* Clean Executive Footer */}
        <footer className="mt-auto border-t border-hairline bg-surface/30 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 text-xs text-ink-faint relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-ink-2">
              <CairnquillLogo size={16} showText={false} />
              <span className="font-medium text-ink">Cairnquill</span>
              <span className="text-hairline-bold">/</span>
              <span>Deterministic STR Verification on Snowflake Cortex</span>
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
        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
        isActive 
          ? "text-ink bg-white/[0.08] shadow-sm font-semibold" 
          : "text-ink-2 hover:text-ink hover:bg-white/[0.04]"
      )}
    >
      {label}
    </Link>
  )
}
