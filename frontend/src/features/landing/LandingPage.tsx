import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { 
  ArrowRight, CheckCircle2, AlertTriangle, RefreshCw
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
      entities: 4
    },
    claimText: 'Across a 72-hour window, the target entity transferred an aggregate volume of $4,821,400.00 USD among four offshore counterparties, returning funds to originator account ACC_98231.',
    asserted: '$4,821,400.00 USD',
    actual: '$4,821,400.00 USD',
    sqlTemplate: 'SELECT SUM(amt_paid) FROM EVIDENCE.CASE_ROWS WHERE src IN (%s) AND paid_ccy = %s',
    sealSha: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  smurfing: {
    id: 'CASE_0089',
    title: 'Smurfing & Structuring',
    typology: 'HIGH_VELOCITY_FAN_IN',
    evidence: {
      txns: 28,
      volume: '$274,800.00 USD',
      pattern: '28 transactions each under $10,000 PMLA threshold',
      entities: 19
    },
    claimText: 'The account received 28 discrete inbound transfers totaling $274,800.00 USD within 36 hours, each structured strictly below the mandatory reporting threshold of $10,000.',
    asserted: '$274,800.00 USD',
    actual: '$274,800.00 USD',
    sqlTemplate: 'SELECT COUNT(*), SUM(amt_paid) FROM EVIDENCE.CASE_ROWS WHERE dst = %s AND amt_paid < 10000',
    sealSha: '8f4a3e2b1c9d0a7f8e5d3c2b1a9f8e7d6c5b4a3e2b1c9d0a7f8e5d3c2b1a9f8e'
  },
  kyc: {
    id: 'CASE_0205',
    title: 'KYC Income Deviation',
    typology: 'PROFILE_INCONGRUENCE',
    evidence: {
      txns: 8,
      volume: '$3,940,000.00 USD',
      pattern: '6,566% deviation from declared income profile',
      entities: 2
    },
    claimText: 'Primary account executed $3,940,000.00 USD in aggregate transfers during the cycle, diverging by 65.6x from declared monthly salary profile of $60,000.00 USD.',
    asserted: '$3,940,000.00 USD',
    actual: '$3,940,000.00 USD',
    sqlTemplate: 'SELECT SUM(amt_paid) FROM EVIDENCE.CASE_ROWS WHERE src = %s',
    sealSha: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
  }
}

