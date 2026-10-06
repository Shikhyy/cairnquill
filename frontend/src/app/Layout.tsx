import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAppStore, Role } from '../lib/store'
import { cn } from '../lib/utils'
import { ToastContainer } from '../components/ui/Toast'
import { CairnquillLogo } from '../components/ui/CairnquillLogo'
import { PersistentCairnCanvas } from '../components/canvas/PersistentCairnCanvas'
import { CustomCursor } from '../components/CustomCursor'
import { FilmGrain } from '../components/FilmGrain'
import { SmoothScroll } from '../components/SmoothScroll'
import { SoundToggle } from '../components/SoundToggle'
import { LegalArchitecture } from '../components/modals/LegalModals'
import { Button } from '../components/ui/Button'
import { sound } from '../lib/soundEngine'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export function Layout() {
  const { pathname } = useLocation()
  const { role, setRole } = useAppStore()

  return (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col bg-canvas text-ink selection:bg-accent/20 selection:text-accent-light relative">
        {/* Persistent 3D WebGL Cairn Canvas */}
        <PersistentCairnCanvas />

        {/* 3.5% Monochromatic SVG Film Grain Overlay */}
        <FilmGrain />

        {/* Custom Lerped Magnetic Cursor */}
        <CustomCursor />

        {/* Global Toast Notifications */}
        <ToastContainer />

        {/* Surgical Architectural Header */}
        <header className="sticky top-0 z-50 px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-hairline bg-surface/85 backdrop-blur-xl transition-all">
          <div className="flex items-center gap-6 lg:gap-8">
            <Link 
              to="/" 
              onClick={() => sound.playClick(800, 0.02)}
              className="flex items-center gap-2.5 group select-none" 
              data-magnetic="0.3"
            >
              <CairnquillLogo size={24} showText={false} />
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm tracking-tight text-ink group-hover:text-accent transition-colors">
                  Cairnquill
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[3px] bg-surface-2 text-ink-2 border border-hairline">
                  SNOWFLAKE NATIVE
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              <HeaderNavLink to="/queue" current={pathname} label="Triage Queue" />
              <HeaderNavLink to="/filings" current={pathname} label="Sealed Filings" />
              <HeaderNavLink to="/eval" current={pathname} label="Scoreboard" />
              <HeaderNavLink to="/ask" current={pathname} label="Regulatory Assistant" />
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Procedural Web Audio Sound Engine */}
            <SoundToggle />

            {/* Verification Engine Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-surface-2/60 border border-hairline text-ink-2 text-[11px] font-mono select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CORTEX VERIFIED</span>
            </div>

            {/* Hardware-Style Role Switcher */}
            <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1 rounded-[4px] border border-hairline text-xs font-mono">
              <span className="text-ink-faint text-[10px]">ROLE:</span>
              <select
                value={role}
                onChange={(e) => {
                  sound.playClick(600, 0.03)
                  setRole(e.target.value as Role)
                }}
                className="bg-transparent border-none outline-none font-semibold text-ink cursor-pointer text-xs uppercase"
              >
                <option value="investigator" className="bg-surface text-ink">Investigator (Maker)</option>
                <option value="approver" className="bg-surface text-ink">Approver (Checker)</option>
                <option value="auditor" className="bg-surface text-ink">Auditor (Read-Only)</option>
                <option value="dev" className="bg-surface text-ink">Dev (Demo Injection)</option>
              </select>
            </div>

            {/* Quick Launch CTA Button */}
            <Link to="/queue" className="hidden sm:inline-flex">
              <Button 
                size="sm" 
                variant="primary" 
                className="h-8 px-3 text-[11px] font-semibold font-mono"
              >
                Launch Queue <ArrowRight size={12} className="ml-1 opacity-70" />
              </Button>
            </Link>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <Outlet />
        </main>

        {/* Architectural Footer with Legal Architecture */}
        <footer className="mt-auto border-t border-hairline bg-surface/80 backdrop-blur-md py-8 px-6 text-xs text-ink-2 relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <CairnquillLogo size={20} showText={false} />
              <span className="font-semibold text-ink">Cairnquill Protocol</span>
              <span className="text-hairline">|</span>
              <span className="text-ink-2 font-mono text-[11px]">Deterministic STR Verification</span>
              <span className="text-hairline">|</span>
              <span className="text-ink-faint font-mono text-[11px]">Synthetic Evaluation Sandbox</span>
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
      data-magnetic="0.2"
      className={cn(
        "px-3 py-1 rounded-[4px] transition-all relative font-mono text-xs",
        isActive 
          ? "text-ink font-semibold bg-surface-2 border border-hairline shadow-inset" 
          : "text-ink-2 hover:text-ink hover:bg-surface-2/50"
      )}
    >
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
      )}
    </Link>
  )
}
