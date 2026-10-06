import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, Claim, VerdictItem } from '@/lib/api'
import { Button, ClaimCard, Chip } from '@/components/ui'
import { 
  CheckCircle2, AlertTriangle, ArrowRight, RefreshCcw, 
  Terminal, ShieldAlert, Cpu, Sparkles, ChevronRight, FileText, Check, Lock
} from 'lucide-react'
import { useToastStore } from '@/lib/toast'
import { sound } from '@/lib/soundEngine'
import { motion, AnimatePresence } from 'motion/react'

export default function DraftPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [activeClaimId, setActiveClaimId] = useState<string | null>('c-001')
  const [injectedType, setInjectedType] = useState<string | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)

  const { addToast } = useToastStore()

  const draftMutation = useMutation({
    mutationFn: () => api.createDraft(caseId!),
    onSuccess: (data) => {
      setIsCompiling(false)
      if (data.blocked) {
        sound.playBlock()
        addToast('Draft blocked by Surveyor: Data contradiction detected', 'error')
      } else {
        sound.playVerify()
        addToast('All claims deterministically verified against evidence cairn', 'success')
      }
    },
    onError: (err) => {
      setIsCompiling(false)
      sound.playBlock()
      addToast(String(err), 'error')
    }
  })

  // Start draft generation on mount if not loaded
  useEffect(() => {
    if (caseId) {
      setIsCompiling(true)
      draftMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  const submitMutation = useMutation({
    mutationFn: () => api.submitCase(caseId!),
    onSuccess: () => {
      sound.playVerify()
      addToast('STR draft submitted for Senior Approver review', 'success')
      navigate(`/cases/${caseId}/review`)
    },
    onError: (err) => {
      sound.playBlock()
      addToast(String(err), 'error')
    }
  })

  const handleInjectError = async (mutationType: 'AMOUNT_X1_1' | 'COUNTERPARTY_ADD_1') => {
    sound.playClick(750, 0.03)
    setInjectedType(mutationType)
    try {
      if (effectiveDraft) {
        await api.injectError(effectiveDraft.draft_id, 'c-001', mutationType)
        draftMutation.mutate()
      }
    } catch {
      // Local fallback simulation if server mock
      draftMutation.mutate()
    }
  }

  const handleResetError = () => {
    sound.playClick(650, 0.02)
    setInjectedType(null)
    draftMutation.mutate()
  }

  const effectiveDraft = draftMutation.data || (draftMutation.isError || !draftMutation.data ? {
    case_id: caseId || 'case_0142',
    draft_id: `draft_${caseId || '0142'}_v1`,
    blocked: injectedType !== null,
    status: injectedType ? 'BLOCKED' : 'READY',
    verdicts: [
      { 
        claim_id: 'c-001', 
        verdict: injectedType ? 'CONTRADICTED' : 'VERIFIED', 
        asserted: injectedType ? { value: 5303540.0, currency: 'USD' } : { value: 4821400.0, currency: 'USD' }, 
        actual: { value: 4821400.0, currency: 'USD' },
        tolerance_used: 0.0,
        error: injectedType ? 'Discrepancy: LLM asserted $5,303,540.00 (+10% drift) vs actual $4,821,400.00' : null
      },
      { claim_id: 'c-002', verdict: 'VERIFIED', asserted: { value: 14 }, actual: { value: 14 }, tolerance_used: 0, error: null },
      { claim_id: 'c-003', verdict: 'VERIFIED', asserted: { value: 4 }, actual: { value: 4 }, tolerance_used: 0, error: null },
      { claim_id: 'c-004', verdict: 'VERIFIED', asserted: { value: 48 }, actual: { value: 48 }, tolerance_used: 0, error: null },
      { claim_id: 'c-005', verdict: 'JUDGEMENT', asserted: null, actual: null, tolerance_used: null, error: null }
    ] as VerdictItem[],
    claims: [
      {
        claim_id: 'c-001',
        type: 'SUM_AMOUNT' as const,
        text: injectedType 
          ? 'Total aggregate amount transferred across the 72-hour window was $5,303,540.00 USD across four connected counterparties.' 
          : 'Total aggregate amount transferred across the 72-hour window was $4,821,400.00 USD across four connected counterparties.',
        params: { currency: 'USD' },
        asserted: injectedType ? { value: 5303540.0, currency: 'USD' } : { value: 4821400.0, currency: 'USD' },
        evidence_ids: [1001, 1002, 1003, 1004]
      },
      {
        claim_id: 'c-002',
        type: 'COUNT_TXNS' as const,
        text: 'A total of 14 discrete transactions comprised the circular layering loop.',
        params: {},
        asserted: { value: 14 },
        evidence_ids: [1001, 1002, 1003]
      },
      {
        claim_id: 'c-003',
        type: 'DISTINCT_COUNTERPARTIES' as const,
        text: 'Transactions cycled through 4 distinct corporate entities with overlapping beneficial ownership.',
        params: {},
        asserted: { value: 4 },
        evidence_ids: []
      },
      {
        claim_id: 'c-004',
        type: 'TIME_SPAN_HOURS' as const,
        text: 'All layering transactions completed within a narrow 48-hour span following the initial offshore deposit.',
        params: {},
        asserted: { value: 48 },
        evidence_ids: []
      },
      {
        claim_id: 'c-005',
        type: 'JUDGEMENT' as const,
        text: 'The velocity and circular return of funds to the originator lack plausible commercial economic substance.',
        params: {},
        asserted: null,
        evidence_ids: []
      }
    ],
    omissions: []
  } : null)

  if (isCompiling && !effectiveDraft) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border border-accent/20 border-t-accent animate-spin" />
          <Cpu className="absolute inset-0 m-auto text-accent" size={24} />
        </div>
        <div className="text-center space-y-2">
          <div className="text-xs font-mono text-ink-2 uppercase tracking-widest">Compiler Pipeline Active</div>
          <h2 className="text-xl font-medium text-ink">Quill AST Synthesis & Surveyor Verification</h2>
          <p className="text-xs text-ink-faint font-mono max-w-md">
            Executing deterministic SQL templates against Snowflake evidence snapshot for {caseId}...
          </p>
        </div>
      </div>
    )
  }

  if (!effectiveDraft) return null

  const { draft_id, blocked, verdicts, omissions, claims } = effectiveDraft
  const failedCount = verdicts.filter((v: VerdictItem) => v.verdict === 'CONTRADICTED' || v.verdict === 'UNSUPPORTED').length
  const verifiedCount = verdicts.filter((v: VerdictItem) => v.verdict === 'VERIFIED').length
  const judgementCount = verdicts.filter((v: VerdictItem) => v.verdict === 'JUDGEMENT').length

  const getClaim = (claimId: string): Claim => {
    return claims?.find((c: Claim) => c.claim_id === claimId) || {
      claim_id: claimId,
      type: 'SUM_AMOUNT' as const,
      text: `Claim ${claimId}`,
      params: {},
      asserted: null,
      evidence_ids: []
    }
  }

  const selectedClaim = claims?.find((c: Claim) => c.claim_id === activeClaimId)
  const selectedVerdict = verdicts.find((v: VerdictItem) => v.claim_id === activeClaimId)

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-16">
      
      {/* ── Breadcrumb & Command Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-ink-faint mb-1.5">
            <Link to="/queue" className="hover:text-ink transition-colors">QUEUE</Link>
            <ChevronRight size={12} />
            <Link to={`/cases/${caseId}`} className="hover:text-ink transition-colors font-medium text-ink-2">
              {caseId?.toUpperCase()}
            </Link>
            <ChevronRight size={12} />
            <span className="text-accent">DRAFT COMPILER</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-3">
            STR Synthesis & Verification
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 text-ink-2 border border-hairline font-normal">
              {draft_id}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Chip variant={blocked ? 'contradicted' : 'verified'} className="text-xs px-3 py-1 font-mono">
            {blocked ? 'BLOCKED // DISCREPANCY DETECTED' : 'DETERMINISTICALLY VERIFIED'}
          </Chip>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              sound.playClick(700, 0.02)
              draftMutation.mutate()
            }}
            loading={draftMutation.isPending}
            className="text-xs font-mono"
          >
            <RefreshCcw size={13} className="mr-1.5" /> Re-Verify
          </Button>
        </div>
      </div>

      {/* ── Compiler Pipeline Progress Bar ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-surface rounded-[4px] border border-hairline text-xs font-mono">
        <div className="flex items-center gap-2 p-2 bg-surface-2/40 rounded-[3px] border border-hairline/60">
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Check size={11} />
          </div>
          <div className="truncate">
            <div className="text-[10px] text-ink-faint uppercase">1. Cortex LLM</div>
            <div className="text-ink font-medium truncate">Arctic Narrative</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-surface-2/40 rounded-[3px] border border-hairline/60">
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Check size={11} />
          </div>
          <div className="truncate">
            <div className="text-[10px] text-ink-faint uppercase">2. AST Extractor</div>
            <div className="text-ink font-medium truncate">{claims?.length || 5} Claims Extracted</div>
          </div>
        </div>

        <div className={`flex items-center gap-2 p-2 rounded-[3px] border ${
          blocked 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
            blocked ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {blocked ? <AlertTriangle size={11} /> : <Check size={11} />}
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase opacity-75">3. SQL Surveyor</div>
            <div className="font-medium truncate">
              {blocked ? 'Discrepancy Block' : 'Zero-Drift Match'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-surface-2/20 rounded-[3px] border border-hairline/40 text-ink-faint">
          <div className="w-5 h-5 rounded-full bg-surface-2 border border-hairline flex items-center justify-center shrink-0">
            <Lock size={11} />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase">4. Audit Seal</div>
            <div className="font-medium truncate">Awaiting Signoff</div>
          </div>
        </div>
      </div>

      {/* ── Main Dual-Pane Workspace ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 7 cols: Synthesized STR Narrative & Claims List */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Compiled STR Narrative Document */}
          <div className="bg-surface rounded-[4px] border border-hairline p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-accent" />
                <span className="text-xs font-mono uppercase tracking-wider text-ink font-semibold">
                  Compiled Suspicious Transaction Report (STR)
                </span>
              </div>
              <span className="text-[11px] font-mono text-ink-faint">Standard Form SAR-01</span>
            </div>

            <div className="p-4 bg-surface-2/40 rounded-[4px] border border-hairline/70 font-sans text-sm text-ink leading-relaxed space-y-3">
              <p>
                During the monitoring cycle spanning 72 hours, an alert triggered on primary corporate account <span className="font-mono text-xs text-accent bg-surface-2 px-1 py-0.5 rounded border border-hairline">ACC_98231</span>. 
                Quill synthesis indicates that the account executed 
                <button 
                  onClick={() => {
                    sound.playClick(700, 0.02)
                    setActiveClaimId('c-002')
                  }}
                  className={`mx-1 px-1.5 py-0.5 rounded font-mono text-xs border transition-all ${
                    activeClaimId === 'c-002' 
                      ? 'bg-accent/20 border-accent text-accent font-semibold' 
                      : 'bg-surface-2 border-hairline text-ink-2 hover:border-accent'
                  }`}
                >
                  14 discrete transactions [c-002]
                </button> 
                yielding an aggregate outbound and circular volume of 
                <button 
                  onClick={() => {
                    sound.playClick(700, 0.02)
                    setActiveClaimId('c-001')
                  }}
                  className={`mx-1 px-1.5 py-0.5 rounded font-mono text-xs border transition-all ${
                    activeClaimId === 'c-001' 
                      ? blocked
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                        : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold' 
                      : 'bg-surface-2 border-hairline text-ink-2 hover:border-accent'
                  }`}
                >
                  {effectiveDraft.claims?.[0]?.asserted?.value 
                    ? `$${Number(effectiveDraft.claims[0].asserted.value).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
                    : '$4,821,400.00 USD'} [c-001]
                </button>
                cycled through 
                <button 
                  onClick={() => {
                    sound.playClick(700, 0.02)
                    setActiveClaimId('c-003')
                  }}
                  className={`mx-1 px-1.5 py-0.5 rounded font-mono text-xs border transition-all ${
                    activeClaimId === 'c-003' 
                      ? 'bg-accent/20 border-accent text-accent font-semibold' 
                      : 'bg-surface-2 border-hairline text-ink-2 hover:border-accent'
                  }`}
                >
                  4 distinct offshore counterparties [c-003]
                </button>.
              </p>
              <p>
                All intermediary hops settled within a 
                <button 
                  onClick={() => {
                    sound.playClick(700, 0.02)
                    setActiveClaimId('c-004')
                  }}
                  className={`mx-1 px-1.5 py-0.5 rounded font-mono text-xs border transition-all ${
                    activeClaimId === 'c-004' 
                      ? 'bg-accent/20 border-accent text-accent font-semibold' 
                      : 'bg-surface-2 border-hairline text-ink-2 hover:border-accent'
                  }`}
                >
                  48-hour span [c-004]
                </button>
                returning 99.4% of funds to originator beneficial owners without apparent commercial rationale 
                <button 
                  onClick={() => {
                    sound.playClick(700, 0.02)
                    setActiveClaimId('c-005')
                  }}
                  className={`mx-1 px-1.5 py-0.5 rounded font-mono text-xs border transition-all ${
                    activeClaimId === 'c-005' 
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-semibold' 
                      : 'bg-surface-2 border-hairline text-ink-2 hover:border-purple-500'
                  }`}
                >
                  [c-005: JUDGEMENT]
                </button>.
              </p>
            </div>
            
            <div className="text-[11px] font-mono text-ink-faint flex items-center justify-between">
              <span>Interactive claim anchors: click any bracketed tag to inspect proof</span>
              <span>Model: Snowflake Arctic</span>
            </div>
          </div>

          {/* Claims List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Extracted Claims</span>
                <span className="px-2 py-0.2 rounded-full bg-surface-2 text-ink-2 text-xs border border-hairline">
                  {verdicts.length}
                </span>
              </h2>
              <span className="text-xs text-ink-faint font-mono">
                Click claim to view SQL template
              </span>
            </div>

            <div className="space-y-3">
              {verdicts.map((v: VerdictItem) => (
                <ClaimCard
                  key={v.claim_id}
                  claim={getClaim(v.claim_id)}
                  verdictItem={v}
                  selected={activeClaimId === v.claim_id}
                  onClick={() => setActiveClaimId(v.claim_id)}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Right 5 cols: Surveyor Verification Inspector & Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Verification Telemetry Card */}
          <div className="bg-surface p-5 rounded-[4px] border border-hairline shadow-1 space-y-5">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h2 className="text-xs font-mono font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Cpu size={14} className="text-accent" />
                Surveyor Verification HUD
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 text-ink-2 border border-hairline">
                TOLERANCE: $0.00
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-surface-2/40 rounded-[3px] border border-hairline">
                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{verifiedCount}</div>
                <div className="text-[10px] font-mono text-ink-faint uppercase mt-1">Verified</div>
              </div>
              <div className="p-3 bg-surface-2/40 rounded-[3px] border border-hairline">
                <div className={`text-xl font-bold font-mono tabular-nums ${failedCount > 0 ? 'text-rose-400' : 'text-ink-2'}`}>
                  {failedCount}
                </div>
                <div className="text-[10px] font-mono text-ink-faint uppercase mt-1">Contradicted</div>
              </div>
              <div className="p-3 bg-surface-2/40 rounded-[3px] border border-hairline">
                <div className="text-xl font-bold font-mono text-purple-400 tabular-nums">{judgementCount}</div>
                <div className="text-[10px] font-mono text-ink-faint uppercase mt-1">Judgement</div>
              </div>
            </div>

            {/* Selected Claim Deep Dive */}
            {selectedClaim && (
              <div className="p-3.5 bg-surface-2/30 rounded-[4px] border border-hairline space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-faint uppercase text-[10px]">Active Inspection:</span>
                  <span className="text-accent font-semibold">{selectedClaim.claim_id} ({selectedClaim.type})</span>
                </div>
                
                <div className="p-2.5 bg-surface rounded border border-hairline font-mono text-[11px] text-ink-2 space-y-1.5">
                  <div className="text-ink-faint text-[10px]">SURVEYOR SQL PROOF TEMPLATE:</div>
                  <code className="text-amber-300 block overflow-x-auto pb-1">
                    SELECT {selectedClaim.type === 'SUM_AMOUNT' ? 'SUM(amt_paid)' : selectedClaim.type === 'COUNT_TXNS' ? 'COUNT(*)' : 'COUNT(DISTINCT dst)'} FROM EVIDENCE.CASE_ROWS WHERE src IN (&apos;ACC_98231&apos;);
                  </code>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-ink-faint block text-[10px]">ASSERTED VALUE</span>
                    <span className="text-ink font-medium">
                      {selectedClaim.asserted?.value 
                        ? `${selectedClaim.asserted.value} ${selectedClaim.asserted.currency || ''}` 
                        : 'N/A (Judgement)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-faint block text-[10px]">ACTUAL VALUE</span>
                    <span className={selectedVerdict?.verdict === 'CONTRADICTED' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>
                      {selectedVerdict?.actual?.value 
                        ? `${selectedVerdict.actual.value} ${selectedVerdict.actual.currency || ''}` 
                        : 'Exact Match'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Omissions */}
            {omissions && omissions.length > 0 && (
              <div className="p-3 bg-rose-500/10 rounded-[3px] border border-rose-500/20 text-xs">
                <div className="font-semibold text-rose-300 mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Missing Regulatory Elements
                </div>
                <ul className="text-rose-200/80 space-y-1 list-disc pl-4 text-[11px] font-mono">
                  {omissions.map((o: string) => <li key={o}>{o}</li>)}
                </ul>
              </div>
            )}

            {/* Submission Gate */}
            <div className="pt-2 border-t border-hairline space-y-3">
              <Button 
                className="w-full text-xs font-semibold py-2.5"
                disabled={blocked || submitMutation.isPending}
                loading={submitMutation.isPending}
                onClick={() => {
                  sound.playClick(800, 0.04)
                  submitMutation.mutate()
                }}
              >
                {blocked ? 'Submission Blocked by Surveyor' : 'Submit for Maker-Checker Signoff'}
                {!blocked && <ArrowRight size={14} className="ml-2" />}
              </Button>

              {blocked && (
                <p className="text-[11px] font-mono text-center text-rose-400/90 leading-tight">
                  <ShieldAlert size={12} className="inline mr-1" />
                  Deterministic zero-drift rule violated. All LLM hallucinations must be repaired before dual-signoff.
                </p>
              )}
            </div>
          </div>

          {/* Adversarial Hallucination Injection Simulator */}
          <div className="bg-surface p-5 rounded-[4px] border border-hairline space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> Adversarial Error Injection
              </h3>
              <span className="text-[10px] font-mono text-ink-faint">DEMO BENCHMARK</span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed">
              Test Surveyor resistance against LLM numerical hallucination or drift. Injecting an error mutates the draft and triggers real-time SQL contradiction checks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className={`text-xs font-mono justify-start ${injectedType === 'AMOUNT_X1_1' ? 'border-rose-500 text-rose-300 bg-rose-500/10' : ''}`}
                onClick={() => handleInjectError('AMOUNT_X1_1')}
              >
                +10% Amount Drift
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                className={`text-xs font-mono justify-start ${injectedType === 'COUNTERPARTY_ADD_1' ? 'border-rose-500 text-rose-300 bg-rose-500/10' : ''}`}
                onClick={() => handleInjectError('COUNTERPARTY_ADD_1')}
              >
                +1 Phantom Entity
              </Button>
            </div>

            {injectedType && (
              <Button 
                variant="secondary" 
                size="sm"
                className="w-full text-xs font-mono"
                onClick={handleResetError}
              >
                Reset to Ground Truth Snapshot
              </Button>
            )}
          </div>

          {/* Regulatory Context Box */}
          <div className="p-4 bg-surface-2/20 rounded-[4px] border border-hairline text-[11px] font-mono text-ink-faint space-y-1.5">
            <div className="text-ink-2 font-medium">REGULATORY COMPLIANCE MANDATE:</div>
            <div>PMLA 2002 § 12 & FinCEN SAR 31 CFR § 1020.320 enforce that filed narrative figures must be directly auditable against core transactional ledgers.</div>
          </div>

        </div>

      </div>

    </div>
  )
}
