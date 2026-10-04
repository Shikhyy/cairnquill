import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {  useMutation } from '@tanstack/react-query'
import { api, } from '@/lib/api'
import { Button, ClaimCard, Chip } from '@/components/ui'
import { CheckCircle2, AlertTriangle, ArrowRight, RefreshCcw } from 'lucide-react'
import { useToastStore } from '@/lib/toast'

export default function DraftPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null)

  const { addToast } = useToastStore()

  const draftMutation = useMutation({
    mutationFn: () => api.createDraft(caseId!),
    onSuccess: (data) => {
      if (data.blocked) addToast('Draft blocked. Surveyor found data mismatches.', 'error')
      else addToast('Draft verified successfully', 'success')
    },
    onError: (err) => addToast(String(err), 'error')
  })

  // Start draft generation on mount if we don't have one
  useEffect(() => {
    if (caseId) {
      draftMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  const submitMutation = useMutation({
    mutationFn: () => api.submitCase(caseId!),
    onSuccess: () => {
      addToast('Draft submitted for approval', 'success')
      navigate(`/cases/${caseId}`)
    },
    onError: (err) => addToast(String(err), 'error')
  })

  if (draftMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <RefreshCcw size={32} className="animate-spin text-accent" />
        <div className="text-center">
          <h2 className="text-title2 mb-2">Compiling Draft</h2>
          <p className="text-ink-2 max-w-sm">Quill is analyzing the evidence cairns and drafting verifiable claims. Surveyor will then verify them against the snapshot.</p>
        </div>
      </div>
    )
  }

  if (draftMutation.isError) {
    return (
      <div className="p-6 bg-danger/10 text-danger rounded-card border border-danger/20">
        <h2 className="font-bold mb-2">Draft Generation Failed</h2>
        <p>{String(draftMutation.error)}</p>
        <Button variant="outline" className="mt-4" onClick={() => draftMutation.mutate()}>Retry</Button>
      </div>
    )
  }

  if (!draftMutation.data) return null

  const { draft_id, blocked, verdicts, omissions, claims,} = draftMutation.data
  const failedCount = verdicts.filter(v => v.verdict === 'CONTRADICTED' || v.verdict === 'UNSUPPORTED').length
  const verifiedCount = verdicts.filter(v => v.verdict === 'VERIFIED').length

  const getClaim = (claimId: string) => {
    return claims?.find(c => c.claim_id === claimId) || {
      claim_id: claimId,
      type: 'SUM_AMOUNT' as any,
      text: `Unknown Claim ${claimId}`,
      params: {},
      asserted: null,
      evidence_ids: []
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-title1 mb-1">STR Draft Review</h1>
          <p className="text-ink-2 font-mono text-sm">Draft: {draft_id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Chip variant={blocked ? 'danger' : 'verified'} className="text-sm px-3 py-1">
            {blocked ? 'BLOCKED' : 'READY TO SUBMIT'}
          </Chip>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <h2 className="text-headline">Claims ({verdicts.length})</h2>
          <div className="space-y-3">
            {verdicts.map(v => (
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

        <div className="space-y-6">
          <div className="bg-surface p-5 rounded-card border border-hairline shadow-1">
            <h2 className="text-headline mb-4">Verification Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-2">Total Claims</span>
                <span className="font-medium">{verdicts.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-verified"><CheckCircle2 size={14} /> Verified</span>
                <span className="font-medium">{verifiedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-contradicted"><AlertTriangle size={14} /> Failed</span>
                <span className="font-medium">{failedCount}</span>
              </div>
            </div>

            {omissions && omissions.length > 0 && (
              <div className="mb-6 p-3 bg-surface-2/50 rounded-md border border-hairline">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1"><AlertTriangle size={12} className="text-contradicted"/> Missing Elements</h3>
                <ul className="text-xs text-ink-2 space-y-1 list-disc pl-4">
                  {omissions.map(o => <li key={o} className="font-mono">{o}</li>)}
                </ul>
              </div>
            )}

            <Button 
              className="w-full"
              disabled={blocked || submitMutation.isPending}
              loading={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {blocked ? 'Draft Blocked' : 'Submit for Approval'}
              {!blocked && <ArrowRight size={16} className="ml-2" />}
            </Button>

            {blocked && (
              <p className="text-xs text-center text-ink-2 mt-3">
                Failed claims must be repaired or removed before submission.
              </p>
            )}
          </div>
          
          {/* Demo Controls */}
          <div className="bg-surface-2/30 p-5 rounded-card border border-hairline border-dashed">
            <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">Demo Controls</h3>
            <Button 
              variant="outline" 
              className="w-full text-xs" 
              size="sm"
              onClick={async () => {
                if (verdicts.length > 0) {
                  await api.injectError(draft_id, verdicts[0].claim_id, 'AMOUNT_X1_1');
                  draftMutation.mutate();
                }
              }}
            >
              Inject Hallucination Error
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