export default function LandingPage() {
  const [activeKey, setActiveKey] = useState<'circular' | 'smurfing' | 'kyc'>('circular')
  const [injectError, setInjectError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const preset = PRESETS[activeKey]

  const triggerVerification = (hallucinate: boolean) => {
    setInjectError(hallucinate)
    setIsVerifying(true)
    setTimeout(() => {
      setIsVerifying(false)
    }, 450)
  }

  const displayedClaimAmount = injectError 
    ? '$5,303,540.00 USD (+10% LLM Drift)' 
    : preset.asserted

  return (
    <div className="space-y-24 py-8">
      
      {/* ── 1. Hero Statement & Purpose ───────────────────────────────── */}
      <section className="max-w-4xl space-y-6">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08]">
          Deterministic verification for generative compliance intelligence.
        </h1>
        <p className="text-lg sm:text-xl text-ink-2 max-w-2xl font-normal leading-relaxed">
          Suspicious Transaction Reports cannot tolerate arithmetic hallucinations. Cairnquill pairs Snowflake Cortex LLM draft synthesis with a zero-trust SQL verification compiler and cryptographic audit seals.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link to="/queue">
            <Button size="lg" className="rounded-full px-7 font-semibold shadow-md">
              Open AML Queue <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
          <Link to="/ask">
            <Button variant="secondary" size="lg" className="rounded-full px-7 font-semibold">
              Query Regulatory Knowledge Base
            </Button>
          </Link>
        </div>
      </section>

      {/* ── 2. Interactive Verification Console (The Workbench) ──────── */}
      <section className="space-y-4">
        
        {/* Typology Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-ink-2 uppercase tracking-wider">Inspect Typology:</span>
            {(['circular', 'smurfing', 'kyc'] as const).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setActiveKey(key)
                  setInjectError(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeKey === key
                    ? 'bg-surface-2 text-white border border-hairline font-semibold shadow-sm'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                {PRESETS[key].title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-ink-2">Surveyor Error Injection:</span>
            <button
              onClick={() => triggerVerification(false)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                !injectError 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold' 
                  : 'bg-surface-2 text-ink-2 hover:text-ink'
              }`}
            >
              Exact Ground Truth
            </button>
            <button
              onClick={() => triggerVerification(true)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                injectError 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold' 
                  : 'bg-surface-2 text-ink-2 hover:text-ink'
              }`}
            >
              Inject +10% Hallucination
            </button>
          </div>
        </div>

        {/* The Workbench Grid */}
        <div className="border border-hairline rounded-card bg-surface overflow-hidden shadow-2">
          
          {/* Header Bar */}
          <div className="p-4 border-b border-hairline bg-surface-2/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 font-bold">{preset.id}</span>
              <span className="text-hairline">•</span>
              <span className="text-ink-2">{preset.typology}</span>
            </div>
            <div className="flex items-center gap-4 text-ink-2">
              <span>Snowflake Cortex: <strong className="text-ink">llama3.1-70b</strong></span>
              <span>Tolerance: <strong className="text-emerald-400">&plusmn;$0.01</strong></span>
            </div>
          </div>

          {/* Workbench Body: 3-Stage Pipeline */}
          <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
            
            {/* Stage 1: Evidence Cairn */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-2">
                  1. Pinned Evidence
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  IMMUTABLE
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-surface-2/50 border border-hairline/60 space-y-1.5">
                  <div className="text-ink-2">Ground Truth Sum:</div>
                  <div className="text-lg font-bold text-white tabular-nums">{preset.evidence.volume}</div>
                </div>

                <div className="space-y-1 text-ink-2">
                  <div className="flex justify-between">
                    <span>Mined Records:</span>
                    <span className="text-ink font-semibold">{preset.evidence.txns} transactions</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connected Entities:</span>
                    <span className="text-ink font-semibold">{preset.evidence.entities} accounts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Graph Geometry:</span>
                    <span className="text-ink font-semibold">{preset.evidence.pattern}</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-ink-2 leading-relaxed">
                Evidence cairns are locked into <code className="text-cyan-300 font-mono">EVIDENCE.CASE_ROWS</code> via stored procedure before LLM synthesis begins.
              </p>
            </div>

            {/* Stage 2: Quill LLM Synthesis */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-2">
                  2. LLM Synthesized Claim
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  UNTRUSTED INPUT
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-2/40 border border-hairline text-xs leading-relaxed text-ink font-sans">
                &ldquo;{preset.claimText.replace(preset.asserted, displayedClaimAmount)}&rdquo;
              </div>

              <div className="p-3 rounded-lg bg-surface-2/30 border border-hairline/60 font-mono text-xs space-y-1">
                <div className="text-ink-2 flex justify-between">
                  <span>Claim AST Type:</span>
                  <span className="text-indigo-400 font-semibold">SUM_AMOUNT</span>
                </div>
                <div className="text-ink-2 flex justify-between">
                  <span>Asserted Value:</span>
                  <span className={`font-bold ${injectError ? 'text-rose-400' : 'text-ink'}`}>
                    {displayedClaimAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage 3: Surveyor SQL Verification */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-2">
                  3. Deterministic Verdict
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  injectError 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {injectError ? 'BLOCKED' : 'VERIFIED'}
                </span>
              </div>

              {isVerifying ? (
                <div className="p-6 rounded-lg bg-surface-2/40 flex flex-col items-center justify-center gap-2 text-xs font-mono text-ink-2">
                  <RefreshCw size={16} className="animate-spin text-accent" />
                  Executing parameterized SQL template...
                </div>
              ) : injectError ? (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertTriangle size={15} />
                    VERDICT: CONTRADICTED
                  </div>
                  <div className="text-[11px] text-rose-200/80 space-y-0.5">
                    <p>Asserted: $5,303,540.00 USD</p>
                    <p>Actual SQL Sum: {preset.actual}</p>
                    <p className="text-rose-400 font-bold mt-1">Delta &gt; $0.01 tolerance. Draft submission prohibited.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 size={15} />
                    VERDICT: VERIFIED (Exact Match)
                  </div>
                  <div className="text-[11px] text-emerald-200/80 space-y-0.5">
                    <p>Asserted: {preset.asserted}</p>
                    <p>Actual SQL Sum: {preset.actual}</p>
                    <p className="text-emerald-400 font-semibold mt-1">Ground truth match confirmed.</p>
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded bg-surface-2/40 border border-hairline font-mono text-[10px] text-zinc-400 truncate">
                <span className="text-zinc-500">Seal SHA: </span>
                {preset.sealSha}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 3. Operational Mechanics: The Four Safeguards ────────────── */}
      <section className="space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Architecture built for regulatory examination.
          </h2>
          <p className="text-sm text-ink-2 mt-1">
            How Cairnquill satisfies financial compliance requirements without sacrificing generative intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          <div className="p-6 rounded-card border border-hairline bg-surface space-y-3">
            <div className="font-mono text-xs text-cyan-400">01 / GRAPH MINING</div>
            <h3 className="text-base font-semibold text-white">Subgraphs Frozen in Evidence Cairns</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              When an ML alert triggers, a Snowflake stored procedure identifies directed cycles and fan-in trees using Dynamic Tables. The resulting rows are copied into an append-only snapshot table (<code className="text-cyan-300 font-mono">EVIDENCE.CASE_ROWS</code>) with individual row-level SHA hashes. Evidence is permanently frozen at investigation initiation.
            </p>
          </div>

          <div className="p-6 rounded-card border border-hairline bg-surface space-y-3">
            <div className="font-mono text-xs text-indigo-400">02 / STRUCTURED CLAIMS</div>
            <h3 className="text-base font-semibold text-white">Atomic Claim Decomposition</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              Quill prompts Snowflake Cortex (<code className="text-zinc-300 font-mono">llama3.1-70b</code>) to produce discrete claims tagged by type: <code className="text-ink font-mono">SUM_AMOUNT</code>, <code className="text-ink font-mono">COUNT_TXNS</code>, <code className="text-ink font-mono">TIME_SPAN_HOURS</code>, or <code className="text-ink font-mono">KYC_MISMATCH</code>. Unverifiable prose is explicitly classified as <code className="text-ink font-mono">JUDGEMENT</code> and marked clearly for human review.
            </p>
          </div>

          <div className="p-6 rounded-card border border-hairline bg-surface space-y-3">
            <div className="font-mono text-xs text-emerald-400">03 / DETERMINISTIC SQL</div>
            <h3 className="text-base font-semibold text-white">Zero Reliance on LLM Arithmetic</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              The Surveyor runs parameterized SQL templates directly against the frozen row snapshot, validating every assertion with strict mathematical tolerance ($0.01 for monetary totals, exact integer equality for transaction counts). An invalid claim blocks the case at the database level.
            </p>
          </div>

          <div className="p-6 rounded-card border border-hairline bg-surface space-y-3">
            <div className="font-mono text-xs text-rose-400">04 / TAMPER-PROOF AUDIT</div>
            <h3 className="text-base font-semibold text-white">Cryptographic Maker-Checker Chain</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              Dual-control approval is enforced in the backend: an investigator cannot approve their own submission. Upon approval, Cairnquill computes a SHA-256 seal combining evidence hashes, verified claim ASTs, verdicts, and model versions, chained to the previous seal in <code className="text-cyan-300 font-mono">AUDIT.FILINGS</code>.
            </p>
          </div>

        </div>
      </section>

      {/* ── 4. Regulatory Frameworks Alignment ───────────────────────── */}
      <section className="border-t border-hairline pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="text-xs font-mono text-ink-2 uppercase tracking-wider">Statutory Alignment</div>
          <div className="text-sm font-semibold text-white mt-1">Conforms to PMLA 2002, FATF Recommendation 20 & GCC CBUAE Rulebook</div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/queue">
            <Button className="rounded-full text-xs font-semibold px-5">
              Launch Queue <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
          <Link to="/eval">
            <Button variant="outline" className="rounded-full text-xs font-semibold px-5">
              Planted-Error Scoreboard
            </Button>
          </Link>
        </div>
      </section>

    </div>
  )
}
