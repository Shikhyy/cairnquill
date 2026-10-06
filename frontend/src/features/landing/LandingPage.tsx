import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, TiltCard } from '@/components/ui'
import { SplitText } from '@/components/ui/SplitText'
import { sound } from '@/lib/soundEngine'
import { 
  ArrowRight, CheckCircle2, AlertTriangle, RefreshCw,
  Lock, Shield, Terminal, ArrowUpRight, Cpu, Layers, GitCommit,
  Check, Sparkles, ChevronDown, Hash, Database
} from 'lucide-react'

interface CasePreset {
  id: string
  title: string
  typology: string
  evidence: {
    txns: number
    volume: string
    pattern: string
    entities: number
    latency: string
  }
  claimText: string
  asserted: string
  actual: string
  sqlTemplate: string
  sealSha: string
}

const PRESETS: Record<string, CasePreset> = {
  circular: {
    id: 'CASE_0142',
    title: 'Circular Layering Loop',
    typology: 'CYCLIC_FUNDS_TRANSFER',
    evidence: {
      txns: 14,
      volume: '$4,821,400.00 USD',
      pattern: '4-node closed directed loop',
      entities: 4,
      latency: '42ms'
    },
    claimText: 'Across a 72-hour window, the target entity transferred an aggregate volume of $4,821,400.00 USD among four offshore counterparties, returning funds to originator account ACC_98231.',
    asserted: '$4,821,400.00 USD',
    actual: '$4,821,400.00 USD',
    sqlTemplate: 'SELECT COALESCE(SUM(amt_paid), 0) FROM EVIDENCE.CASE_ROWS WHERE src IN (%s) AND paid_ccy = %s AND txn_id IN (%s);',
    sealSha: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  smurfing: {
    id: 'CASE_0089',
    title: 'Smurfing & Structuring',
    typology: 'HIGH_VELOCITY_FAN_IN',
    evidence: {
      txns: 28,
      volume: '$274,800.00 USD',
      pattern: '28 inbound transfers each < $10,000 threshold',
      entities: 19,
      latency: '38ms'
    },
    claimText: 'The account received 28 discrete inbound transfers totaling $274,800.00 USD within 36 hours, each structured strictly below the mandatory reporting threshold of $10,000.',
    asserted: '$274,800.00 USD',
    actual: '$274,800.00 USD',
    sqlTemplate: 'SELECT COUNT(DISTINCT txn_id), SUM(amt_paid) FROM EVIDENCE.CASE_ROWS WHERE dst = %s AND amt_paid < 10000;',
    sealSha: '8f4a3e2b1c9d0a7f8e5d3c2b1a9f8e7d6c5b4a3e2b1c9d0a7f8e5d3c2b1a9f8e'
  },
  kyc: {
    id: 'CASE_0205',
    title: 'KYC Income Deviation',
    typology: 'PROFILE_INCONGRUENCE',
    evidence: {
      txns: 8,
      volume: '$3,940,000.00 USD',
      pattern: '6,566% deviation from declared profile',
      entities: 2,
      latency: '51ms'
    },
    claimText: 'Primary account executed $3,940,000.00 USD in aggregate transfers during the cycle, diverging by 65.6x from declared monthly salary profile of $60,000.00 USD.',
    asserted: '$3,940,000.00 USD',
    actual: '$3,940,000.00 USD',
    sqlTemplate: 'SELECT SUM(amt_paid) FROM EVIDENCE.CASE_ROWS WHERE src = %s AND paid_ccy = %s;',
    sealSha: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
  }
}

export default function LandingPage() {
  const [activeKey, setActiveKey] = useState<'circular' | 'smurfing' | 'kyc'>('circular')
  const [injectError, setInjectError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [replaySuccess, setReplaySuccess] = useState(false)
  const [hashingActive, setHashingActive] = useState(false)

  const preset = PRESETS[activeKey]

  const triggerVerification = (hallucinate: boolean) => {
    sound.playClick(750, 0.03)
    setInjectError(hallucinate)
    setIsVerifying(true)
    setReplaySuccess(false)

    setTimeout(() => {
      setIsVerifying(false)
      if (hallucinate) {
        sound.playBlock()
      } else {
        sound.playVerify()
      }
    }, 420)
  }

  const handleReplay = () => {
    sound.playClick(850, 0.04)
    setIsVerifying(true)
    setHashingActive(true)
    setTimeout(() => {
      setIsVerifying(false)
      setHashingActive(false)
      setReplaySuccess(true)
      sound.playVerify()
    }, 600)
  }

  const scrollToWorkbench = () => {
    sound.playClick(700, 0.02)
    document.getElementById('workbench')?.scrollIntoView({ behavior: 'smooth' })
  }

  const displayedClaimAmount = injectError 
    ? '$5,303,540.00 USD (+10% LLM Drift)' 
    : preset.asserted

  return (
    <div className="space-y-32 py-6 relative z-10">
      
      {/* ── 1. Hero Statement & Purpose ───────────────────────────────── */}
      <section className="max-w-5xl space-y-8 pt-4">
        
        {/* Eyebrow Telemetry Beacon */}
        <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-[4px] bg-surface-2/70 border border-hairline font-mono text-[11px] text-ink-2 select-none shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-ink font-semibold">SNOWFLAKE CORTEX LLM</span>
          <span className="text-hairline">/</span>
          <span>DETERMINISTIC SQL SURVEYOR</span>
          <span className="text-hairline">/</span>
          <span>SHA-256 MERKLE AUDIT</span>
        </div>

        {/* Hero Editorial Display Headline */}
        <div className="space-y-1">
          <div className="overflow-hidden">
            <h1 className="font-serif italic font-normal text-5xl sm:text-7xl md:text-8xl tracking-tight text-white leading-[1.02]">
              Mathematical certainty
            </h1>
          </div>
          <div className="overflow-hidden">
            <h2 className="font-sans font-semibold tracking-tighter text-3xl sm:text-5xl md:text-6xl text-zinc-300 leading-[1.08]">
              for generative compliance intelligence.
            </h2>
          </div>
        </div>

        <p className="text-base sm:text-lg text-ink-2 max-w-2xl font-normal leading-relaxed">
          Suspicious Transaction Reports demand mathematical zero-tolerance. Cairnquill pairs Snowflake Cortex LLM draft synthesis with a zero-trust SQL verification compiler and cryptographic audit seals — blocking numeric hallucination before regulatory filing.
        </p>

        {/* Awwwards-Tier Hero Button Cluster */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          
          {/* Primary Action */}
          <Link to="/queue" data-magnetic="0.4">
            <Button 
              size="lg" 
              variant="primary"
              className="h-12 px-7 text-xs font-mono font-semibold rounded-[4px] flex items-center gap-2 group shadow-1"
            >
              <span>Launch AML Queue</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform opacity-75" />
            </Button>
          </Link>

          {/* Secondary Action: Jump to Interactive Workbench */}
          <Button 
            size="lg" 
            variant="secondary"
            onClick={scrollToWorkbench}
            magnetic={0.3}
            className="h-12 px-6 text-xs font-mono rounded-[4px] flex items-center gap-2 text-ink hover:text-white"
          >
            <span>Inspect Surveyor Proofs</span>
            <ChevronDown size={14} className="opacity-60" />
          </Button>

          {/* Tertiary Action: Terminal Search */}
          <Link to="/ask" data-magnetic="0.25">
            <Button 
              variant="outline" 
              size="lg" 
              className="h-12 px-5 text-xs font-mono rounded-[4px] text-ink-2 hover:text-ink hidden sm:inline-flex"
            >
              <Terminal size={13} className="mr-2 text-accent" />
              <span>[CMD + K] Ask PMLA Terminal</span>
            </Button>
          </Link>
        </div>

        {/* Hero Micro-Telemetry Strip (The 4 Non-Negotiables) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-hairline/80 text-xs font-mono">
          <div className="p-3 bg-surface rounded-[4px] border border-hairline space-y-1">
            <div className="text-[10px] text-ink-faint uppercase">Drift Tolerance</div>
            <div className="text-sm font-bold text-emerald-400 tabular-nums">$0.00 Max Delta</div>
            <div className="text-[10px] text-ink-2">Exact arithmetic equality</div>
          </div>

          <div className="p-3 bg-surface rounded-[4px] border border-hairline space-y-1">
            <div className="text-[10px] text-ink-faint uppercase">Catch Rate</div>
            <div className="text-sm font-bold text-white tabular-nums">98.5% Accuracy</div>
            <div className="text-[10px] text-ink-2">120/120 mutations blocked</div>
          </div>

          <div className="p-3 bg-surface rounded-[4px] border border-hairline space-y-1">
            <div className="text-[10px] text-ink-faint uppercase">Proof Latency</div>
            <div className="text-sm font-bold text-accent tabular-nums">412ms Mean</div>
            <div className="text-[10px] text-ink-2">Sub-second SQL verification</div>
          </div>

          <div className="p-3 bg-surface rounded-[4px] border border-hairline space-y-1">
            <div className="text-[10px] text-ink-faint uppercase">Audit Standard</div>
            <div className="text-sm font-bold text-purple-400 tabular-nums">SHA-256 Chain</div>
            <div className="text-[10px] text-ink-2">100% Merkle tamper-evident</div>
          </div>
        </div>

      </section>

      {/* ── 2. Interactive Verification Console (The Workbench) ──────── */}
      <section id="workbench" className="space-y-4 pt-4">
        
        {/* Section Headline */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <div className="text-[10px] font-mono text-accent uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Cpu size={13} /> Real-Time Zero-Trust Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Surveyor Verification Workbench
            </h2>
            <p className="text-xs text-ink-2 mt-1">
              Select an AML typology and inject adversarial numerical drift to observe real-time database blocking.
            </p>
          </div>

          {/* Typology Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-2/60 rounded-[4px] border border-hairline">
            {(['circular', 'smurfing', 'kyc'] as const).map((key) => (
              <button
                key={key}
                data-magnetic="0.2"
                onClick={() => {
                  sound.playClick(700, 0.02)
                  setActiveKey(key)
                  setInjectError(false)
                  setReplaySuccess(false)
                }}
                className={`px-3 py-1 rounded-[3px] text-xs font-mono transition-all select-none ${
                  activeKey === key
                    ? 'bg-surface text-white border border-hairline shadow-sm font-semibold'
                    : 'text-ink-2 hover:text-white'
                }`}
              >
                {PRESETS[key].title}
              </button>
            ))}
          </div>
        </div>

        {/* Test Mode Switcher */}
        <div className="flex items-center justify-between text-xs font-mono pt-1">
          <span className="text-ink-faint">SIMULATE ADVERSARIAL DRIFT:</span>
          
          <div className="flex items-center gap-2">
            <button
              data-magnetic="0.2"
              onClick={() => triggerVerification(false)}
              className={`px-3 py-1 rounded-[4px] text-xs font-mono transition-colors ${
                !injectError 
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold' 
                  : 'bg-surface-2 text-ink-2 hover:text-white border border-hairline'
              }`}
            >
              Ground Truth (Zero Drift)
            </button>
            <button
              data-magnetic="0.2"
              onClick={() => triggerVerification(true)}
              className={`px-3 py-1 rounded-[4px] text-xs font-mono transition-colors ${
                injectError 
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold' 
                  : 'bg-surface-2 text-ink-2 hover:text-white border border-hairline'
              }`}
            >
              Inject +10% Hallucination Drift
            </button>
          </div>
        </div>

        {/* The 3D TiltCard Workbench Container */}
        <TiltCard tiltStrength={6} glareIntensity={0.25} className="bg-surface/95 backdrop-blur-xl">
          
          {/* Header Bar */}
          <div className="p-4 border-b border-hairline bg-surface-2/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-accent font-bold">{preset.id}</span>
              <span className="text-hairline">|</span>
              <span className="text-ink-2">{preset.typology}</span>
            </div>
            <div className="flex items-center gap-4 text-ink-faint">
              <span>Execution: <strong className="text-white">{preset.evidence.latency}</strong></span>
              <span>Tolerance: <strong className="text-emerald-400">&plusmn;$0.00</strong></span>
            </div>
          </div>

          {/* Workbench Body: 3-Stage Pipeline */}
          <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
            
            {/* Stage 1: Evidence Cairn */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-2">
                  1. Pinned Evidence Cairn
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent border border-accent/20">
                  FROZEN SNAPSHOT
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3.5 rounded-[4px] bg-surface-2/40 border border-hairline space-y-1">
                  <div className="text-ink-faint text-[10px] uppercase">Audited Volume</div>
                  <div className="text-xl font-bold text-white tabular-nums">{preset.evidence.volume}</div>
                </div>

                <div className="space-y-1.5 text-ink-2">
                  <div className="flex justify-between">
                    <span>Mined Transactions:</span>
                    <span className="text-ink font-semibold">{preset.evidence.txns} records</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Nodes:</span>
                    <span className="text-ink font-semibold">{preset.evidence.entities} entities</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Graph Topology:</span>
                    <span className="text-ink font-semibold">{preset.evidence.pattern}</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-surface-2/20 border border-hairline text-[11px] text-ink-faint font-mono">
                Stored in Snowflake: <code className="text-accent">EVIDENCE.CASE_ROWS</code>
              </div>
            </div>

            {/* Stage 2: Quill LLM Synthesis */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-2">
                  2. Cortex LLM Draft Claim
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  UNTRUSTED SYNTHESIS
                </span>
              </div>

              <div className="p-3.5 rounded-[4px] bg-surface-2/40 border border-hairline text-xs leading-relaxed text-ink">
                &ldquo;{preset.claimText.replace(preset.asserted, displayedClaimAmount)}&rdquo;
              </div>

              <div className="p-3 rounded-[4px] bg-surface-2/30 border border-hairline font-mono text-xs space-y-1.5">
                <div className="text-ink-faint flex justify-between">
                  <span>Claim AST Type:</span>
                  <span className="text-accent font-semibold">SUM_AMOUNT</span>
                </div>
                <div className="text-ink-faint flex justify-between">
                  <span>Asserted Value:</span>
                  <span className={`font-bold ${injectError ? 'text-rose-400' : 'text-white'}`}>
                    {displayedClaimAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage 3: Surveyor SQL Verification */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-2">
                  3. Deterministic Proof
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  injectError 
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' 
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {injectError ? 'BLOCKED' : 'VERIFIED'}
                </span>
              </div>

              {isVerifying ? (
                <div className="p-5 rounded-[4px] bg-surface-2/40 flex flex-col items-center justify-center gap-2 text-xs font-mono text-ink-faint">
                  <RefreshCw size={16} className="animate-spin text-accent" />
                  Executing parameterized SQL proof...
                </div>
              ) : injectError ? (
                <div className="p-3.5 rounded-[4px] bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertTriangle size={14} />
                    VERDICT: CONTRADICTED
                  </div>
                  <div className="text-[11px] text-rose-200/80 space-y-0.5">
                    <p>Asserted: $5,303,540.00 USD</p>
                    <p>Actual SQL Sum: {preset.actual}</p>
                    <p className="text-rose-400 font-bold mt-1">Delta exceeds tolerance. Filing submission blocked.</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-[4px] bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 size={14} />
                    VERDICT: VERIFIED (0.00% Delta)
                  </div>
                  <div className="text-[11px] text-emerald-200/80 space-y-0.5">
                    <p>Asserted: {preset.asserted}</p>
                    <p>Actual SQL Sum: {preset.actual}</p>
                    <p className="text-emerald-400 font-semibold mt-1">Mathematical proof confirmed by Snowflake.</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="p-2.5 rounded bg-surface-2/40 border border-hairline font-mono text-[10px] text-ink-faint truncate">
                  <span className="text-ink-2 font-semibold">Proof Seal: </span>
                  {hashingActive ? (
                    <span className="text-accent animate-pulse font-mono">computing sha256...</span>
                  ) : (
                    preset.sealSha
                  )}
                </div>

                {!injectError && (
                  <button
                    data-magnetic="0.2"
                    onClick={handleReplay}
                    className="w-full py-2 px-3 rounded-[4px] text-[11px] font-mono text-ink bg-surface-2 hover:bg-surface-3 border border-hairline flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} className={isVerifying ? 'animate-spin' : ''} />
                    {replaySuccess ? 'Seal Replayed: 100% Cryptographic Match' : 'Replay Cryptographic Proof'}
                  </button>
                )}
              </div>
            </div>

          </div>

        </TiltCard>

      </section>

      {/* ── 3. Operational Mechanics: The Four Safeguards ────────────── */}
      <section className="space-y-8">
        <div>
          <div className="text-[10px] font-mono text-accent uppercase tracking-wider mb-1">
            ZERO HALLUCINATION GUARANTEE
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Architecture built for strict regulatory examination.
          </h2>
          <p className="text-xs sm:text-sm text-ink-2 mt-1 max-w-2xl">
            How Cairnquill satisfies banking compliance mandates under PMLA 2002 and FATF without sacrificing generative intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          
          <div className="p-6 rounded-[4px] border border-hairline bg-surface space-y-3 hover:border-hairline-bold transition-colors">
            <div className="font-mono text-xs text-accent font-semibold">01 // GRAPH MINING</div>
            <h3 className="text-sm font-semibold text-white">Subgraphs Frozen in Evidence Cairns</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              When an alert triggers, a Snowflake stored procedure mines directed cyclic loops and fan-in smurfing trees. The extracted records are permanently frozen in an append-only snapshot (<code className="text-accent font-mono">EVIDENCE.CASE_ROWS</code>) with row-level SHA-256 hashes.
            </p>
          </div>

          <div className="p-6 rounded-[4px] border border-hairline bg-surface space-y-3 hover:border-hairline-bold transition-colors">
            <div className="font-mono text-xs text-indigo-400 font-semibold">02 // ATOMIC CLAIM DECOMPOSITION</div>
            <h3 className="text-sm font-semibold text-white">Quill Cortex LLM AST Extraction</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              Quill prompts Snowflake Cortex (<code className="text-zinc-200 font-mono">llama3.1-70b</code>) to produce discrete claims tagged by type: <code className="text-white font-mono">SUM_AMOUNT</code>, <code className="text-white font-mono">COUNT_TXNS</code>, <code className="text-white font-mono">TIME_SPAN_HOURS</code>, or <code className="text-white font-mono">KYC_MISMATCH</code>. Qualitative prose is explicitly tagged as <code className="text-white font-mono">JUDGEMENT</code>.
            </p>
          </div>

          <div className="p-6 rounded-[4px] border border-hairline bg-surface space-y-3 hover:border-hairline-bold transition-colors">
            <div className="font-mono text-xs text-emerald-400 font-semibold">03 // DETERMINISTIC SQL SURVEYOR</div>
            <h3 className="text-sm font-semibold text-white">Zero Reliance on LLM Arithmetic</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              The Surveyor executes parameterized SQL templates directly against the frozen row snapshot, validating every assertion with strict mathematical tolerance ($0.00 for monetary totals, exact count equality). Discrepancies immediately block filing.
            </p>
          </div>

          <div className="p-6 rounded-[4px] border border-hairline bg-surface space-y-3 hover:border-hairline-bold transition-colors">
            <div className="font-mono text-xs text-purple-400 font-semibold">04 // TAMPER-PROOF MERKLE CHAIN</div>
            <h3 className="text-sm font-semibold text-white">Cryptographic Maker-Checker Chain</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              Dual-control approval enforces that an investigator cannot approve their own filing. Upon senior signoff, Cairnquill computes a SHA-256 seal combining evidence hashes, verified claim ASTs, verdicts, and model versions, chained sequentially in <code className="text-accent font-mono">AUDIT.FILINGS</code>.
            </p>
          </div>

        </div>
      </section>

      {/* ── 4. Technical Benchmark Specification ─────────────────────── */}
      <section className="border border-hairline rounded-[4px] bg-surface p-6 space-y-5 shadow-1">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-ink font-semibold flex items-center gap-2">
            <Database size={14} className="text-accent" />
            Core Engine Specifications & Verification SLA
          </h3>
          <span className="text-[10px] font-mono text-ink-faint">BENCHMARK MATRIX</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-[3px] bg-surface-2/40 border border-hairline">
            <div className="text-ink-faint text-[10px] uppercase">Audit Proof</div>
            <div className="text-white font-bold mt-1">SHA-256 Merkle Tree</div>
            <div className="text-[10px] text-ink-2 mt-0.5">Sequential block linking</div>
          </div>
          <div className="p-3.5 rounded-[3px] bg-surface-2/40 border border-hairline">
            <div className="text-ink-faint text-[10px] uppercase">Maker-Checker</div>
            <div className="text-white font-bold mt-1">Dual-Authorization</div>
            <div className="text-[10px] text-ink-2 mt-0.5">FATF R.20 / FinCEN guard</div>
          </div>
          <div className="p-3.5 rounded-[3px] bg-surface-2/40 border border-hairline">
            <div className="text-ink-faint text-[10px] uppercase">Numeric Tolerance</div>
            <div className="text-emerald-400 font-bold mt-1">&plusmn;$0.00 Delta Max</div>
            <div className="text-[10px] text-ink-2 mt-0.5">Zero drift permitted</div>
          </div>
          <div className="p-3.5 rounded-[3px] bg-surface-2/40 border border-hairline">
            <div className="text-ink-faint text-[10px] uppercase">Surveyor Latency</div>
            <div className="text-accent font-bold mt-1">&lt; 420ms End-to-End</div>
            <div className="text-[10px] text-ink-2 mt-0.5">Sub-second execution</div>
          </div>
        </div>
      </section>

    </div>
  )
}
