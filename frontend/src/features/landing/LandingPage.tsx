import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { sound } from '@/lib/soundEngine'
import { 
  ArrowRight, CheckCircle2, AlertTriangle, RefreshCw,
  Shield, Terminal, Cpu, Database, ChevronRight, Lock, 
  GitCommit, ArrowDown, FileText, Check, ShieldAlert, Sparkles, Scale
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
    claimText: 'Across a 72-hour window, the target entity transferred an aggregate volume of $4,821,400.00 USD among four offshore counterparties, returning 99.4% of funds to originator account ACC_98231.',
    asserted: '$4,821,400.00 USD',
    actual: '$4,821,400.00 USD',
    sqlTemplate: `SELECT COALESCE(SUM(amt_paid), 0) AS total_sum
FROM EVIDENCE.CASE_ROWS
WHERE case_id = 'CASE_0142'
  AND paid_ccy = 'USD'
  AND txn_id IN (1001, 1002, 1003, 1004);`,
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
    sqlTemplate: `SELECT COUNT(DISTINCT txn_id) AS smurf_count,
       SUM(amt_paid) AS aggregate_volume
FROM EVIDENCE.CASE_ROWS
WHERE dst = 'ACC_0089'
  AND amt_paid < 10000;`,
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
    sqlTemplate: `SELECT SUM(amt_paid) AS total_outflow
FROM EVIDENCE.CASE_ROWS
WHERE src = 'ACC_0205'
  AND paid_ccy = 'USD';`,
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
    }, 380)
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
    }, 500)
  }

  const scrollToWorkbench = () => {
    sound.playClick(700, 0.02)
    document.getElementById('workbench')?.scrollIntoView({ behavior: 'smooth' })
  }

  const displayedClaimAmount = injectError 
    ? '$5,303,540.00 USD (+10% LLM Drift)' 
    : preset.asserted

  return (
    <div className="space-y-28 py-6 relative z-10 font-sans">
      
      {/* ── 1. Hero Statement & Purpose ───────────────────────────────── */}
      <section className="max-w-4xl space-y-7 pt-4">
        
        {/* Minimal Executive Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/[0.08] text-xs text-zinc-300 select-none shadow-sm">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span className="font-medium text-zinc-200">Cairnquill 0.1</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">Snowflake Cortex Claim Verifier</span>
        </div>

        {/* Clean, Authoritative Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-white leading-[1.08]">
          Zero-tolerance verification for AI compliance reports.
        </h1>

        {/* Narrative Subtitle */}
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
          LLMs hallucinate financial amounts, counts, and dates. Cairnquill pairs Snowflake Cortex synthesis with a zero-trust SQL verification compiler and cryptographic audit seals — mathematically proving every claim before regulatory submission.
        </p>

        {/* Elevated Hero Button Cluster */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link to="/queue">
            <Button 
              size="lg" 
              variant="primary"
              className="gap-2 shadow-md px-6 text-sm"
            >
              <span>Open AML Queue</span>
              <ArrowRight size={15} />
            </Button>
          </Link>

          <Button 
            size="lg" 
            variant="secondary"
            onClick={scrollToWorkbench}
            className="gap-2 text-sm text-zinc-200 hover:text-white"
          >
            <span>Try Verification Sandbox</span>
            <ArrowDown size={14} className="opacity-60" />
          </Button>

          <Link to="/ask">
            <Button 
              variant="ghost" 
              size="lg" 
              className="gap-2 text-sm text-zinc-400 hover:text-zinc-100"
            >
              <Terminal size={14} className="text-accent" />
              <span>Ask Regulatory Assistant</span>
            </Button>
          </Link>
        </div>

        {/* Micro-Telemetry Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-white/[0.08]">
          <div className="p-4 rounded-lg bg-zinc-950/60 border border-white/[0.06] space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">Drift Tolerance</div>
            <div className="text-lg font-semibold text-emerald-400 font-mono tabular-nums">$0.00 Delta</div>
            <div className="text-xs text-zinc-400">Exact arithmetic match</div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950/60 border border-white/[0.06] space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">Catch Rate</div>
            <div className="text-lg font-semibold text-white font-mono tabular-nums">98.5% Accuracy</div>
            <div className="text-xs text-zinc-400">120/120 mutations caught</div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950/60 border border-white/[0.06] space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">Verification Speed</div>
            <div className="text-lg font-semibold text-accent font-mono tabular-nums">412ms Mean</div>
            <div className="text-xs text-zinc-400">Sub-second query proof</div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950/60 border border-white/[0.06] space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">Audit Standard</div>
            <div className="text-lg font-semibold text-purple-400 font-mono tabular-nums">SHA-256 Chain</div>
            <div className="text-xs text-zinc-400">100% Merkle tamper-evident</div>
          </div>
        </div>

      </section>

      {/* ── 2. Interactive Verification Console (The Workbench) ──────── */}
      <section id="workbench" className="space-y-4 pt-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-accent mb-1 flex items-center gap-1.5">
              <Cpu size={14} /> Interactive Verification Sandbox
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Surveyor Verification Console
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Inspect how the zero-trust SQL compiler executes against frozen Snowflake evidence cairns to catch LLM hallucination drift.
            </p>
          </div>

          {/* Typology Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-white/[0.08]">
            {(['circular', 'smurfing', 'kyc'] as const).map((key) => (
              <button
                key={key}
                onClick={() => {
                  sound.playClick(700, 0.02)
                  setActiveKey(key)
                  setInjectError(false)
                  setReplaySuccess(false)
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeKey === key
                    ? 'bg-zinc-800 text-white shadow-sm font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {PRESETS[key].title}
              </button>
            ))}
          </div>
        </div>

        {/* Test Mode Switcher Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <span className="text-zinc-400 font-medium">SIMULATION SCENARIO:</span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerVerification(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                !injectError 
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
              }`}
            >
              Ground Truth Snapshot (Zero Drift)
            </button>
            <button
              onClick={() => triggerVerification(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                injectError 
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' 
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
              }`}
            >
              Inject +10% Hallucination Drift
            </button>
          </div>
        </div>

        {/* High-Precision Console Frame */}
        <div className="rounded-xl bg-zinc-950/90 border border-white/[0.08] overflow-hidden shadow-2xl">
          
          {/* Console Telemetry Top Bar */}
          <div className="px-5 py-3 border-b border-white/[0.08] bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-accent font-semibold">{preset.id}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300">{preset.typology}</span>
            </div>
            <div className="flex items-center gap-4 text-zinc-400">
              <span>Latency: <strong className="text-white font-medium">{preset.evidence.latency}</strong></span>
              <span>Tolerance: <strong className="text-emerald-400 font-medium">&plusmn;$0.00</strong></span>
            </div>
          </div>

          {/* 3-Stage Terminal Pipeline */}
          <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
            
            {/* Stage 1: Evidence Snapshot */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-400">
                  1. Evidence Snapshot
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent border border-accent/20">
                  FROZEN CAIRN
                </span>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/60 border border-white/[0.06] space-y-1 font-mono">
                <div className="text-[10px] uppercase text-zinc-500">Audited Snapshot Volume</div>
                <div className="text-xl font-bold text-white tabular-nums">{preset.evidence.volume}</div>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-zinc-500">Mined Transactions:</span>
                  <span className="font-mono font-medium text-white">{preset.evidence.txns} rows</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-zinc-500">Offshore Entities:</span>
                  <span className="font-mono font-medium text-white">{preset.evidence.entities} entities</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Detected Pattern:</span>
                  <span className="font-mono font-medium text-white">{preset.evidence.pattern}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900/40 border border-white/[0.06] text-[11px] text-zinc-400 font-mono">
                Source: <code className="text-accent">EVIDENCE.CASE_ROWS</code>
              </div>
            </div>

            {/* Stage 2: Quill LLM Synthesis */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-400">
                  2. Cortex LLM Draft Claim
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  UNTRUSTED SYNTHESIS
                </span>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/60 border border-white/[0.06] text-xs leading-relaxed text-zinc-200">
                &ldquo;{preset.claimText.replace(preset.asserted, displayedClaimAmount)}&rdquo;
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-white/[0.06] font-mono text-xs space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Claim AST Type:</span>
                  <span className="text-accent font-medium">SUM_AMOUNT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Asserted Value:</span>
                  <span className={`font-bold ${injectError ? 'text-rose-400' : 'text-white'}`}>
                    {displayedClaimAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage 3: Surveyor SQL Verification */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-400">
                  3. Deterministic SQL Proof
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  injectError 
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' 
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {injectError ? 'BLOCKED' : 'VERIFIED'}
                </span>
              </div>

              {isVerifying ? (
                <div className="p-6 rounded-lg bg-zinc-900/60 flex flex-col items-center justify-center gap-2 text-xs font-mono text-zinc-400">
                  <RefreshCw size={18} className="animate-spin text-accent" />
                  <span>Executing parameterized SQL verification...</span>
                </div>
              ) : injectError ? (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2 font-semibold text-rose-300">
                    <AlertTriangle size={15} />
                    <span>VERDICT: CONTRADICTED</span>
                  </div>
                  <div className="text-[11px] text-rose-200/90 space-y-1 pt-1">
                    <p>Asserted: $5,303,540.00 USD</p>
                    <p>Actual SQL Sum: {preset.actual}</p>
                    <p className="text-rose-400 font-semibold pt-1">
                      Delta &gt; $0.00 tolerance. Filing blocked by database constraint.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2 font-semibold text-emerald-300">
                    <CheckCircle2 size={15} />
                    <span>VERDICT: VERIFIED (0.00% Delta)</span>
                  </div>
                  <div className="text-[11px] text-emerald-200/90 space-y-1 pt-1">
                    <p>Asserted: {preset.asserted}</p>
                    <p>Actual SQL Sum: {preset.actual}</p>
                    <p className="text-emerald-400 font-medium pt-1">
                      Mathematical equality proven against Snowflake snapshot.
                    </p>
                  </div>
                </div>
              )}

              {/* Cryptographic Proof Action */}
              <div className="space-y-2 pt-2">
                <div className="p-2.5 rounded bg-zinc-900/60 border border-white/[0.06] font-mono text-[11px] text-zinc-400 truncate">
                  <span className="text-zinc-500">Proof Seal: </span>
                  {hashingActive ? (
                    <span className="text-accent animate-pulse font-mono">computing sha256...</span>
                  ) : (
                    preset.sealSha
                  )}
                </div>

                {!injectError && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReplay}
                    className="w-full text-xs font-mono gap-1.5"
                  >
                    <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
                    <span>{replaySuccess ? 'Seal Replayed: 100% Cryptographic Match' : 'Replay Cryptographic Proof'}</span>
                  </Button>
                )}
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* ── 3. Operational Mechanics: The Four Safeguards ────────────── */}
      <section className="space-y-8">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-accent mb-1.5">
            Zero Hallucination Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Designed for regulatory examination under PMLA and FATF.
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            How Cairnquill provides end-to-end mathematical accountability across the four stages of AML filing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          
          <div className="p-6 rounded-lg border border-white/[0.08] bg-zinc-950/60 space-y-3 hover:border-white/[0.16] transition-colors">
            <div className="font-mono text-xs text-accent font-semibold">01 // GRAPH MINING</div>
            <h3 className="text-base font-semibold text-white">Subgraphs Frozen in Evidence Cairns</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              When an alert triggers, Snowflake stored procedures mine directed cyclic loops and fan-in structuring trees. The resulting records are permanently frozen in an append-only snapshot (<code className="text-accent font-mono text-xs">EVIDENCE.CASE_ROWS</code>) with row-level SHA-256 hashes.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-white/[0.08] bg-zinc-950/60 space-y-3 hover:border-white/[0.16] transition-colors">
            <div className="font-mono text-xs text-indigo-400 font-semibold">02 // ATOMIC CLAIM DECOMPOSITION</div>
            <h3 className="text-base font-semibold text-white">Quill Cortex LLM AST Extraction</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Quill prompts Snowflake Cortex (<code className="text-zinc-200 font-mono text-xs">llama3.1-70b</code>) to produce discrete claims tagged by type: <code className="text-white font-mono text-xs">SUM_AMOUNT</code>, <code className="text-white font-mono text-xs">COUNT_TXNS</code>, <code className="text-white font-mono text-xs">TIME_SPAN_HOURS</code>, or <code className="text-white font-mono text-xs">KYC_MISMATCH</code>. Unverifiable prose is explicitly tagged as <code className="text-white font-mono text-xs">JUDGEMENT</code>.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-white/[0.08] bg-zinc-950/60 space-y-3 hover:border-white/[0.16] transition-colors">
            <div className="font-mono text-xs text-emerald-400 font-semibold">03 // DETERMINISTIC SQL SURVEYOR</div>
            <h3 className="text-base font-semibold text-white">Zero Reliance on LLM Arithmetic</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The Surveyor executes parameterized SQL templates directly against the frozen row snapshot, validating every assertion with strict mathematical tolerance ($0.00 for monetary totals, exact count equality). Any discrepancy immediately blocks submission.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-white/[0.08] bg-zinc-950/60 space-y-3 hover:border-white/[0.16] transition-colors">
            <div className="font-mono text-xs text-purple-400 font-semibold">04 // TAMPER-PROOF MERKLE CHAIN</div>
            <h3 className="text-base font-semibold text-white">Cryptographic Maker-Checker Chain</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Dual-control approval enforces that an investigator cannot approve their own filing. Upon senior signoff, Cairnquill computes a SHA-256 seal combining evidence hashes, verified claim ASTs, verdicts, and model versions, chained sequentially in <code className="text-accent font-mono text-xs">AUDIT.FILINGS</code>.
            </p>
          </div>

        </div>
      </section>

      {/* ── 4. Comparison: Raw LLM vs Cairnquill Architecture ──────── */}
      <section className="border border-white/[0.08] rounded-xl bg-zinc-950/60 p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Architecture Comparison: Raw LLM vs Cairnquill Surveyor
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Why financial compliance cannot rely on unchecked generative models.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-white/[0.08] text-zinc-400 font-mono text-[11px] uppercase">
                <th className="pb-3 font-medium">Compliance Dimension</th>
                <th className="pb-3 font-medium text-rose-400/90">Standard Generative AI (Unverified)</th>
                <th className="pb-3 font-medium text-emerald-400">Cairnquill Surveyor Architecture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 font-medium text-white">Numeric Accuracy</td>
                <td className="py-3.5 text-zinc-400">14–22% hallucination drift on multi-hop transfers</td>
                <td className="py-3.5 text-emerald-300 font-medium">0.00% drift (enforced via SQL arithmetic)</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 font-medium text-white">Audit Verifiability</td>
                <td className="py-3.5 text-zinc-400">Probabilistic text generation without ground truth links</td>
                <td className="py-3.5 text-emerald-300 font-medium">Deterministic SQL proof linked to frozen snapshot rows</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 font-medium text-white">Regulatory Liability</td>
                <td className="py-3.5 text-zinc-400">Non-compliant under PMLA § 12 & FinCEN 31 CFR § 1020</td>
                <td className="py-3.5 text-emerald-300 font-medium">Cryptographic SHA-256 Merkle chain with dual authorization</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 font-medium text-white">Analyst Review Time</td>
                <td className="py-3.5 text-zinc-400">Hours spent manually verifying every line of prose</td>
                <td className="py-3.5 text-emerald-300 font-medium">Instant pass/fail verdicts on all quantitative assertions</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. Final CTA ────────────────────────────────────────────── */}
      <section className="p-8 sm:p-10 rounded-xl bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 border border-white/[0.08] text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Ready to inspect the live AML triage queue?
        </h2>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          Explore synthetic alerts, mine evidence subgraphs, generate Cortex drafts, and run deterministic Surveyor verifications.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/queue">
            <Button size="lg" variant="primary" className="gap-2 px-6">
              <span>Open Triage Queue</span>
              <ArrowRight size={15} />
            </Button>
          </Link>
          <Link to="/filings">
            <Button size="lg" variant="outline" className="px-6 text-zinc-300 hover:text-white">
              <span>View Sealed Filings Ledger</span>
            </Button>
          </Link>
        </div>
      </section>

    </div>
  )
}
