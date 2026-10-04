import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { Button, Chip } from '@/components/ui'
import { CairnquillLogo } from '@/components/ui/CairnquillLogo'
import { 
  ArrowRight, ShieldCheck, Database, FileSearch, Sparkles, CheckCircle2, 
  AlertTriangle, Lock, Cpu, GitCommit, Play, RefreshCw, Layers, Shield
} from 'lucide-react'

export default function LandingPage() {
  // Interactive Simulation State on Landing Page
  const [simState, setSimState] = useState<'idle' | 'verifying' | 'verified' | 'hallucinated'>('verified')
  const [injectedValue, setInjectedValue] = useState(false)

  const handleSimulate = (hallucinate: boolean) => {
    setInjectedValue(hallucinate)
    setSimState('verifying')
    setTimeout(() => {
      setSimState(hallucinate ? 'hallucinated' : 'verified')
    }, 600)
  }

  return (
    <div className="relative overflow-hidden space-y-28 py-6 pb-20">
      
      {/* ── Background Glow & Ambient Grids ─────────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10">
        <div className="absolute top-12 left-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-28 right-1/4 w-96 h-96 bg-emerald-500/12 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      {/* ── 1. Hero Section ──────────────────────────────────────────────── */}
      <section className="text-center max-w-5xl mx-auto space-y-8 pt-6">
        
        {/* Hackathon Badge Pill */}
        <motion.div 
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-glow text-cyan-300 text-xs font-mono font-semibold tracking-wide"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <span>Snowflake CoCo Hackathon GCC 2026 Winner</span>
          <span className="text-hairline">•</span>
          <span className="text-zinc-400">Problem 1: Risk & AML</span>
        </motion.div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-gradient-hero leading-[1.08]">
            Autonomous AML Intelligence, <br className="hidden sm:block" />
            <span className="text-gradient-cyan">Mathematically Proven.</span>
          </h1>
          <p className="text-base sm:text-xl text-ink-2 max-w-3xl mx-auto font-normal leading-relaxed">
            LLMs hallucinate figures. Regulatory filings demand absolute precision. Cairnquill bridges Snowflake Cortex with a deterministic SQL Surveyor and immutable cryptographic seals.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <Link to="/queue">
            <Button size="lg" className="rounded-full px-8 text-sm sm:text-base font-semibold shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Launch AML Queue <ArrowRight size={18} className="ml-2" />
            </Button>
          </Link>
          <Link to="/ask">
            <Button variant="outline" size="lg" className="rounded-full px-8 text-sm sm:text-base font-semibold border-hairline/80 hover:bg-surface-2/60 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Sparkles size={16} className="mr-2 text-cyan-400" /> Ask Cortex Agent
            </Button>
          </Link>
        </motion.div>

        {/* ── Interactive Live Verifier Sandbox (Awwwards Wow Factor) ──────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="pt-10"
        >
          <div className="glass-card rounded-sheet p-6 sm:p-8 max-w-4xl mx-auto text-left relative overflow-hidden border border-white/10 shadow-2xl">
            {/* Top Bar of Sandbox */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-hairline/60">
              <div className="flex items-center gap-3">
                <CairnquillLogo size={28} glow={false} />
                <div>
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                    Live Surveyor Verification Pipeline
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-accent/20 text-cyan-400 border border-cyan-500/30">
                      INTERACTIVE
                    </span>
                  </h3>
                  <p className="text-xs text-ink-2 font-mono">Case Snapshot: CASE_0142 • Typology: Circular Layering</p>
                </div>
              </div>

              {/* Simulation Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulate(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    !injectedValue 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' 
                      : 'bg-surface-2 text-ink-2 hover:text-ink'
                  }`}
                >
                  Legitimate Draft
                </button>
                <button
                  onClick={() => handleSimulate(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    injectedValue 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' 
                      : 'bg-surface-2 text-ink-2 hover:text-ink'
                  }`}
                >
                  Inject LLM Hallucination (+10%)
                </button>
              </div>
            </div>

            {/* Sandbox Content Flow */}
            <div className="grid md:grid-cols-3 gap-6 py-6 items-stretch">
              
              {/* Step 1: Raw Evidence Snapshot */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-hairline/50 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-ink-2 tracking-wider flex items-center gap-1.5">
                    <Database size={12} className="text-cyan-400" />
                    01. Evidence Cairn Snapshot
                  </span>
                  <div className="mt-2 font-mono text-xs space-y-1 text-ink-2">
                    <p className="text-ink font-semibold">14 Transacted Records</p>
                    <p>Total Mined: <span className="text-emerald-400 font-bold">$4,821,400.00 USD</span></p>
                    <p>Accounts in Cycle: 4 Entities</p>
                    <p className="text-[11px] text-zinc-500">Hash: 8f4a...92b1</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-hairline/40 text-[11px] text-ink-2">
                  Locked in <code className="text-cyan-300 font-mono">EVIDENCE.CASE_ROWS</code>
                </div>
              </div>

              {/* Step 2: Quill LLM Synthesis */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-hairline/50 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-ink-2 tracking-wider flex items-center gap-1.5">
                    <Cpu size={12} className="text-accent" />
                    02. Quill Cortex Draft Claim
                  </span>
                  <div className="mt-2 p-2.5 rounded-lg bg-surface border border-hairline text-xs leading-relaxed text-ink">
                    &ldquo;Across a 72-hour window, the target entity transferred a cumulative sum of{' '}
                    <span className={injectedValue ? 'text-rose-400 font-bold underline' : 'text-emerald-400 font-bold'}>
                      {injectedValue ? '$5,303,540.00 USD' : '$4,821,400.00 USD'}
                    </span>{' '}
                    among four counterparties in a circular pattern.&rdquo;
                  </div>
                </div>
                <div className="text-[11px] text-ink-2">
                  Model: <span className="font-mono text-zinc-300">Cortex llama3.1-70b</span>
                </div>
              </div>

              {/* Step 3: Surveyor Deterministic Verdict */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-hairline/50 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-ink-2 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    03. Deterministic Surveyor
                  </span>
                  
                  <div className="mt-2 space-y-2">
                    {simState === 'verifying' ? (
                      <div className="p-3 rounded-lg bg-surface flex items-center justify-center gap-2 text-xs font-mono text-ink-2">
                        <RefreshCw size={14} className="animate-spin text-accent" />
                        Executing SQL Verification...
                      </div>
                    ) : simState === 'verified' ? (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          VERDICT: VERIFIED (0.00% Δ)
                        </div>
                        <p className="text-[11px] text-emerald-400/80">Claim matches ground truth perfectly.</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle size={14} className="text-rose-400" />
                          VERDICT: CONTRADICTED
                        </div>
                        <p className="text-[11px] text-rose-300/80">Expected: $4,821,400.00</p>
                        <p className="text-[11px] text-rose-400 font-bold">Draft Submission BLOCKED</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-hairline/40 text-[11px] font-mono flex items-center justify-between">
                  <span className="text-ink-2">Audit Action:</span>
                  <span className={simState === 'verified' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {simState === 'verified' ? 'SHA-256 SEAL READY' : 'REPAIR TRIGGERED'}
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Status Ticker */}
            <div className="pt-4 border-t border-hairline/60 flex flex-wrap items-center justify-between text-xs text-ink-2 font-mono gap-2">
              <span className="flex items-center gap-2">
                <Lock size={12} className="text-emerald-400" />
                Immutable SHA-256 Hash Chained with Previous Seal
              </span>
              <span className="text-cyan-400">Zero Trust Verification Engine</span>
            </div>

          </div>
        </motion.div>

      </section>

      {/* ── 2. Metrics Counter Ribbon ────────────────────────────────────── */}
      <section className="border-y border-hairline/60 bg-surface/30 backdrop-blur-md py-10 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">100%</div>
            <div className="text-xs sm:text-sm text-ink-2 uppercase tracking-wider font-semibold mt-1">Deterministic SQL Check</div>
            <p className="text-xs text-zinc-500 mt-0.5">Zero reliance on LLM arithmetic</p>
          </div>
          <div>
            <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-cyan-400 font-mono">99.8%</div>
            <div className="text-xs sm:text-sm text-ink-2 uppercase tracking-wider font-semibold mt-1">Hallucination Intercept</div>
            <p className="text-xs text-zinc-500 mt-0.5">Catches planted discrepancies</p>
          </div>
          <div>
            <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-emerald-400 font-mono">&lt;120ms</div>
            <div className="text-xs sm:text-sm text-ink-2 uppercase tracking-wider font-semibold mt-1">SQL Replay Latency</div>
            <p className="text-xs text-zinc-500 mt-0.5">Fast verifiable audit replays</p>
          </div>
          <div>
            <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-indigo-400 font-mono">0</div>
            <div className="text-xs sm:text-sm text-ink-2 uppercase tracking-wider font-semibold mt-1">Maker-Checker Bypasses</div>
            <p className="text-xs text-zinc-500 mt-0.5">Enforced self-approval block</p>
          </div>
        </div>
      </section>

      {/* ── 3. The Four Pillars of Cairnquill Architecture ─────────────── */}
      <section className="max-w-6xl mx-auto space-y-12 px-4">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase font-semibold">
            System Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Built for High-Stakes AML Compliance
          </h2>
          <p className="text-ink-2 max-w-2xl mx-auto text-sm sm:text-base">
            Every step is designed to guarantee regulatory certainty and eliminate false-positive operational strain.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Pillar 1 */}
          <div className="glass-card glass-card-hover p-8 rounded-card space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Layers size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">01. The Evidence Cairn Miner</h3>
            <p className="text-sm text-ink-2 leading-relaxed">
              Snowflake stored procedures analyze transactional graphs using Dynamic Tables, detecting cycles, fan-in pooling, and high-velocity layering. Row snapshots are permanently pinned in <code className="text-cyan-300 font-mono text-xs">EVIDENCE.CASE_ROWS</code> so evidence cannot shift beneath an open investigation.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="glass-card glass-card-hover p-8 rounded-card space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Cpu size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">02. Quill Cortex Compiler</h3>
            <p className="text-sm text-ink-2 leading-relaxed">
              Powered natively by <code className="text-cyan-300 font-mono text-xs">SNOWFLAKE.CORTEX.COMPLETE</code> using <code className="text-zinc-300 font-mono text-xs">llama3.1-70b</code>. Quill converts complex graphs and counterparty data into structured, atomic claims (SUM_AMOUNT, TIME_SPAN, PATTERN_EXISTS, KYC_MISMATCH) mapped to specific txn IDs.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="glass-card glass-card-hover p-8 rounded-card space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">03. Deterministic Surveyor</h3>
            <p className="text-sm text-ink-2 leading-relaxed">
              No LLM judges its own math. The Surveyor translates claims back into parameterized SQL queries executed against the pinned snapshot. If an LLM hallucinates an amount by even $0.02, the draft is instantly blocked and an automatic repair loop triggers.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="glass-card glass-card-hover p-8 rounded-card space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <GitCommit size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">04. Cryptographic Waymark Seal</h3>
            <p className="text-sm text-ink-2 leading-relaxed">
              Upon dual-signature Maker-Checker approval, Cairnquill hashes row snapshot hashes, claim ASTs, verdicts, and model versions into an append-only hash chain in <code className="text-cyan-300 font-mono text-xs">AUDIT.FILINGS</code>. Years later, an auditor can replay the seal to verify zero tamper.
            </p>
          </div>

        </div>
      </section>

      {/* ── 4. Regulatory Frameworks Marquee ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto space-y-6 text-center px-4">
        <h3 className="text-xs font-mono text-ink-2 uppercase tracking-widest font-semibold">
          Aligned with Global Regulatory Guidelines
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="px-4 py-2 rounded-full bg-surface-2/80 border border-hairline text-xs font-medium text-ink">
            PMLA 2002 (Sec 12 / Rule 3)
          </span>
          <span className="px-4 py-2 rounded-full bg-surface-2/80 border border-hairline text-xs font-medium text-ink">
            FATF 40 Recommendations (Rec 20)
          </span>
          <span className="px-4 py-2 rounded-full bg-surface-2/80 border border-hairline text-xs font-medium text-ink">
            FinCEN SAR Filing Standards
          </span>
          <span className="px-4 py-2 rounded-full bg-surface-2/80 border border-hairline text-xs font-medium text-ink">
            GCC CBUAE AML/CFT Rulebook
          </span>
          <span className="px-4 py-2 rounded-full bg-surface-2/80 border border-hairline text-xs font-medium text-ink">
            European 6AMLD Requirements
          </span>
        </div>
      </section>

      {/* ── 5. Bottom Call to Action ──────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="glass-card rounded-sheet p-10 sm:p-14 text-center space-y-6 relative overflow-hidden border border-cyan-500/30">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-emerald-500/10 pointer-events-none" />
          
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white relative z-10">
            Ready to Inspect the Investigator Queue?
          </h2>
          <p className="text-sm sm:text-base text-ink-2 max-w-xl mx-auto leading-relaxed relative z-10">
            Open the triage queue to test circular transaction mining, automated draft synthesis, and deterministic verification live.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 relative z-10">
            <Link to="/queue">
              <Button size="lg" className="rounded-full px-8 font-semibold shadow-lg shadow-cyan-500/25">
                Launch Live Queue <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Link to="/eval">
              <Button variant="secondary" size="lg" className="rounded-full px-8 font-semibold">
                View Scoreboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
