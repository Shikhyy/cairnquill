import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button, Chip, Skeleton, SlaRing } from '@/components/ui'
import { SubgraphCanvas } from './SubgraphCanvas'
import { useToastStore } from '@/lib/toast'
import { sound } from '@/lib/soundEngine'

const MOCK_CASE_DATA = {
  case: {
    CASE_ID: 'case_0142',
    ALERT_ID: 1,
    ACCOUNT_KEY: 'BANK_US:ACC_0142',
    TYPOLOGY_DETECTED: 'CYCLIC_FUNDS_TRANSFER',
    STATUS: 'MINED',
    MAKER: 'alice_investigator',
    CREATED_TS: new Date().toISOString(),
    SLA_DUE: new Date(Date.now() + 86400000 * 5).toISOString(),
  },
  cairns: [
    {
      CAIRN_ID: 'CAIRN-case_0142-CYCLE',
      CASE_ID: 'case_0142',
      PATTERN_TYPE: 'CYCLE',
      PARAMS: { account_key: 'BANK_US:ACC_0142', window_hours: 72 },
      TXN_IDS: [101, 102, 103],
      SUMMARY: {
        n_txns: 3,
        currency: 'USD',
        total_paid: 1500000.0,
        pattern: 'CYCLE',
      },
      CREATED_TS: new Date().toISOString(),
    },
  ],
  kyc: {
    ACCOUNT_KEY: 'BANK_US:ACC_0142',
    CUSTOMER_ID: 'CUST_9912',
    CUSTOMER_NAME_SYNTH: 'Helios Trade Logistics Ltd',
    OCCUPATION: 'Cross-Border Trade Intermediary',
    DECLARED_MONTHLY_INCOME: 45000.0,
    INCOME_CCY: 'USD',
    BRANCH: 'New York Metro',
    RISK_RATING: 'HIGH',
  },
  synthetic_data: true,
}

