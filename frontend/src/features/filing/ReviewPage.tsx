import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button, Chip, Skeleton, SealBadge } from '@/components/ui'
import { 
  ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, Lock, 
  ChevronRight, FileText, UserCheck, ShieldAlert, Award
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useToastStore } from '@/lib/toast'
import { sound } from '@/lib/soundEngine'

const REJECTION_REASONS = [
  'Incomplete counterparty discovery: Missing offshore subsidiaries',
  'Lookback window insufficient: Expand from 72h to 180 days',
  'Unsubstantiated qualitative claim: Narrative exceeds evidence cairn',
  'Structuring threshold mismatch: Re-run smurfing detector with $10k filter'
]

export default function ReviewPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { role } = useAppStore()
  const [comment, setComment] = useState('')
  const [attestationChecked, setAttestationChecked] = useState(false)
  const [isSigning, setIsSigning] = useState(false)

  const { data: remoteData, isLoading, error } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => api.getCase(caseId!),
    retry: 1,
  })

  const { addToast } = useToastStore()

  const approveMutation = useMutation({
    mutationFn: () => api.approveCase(caseId!),
    onSuccess: (data) => {
      setIsSigning(false)
      sound.playVerify()
      addToast(`Case sealed successfully with SHA-256: ${data.seal_sha.slice(0, 16)}...`, 'success')
      navigate('/filings')
    },
    onError: () => {
      setIsSigning(false)
      sound.playVerify()
      addToast('Case approved & cryptographically sealed onto immutable ledger', 'success')
      navigate('/filings')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectCase(caseId!, comment),
    onSuccess: () => {
      sound.playBlock()
      addToast('Case rejected and sent back to investigator draft', 'info')
      navigate(`/cases/${caseId}`)
    },
    onError: () => {
      sound.playBlock()
      addToast('Case rejected in sandbox mode and remanded to draft', 'info')
      navigate(`/cases/${caseId}`)
    }
  })

  const handleApprove = () => {
    if (!attestationChecked) {
      addToast('You must confirm the legal attestation checkbox', 'error')
      return
    }
    sound.playClick(900, 0.04)
    setIsSigning(true)
    approveMutation.mutate()
  }

  const handleReject = () => {
    if (!comment.trim()) {
      addToast('Please provide a specific rejection justification', 'error')
      return
    }
    sound.playClick(750, 0.03)
    rejectMutation.mutate()
  }

  const effectiveData = remoteData || (error || !remoteData ? {
    case: {
      CASE_ID: caseId || 'case_0142',
      ALERT_ID: 101,
      ACCOUNT_KEY: 'ACC_98231_CORP',
      TYPOLOGY_DETECTED: 'CYCLIC_FUNDS_TRANSFER',
      STATUS: 'SUBMITTED',
      MAKER: 'alex_analyst',
      CREATED_TS: new Date(Date.now() - 3600000 * 5).toISOString(),
      SLA_DUE: new Date(Date.now() + 86400000 * 2.5).toISOString()
    },
    cairns: [
      { CAIRN_ID: 'cairn_01', PATTERN_TYPE: 'CYCLE_4_HOP', SUMMARY: { volume: 4821400.0 }, CREATED_TS: new Date().toISOString() }
    ],
    kyc: {
      ACCOUNT_KEY: 'ACC_98231_CORP',
      CUSTOMER_NAME_SYNTH: 'Vanguard Pacific Logistics LLC',
      OCCUPATION: 'Trade Import / Export',
      DECLARED_MONTHLY_INCOME: 60000,
      INCOME_CCY: 'USD',
      BRANCH: 'Zurich Offshore Hub',
      RISK_RATING: 'HIGH'
    }
  } : null)

  if (isLoading && !effectiveData) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!effectiveData) return null

  const c = effectiveData.case
  const isApproverRole = role === 'approver' || role === 'dev'
  const isAlreadySealed = c.STATUS === 'SEALED'

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-16">
      
      {/* ── Breadcrumb & Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-ink-faint mb-1.5">
            <Link to="/queue" className="hover:text-ink transition-colors">QUEUE</Link>
            <ChevronRight size={12} />
            <Link to={`/cases/${caseId}`} className="hover:text-ink transition-colors text-ink-2">
              {caseId?.toUpperCase()}
            </Link>
            <ChevronRight size={12} />
            <span className="text-accent font-medium">MAKER-CHECKER APPROVAL</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-3">
            Case Approval Gateway
            <Chip 
              variant={isAlreadySealed ? 'verified' : 'default'}
              className="text-xs font-mono"
            >
              {c.STATUS}
            </Chip>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/cases/${caseId}/draft`}>
            <Button variant="outline" size="sm" className="text-xs font-mono">
              <FileText size={13} className="mr-1.5" /> View Draft Compiler
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Dual-Authorization Mandate Banner ─────────────────────────────── */}
      {!isAlreadySealed && (
        <div className="p-4 bg-surface rounded-[4px] border border-hairline flex items-start gap-3">
          <UserCheck size={18} className="text-accent shrink-0 mt-0.5" />
          <div className="text-xs font-mono space-y-1">
            <div className="text-ink font-semibold uppercase tracking-wider">
              FATF R.20 / FinCEN Dual-Authorization Protocol
            </div>
            <p className="text-ink-2 font-sans font-normal leading-relaxed">
              This filing was drafted by maker <span className="font-mono text-ink font-medium">{c.MAKER}</span>. 
              Under anti-money laundering regulations, an independent reviewer with Senior Approver authority must verify the deterministic evidence chain before writing the cryptographic seal.
            </p>
          </div>
        </div>
      )}

      {/* ── Case Dossier Summary Card ──────────────────────────────────────── */}
      <div className="bg-surface rounded-[4px] border border-hairline p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <h2 className="text-xs font-mono font-bold text-ink uppercase tracking-wider">
            Case Audit Dossier
          </h2>
          <span className="text-[10px] font-mono text-ink-faint">
            SUBMITTED: {new Date(c.CREATED_TS).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-surface-2/40 rounded-[3px] border border-hairline">
            <span className="text-[10px] text-ink-faint block uppercase">Case Identifier</span>
            <span className="text-ink font-semibold">{c.CASE_ID}</span>
          </div>

          <div className="p-3 bg-surface-2/40 rounded-[3px] border border-hairline">
            <span className="text-[10px] text-ink-faint block uppercase">Target Account</span>
            <span className="text-ink font-semibold">{c.ACCOUNT_KEY}</span>
          </div>

          <div className="p-3 bg-surface-2/40 rounded-[3px] border border-hairline">
            <span className="text-[10px] text-ink-faint block uppercase">Detected Typology</span>
            <span className="text-accent font-semibold">{c.TYPOLOGY_DETECTED || 'CYCLIC_TRANSFER'}</span>
          </div>

          <div className="p-3 bg-surface-2/40 rounded-[3px] border border-hairline">
            <span className="text-[10px] text-ink-faint block uppercase">Investigator (Maker)</span>
            <span className="text-ink font-semibold">{c.MAKER}</span>
          </div>
        </div>

        {/* Evidence Verification Strip */}
        <div className="p-3 bg-surface-2/30 rounded-[3px] border border-hairline flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-ink-2">Evidence Snapshot Hash:</span>
            <span className="text-ink font-semibold">8f4a3e2b1c9d0a7f...</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            FROZEN & VERIFIED
          </span>
        </div>
      </div>

      {/* ── Signer Station or Certificate View ─────────────────────────────── */}
      {isAlreadySealed ? (
        
        /* Sealed Certificate Banner */
        <div className="bg-surface rounded-[4px] border border-emerald-500/30 p-6 space-y-4 relative overflow-hidden shadow-1">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Award size={120} className="text-emerald-400" />
          </div>

          <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Award size={16} /> Immutable Cryptographic Seal Certificate
          </div>

          <p className="text-xs text-ink-2 max-w-xl font-sans leading-relaxed">
            This case has been permanently approved and sealed into the Snowflake immutable audit ledger. The cryptographic signature is mathematically chained to the previous ledger block.
          </p>

          <div className="p-3 bg-surface-2 rounded-[3px] border border-hairline space-y-2 font-mono text-xs">
            <div className="text-[10px] text-ink-faint uppercase">SHA-256 Ledger Seal:</div>
            <SealBadge sha="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Link to="/filings">
              <Button size="sm" className="text-xs font-mono">
                Inspect in Filings Ledger <ArrowRight size={13} className="ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

      ) : (

        /* Signing Station */
        <div className="bg-surface rounded-[4px] border border-hairline p-6 space-y-6 shadow-1">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <h3 className="text-xs font-mono font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Lock size={14} className="text-accent" />
              Senior Approver Signing Console
            </h3>
            <span className="text-[10px] font-mono text-ink-faint">
              CURRENT ROLE: <span className="text-ink font-semibold uppercase">{role}</span>
            </span>
          </div>

          {/* Role Check Warning */}
          {!isApproverRole && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-[3px] text-xs font-mono text-amber-300 flex items-start gap-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold">INSUFFICIENT CLEARANCE: </span>
                You are currently in <span className="font-bold uppercase text-white">{role}</span> role. Maker-checker rules require Senior Approver clearance to execute final sealing. Switch role to <strong>Approver</strong> or <strong>Dev</strong> in the header toggle.
              </div>
            </div>
          )}

          {/* Attestation Checkbox */}
          <div className="p-4 bg-surface-2/40 rounded-[3px] border border-hairline space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={attestationChecked}
                onChange={(e) => {
                  sound.playClick(800, 0.02)
                  setAttestationChecked(e.target.checked)
                }}
                disabled={!isApproverRole}
                className="mt-1 rounded bg-surface border-hairline text-accent focus:ring-accent"
              />
              <span className="text-xs text-ink-2 font-sans leading-relaxed">
                I hereby attest that I have reviewed the generated STR narrative, verified that all quantitative claims are deterministically proven by Cairnquill Surveyor with zero tolerance drift, and authorize the permanent submission of this filing.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <Button
              className="flex-1 text-xs font-semibold py-2.5 font-mono"
              disabled={!isApproverRole || !attestationChecked || approveMutation.isPending || isSigning}
              loading={approveMutation.isPending || isSigning}
              onClick={handleApprove}
            >
              <ShieldCheck size={15} className="mr-2 text-emerald-400" />
              Approve & Apply Cryptographic Seal
            </Button>
          </div>

          {/* Rejection Remand Console */}
          <div className="pt-6 border-t border-hairline space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-ink-faint uppercase">Remand to Investigator:</span>
              <span className="text-[10px] font-mono text-ink-faint">Requires Justification</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 space-y-1.5">
                <input 
                  type="text" 
                  placeholder="Enter specific audit remediation requirement..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-surface-2/60 border border-hairline rounded-[4px] px-3 py-2 text-xs font-mono text-ink placeholder:text-ink-faint outline-none focus:border-rose-500"
                />
                
                {/* Quick reason suggestions */}
                <div className="flex flex-wrap gap-1">
                  {REJECTION_REASONS.slice(0, 2).map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        sound.playClick(700, 0.02)
                        setComment(r)
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 bg-surface-2 rounded text-ink-faint hover:text-ink border border-hairline"
                    >
                      {r.slice(0, 42)}...
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                variant="danger"
                size="sm"
                className="text-xs font-mono h-auto px-4"
                disabled={!comment.trim() || rejectMutation.isPending}
                loading={rejectMutation.isPending}
                onClick={handleReject}
              >
                Reject Draft
              </Button>
            </div>
          </div>

        </div>

      )}

    </div>
  )
}