export default function CasePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const { data: remoteData, isLoading, refetch } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => api.getCase(caseId!),
    enabled: !!caseId,
    retry: 1,
  })

  const mineMutation = useMutation({
    mutationFn: () => api.mineEvidence(caseId!),
    onSuccess: () => {
      sound.playVerify()
      addToast('Evidence mined: 3-hop circular loop isolated', 'success')
      refetch()
    },
    onError: (err) => {
      sound.playBlock()
      addToast(String(err), 'error')
    }
  })

  const data = remoteData || MOCK_CASE_DATA

  if (isLoading && !remoteData) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const { case: c, cairns, kyc } = data
  const canMine = c.STATUS === 'NEW'
  const canDraft = ['MINED', 'ESCALATED', 'BLOCKED'].includes(c.STATUS)
  const isDraftedOrReady = ['DRAFTED', 'READY', 'SUBMITTED', 'SEALED'].includes(c.STATUS)

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Command Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-hairline">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold font-mono tracking-tight text-ink">
              {c.CASE_ID}
            </span>
            <Chip variant={c.STATUS === 'SEALED' ? 'verified' : c.STATUS === 'NEW' ? 'default' : 'verified'}>
              {c.STATUS}
            </Chip>
            <span className="text-xs font-mono text-ink-faint">
              Alert Ref: #{c.ALERT_ID}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-ink-2">
            <span>Target Account:</span>
            <span className="text-ink font-semibold">{c.ACCOUNT_KEY}</span>
            <span className="text-hairline">/</span>
            <span>Maker: {c.MAKER}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="p-2.5 rounded-[4px] bg-surface border border-hairline flex items-center gap-3">
            <SlaRing daysRemaining={5} />
            <span className="text-ink-2">Due in 5 working days</span>
          </div>
        </div>
      </div>

      {/* Workflow Progression Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        <div className={`p-3 rounded-[4px] border ${c.STATUS !== 'NEW' ? 'bg-surface-2 border-emerald-500/30 text-emerald-400' : 'bg-surface border-hairline text-ink'}`}>
          <div className="text-[10px] uppercase text-ink-faint">Step 1</div>
          <div className="font-semibold mt-0.5">Evidence Mining</div>
        </div>
        <div className={`p-3 rounded-[4px] border ${['MINED', 'DRAFTED', 'READY', 'SUBMITTED', 'SEALED'].includes(c.STATUS) ? 'bg-surface-2 border-emerald-500/30 text-emerald-400' : 'bg-surface border-hairline text-ink-faint'}`}>
          <div className="text-[10px] uppercase text-ink-faint">Step 2</div>
          <div className="font-semibold mt-0.5">Claim Synthesis</div>
        </div>
        <div className={`p-3 rounded-[4px] border ${['READY', 'SUBMITTED', 'SEALED'].includes(c.STATUS) ? 'bg-surface-2 border-emerald-500/30 text-emerald-400' : 'bg-surface border-hairline text-ink-faint'}`}>
          <div className="text-[10px] uppercase text-ink-faint">Step 3</div>
          <div className="font-semibold mt-0.5">Surveyor Verdicts</div>
        </div>
        <div className={`p-3 rounded-[4px] border ${c.STATUS === 'SEALED' ? 'bg-surface-2 border-emerald-500/30 text-emerald-400' : 'bg-surface border-hairline text-ink-faint'}`}>
          <div className="text-[10px] uppercase text-ink-faint">Step 4</div>
          <div className="font-semibold mt-0.5">Sealed Filing</div>
        </div>
      </div>

      {/* Main Investigation Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Evidence & Graph (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Action Trigger Card */}
          <div className="p-5 bg-surface rounded-[4px] border border-hairline space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-semibold text-ink tracking-wider">
                Investigation Pipeline
              </span>
              <span className="text-[11px] font-mono text-ink-2">
                Procedure: EVIDENCE.MINE_EVIDENCE
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant={canMine ? 'primary' : 'outline'}
                disabled={!canMine || mineMutation.isPending}
                loading={mineMutation.isPending}
                onClick={() => mineMutation.mutate()}
                className="flex-1 font-mono text-xs"
              >
                {c.STATUS === 'NEW' ? 'Mine Graph Evidence (72h Window)' : 'Evidence Graph Mined'}
              </Button>

              <Button
                variant={canDraft ? 'primary' : 'outline'}
                disabled={!canDraft && !isDraftedOrReady}
                onClick={() => {
                  sound.playClick(900, 0.03)
                  navigate(`/cases/${c.CASE_ID}/draft`)
                }}
                className="flex-1 font-mono text-xs"
              >
                {isDraftedOrReady ? 'Review / Verify Claims &rarr;' : 'Compile Claims with Quill &rarr;'}
              </Button>
            </div>
          </div>

          {/* Subgraph Topology Canvas */}
          {cairns.length > 0 && (
            <div className="p-5 bg-surface rounded-[4px] border border-hairline space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-xs font-semibold uppercase text-ink tracking-wider">
                    Anomalous Flow Network
                  </h3>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Isolated directed subgraph representing verified transaction sequence.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-surface-2 rounded text-emerald-400 border border-emerald-500/20">
                  {cairns.length} CAIRN ISOLATED
                </span>
              </div>

              <div className="h-64 w-full">
                <SubgraphCanvas cairns={cairns} />
              </div>

              {/* Mined Transaction Rows */}
              <div className="space-y-2 pt-2 border-t border-hairline">
                <span className="text-[11px] font-mono text-ink-faint uppercase block">
                  Snapshot Transactions (EVIDENCE.CASE_ROWS)
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="p-2.5 bg-surface-2 rounded-[3px] border border-hairline flex justify-between items-center">
                    <div>
                      <span className="text-ink font-semibold">Txn #101</span>
                      <span className="text-ink-2 text-[11px] ml-2">BANK_US:ACC_0142 &rarr; BANK_INTERMEDIARY</span>
                    </div>
                    <span className="text-ink tabular-nums font-bold">$500,000.00 USD</span>
                  </div>
                  <div className="p-2.5 bg-surface-2 rounded-[3px] border border-hairline flex justify-between items-center">
                    <div>
                      <span className="text-ink font-semibold">Txn #102</span>
                      <span className="text-ink-2 text-[11px] ml-2">BANK_INTERMEDIARY &rarr; BANK_OVERSEAS</span>
                    </div>
                    <span className="text-ink tabular-nums font-bold">$500,000.00 USD</span>
                  </div>
                  <div className="p-2.5 bg-surface-2 rounded-[3px] border border-hairline flex justify-between items-center">
                    <div>
                      <span className="text-ink font-semibold">Txn #103</span>
                      <span className="text-ink-2 text-[11px] ml-2">BANK_OVERSEAS &rarr; BANK_US:ACC_0142</span>
                    </div>
                    <span className="text-ink tabular-nums font-bold">$500,000.00 USD</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Customer KYC Dossier (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {kyc && (
            <div className="p-5 bg-surface rounded-[4px] border border-hairline space-y-4">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <span className="font-mono text-xs font-semibold uppercase text-ink tracking-wider">
                  KYC Profile Dossier
                </span>
                <Chip variant={kyc.RISK_RATING === 'HIGH' ? 'danger' : 'default'}>
                  {kyc.RISK_RATING} RISK
                </Chip>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-ink-faint text-[10px] block uppercase">Entity Legal Name</span>
                  <span className="text-ink font-semibold text-sm font-sans">{kyc.CUSTOMER_NAME_SYNTH}</span>
                </div>

                <div>
                  <span className="text-ink-faint text-[10px] block uppercase">Industry / Occupation</span>
                  <span className="text-ink-2">{kyc.OCCUPATION}</span>
                </div>

                <div className="p-3 bg-surface-2 rounded-[3px] border border-hairline space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-ink-faint text-[10px] uppercase">Declared Monthly Income</span>
                    <span className="text-ink font-bold tabular-nums">
                      ${kyc.DECLARED_MONTHLY_INCOME.toLocaleString()} {kyc.INCOME_CCY}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-hairline">
                    <span className="text-ink-faint text-[10px] uppercase">Detected 72h Volume</span>
                    <span className="text-rose-400 font-bold tabular-nums">
                      $1,500,000.00 USD
                    </span>
                  </div>
                  <div className="text-[10px] text-rose-400/90 pt-1 font-sans">
                    Warning: Detected inflow exceeds declared monthly profile by 33.3x.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-ink-faint text-[10px] block uppercase">Branch</span>
                    <span className="text-ink-2">{kyc.BRANCH}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint text-[10px] block uppercase">Customer Ref</span>
                    <span className="text-ink-2">{(kyc as any).CUSTOMER_ID || kyc.ACCOUNT_KEY}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-hairline text-[10px] font-mono text-ink-faint">
                Synthetic customer profile generated for AML evaluation.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
