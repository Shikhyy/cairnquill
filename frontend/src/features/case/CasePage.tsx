import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button, Chip, Skeleton, CairnStack, SlaRing } from '@/components/ui'
import { Pickaxe, PenTool, AlertOctagon } from 'lucide-react'

export default function CasePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => api.getCase(caseId!),
    enabled: !!caseId,
  })

  const mineMutation = useMutation({
    mutationFn: () => api.mineEvidence(caseId!),
    onSuccess: () => refetch(),
  })

  if (isLoading || !data) {
    return <div className="p-6"><Skeleton className="h-64 w-full" /></div>
  }

  const { case: c, cairns, kyc } = data

  const canMine = c.STATUS === 'NEW'
  const canDraft = ['MINED', 'ESCALATED', 'BLOCKED'].includes(c.STATUS)

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-title1 font-mono">{c.CASE_ID}</h1>
            <Chip variant={c.STATUS === 'NEW' ? 'default' : 'verified'}>{c.STATUS}</Chip>
          </div>
          <p className="text-ink-2">Account: <span className="font-mono text-ink">{c.ACCOUNT_KEY}</span></p>
        </div>
        <div className="text-right">
          <SlaRing daysRemaining={3} /> {/* Mocked days remaining for simplicity */}
          <div className="text-xs text-ink-2 mt-1">Investigator: {c.MAKER}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          <div className="bg-surface rounded-card p-6 shadow-1 border border-hairline">
            <h2 className="text-headline mb-4">Case Lifecycle</h2>
            
            <div className="flex gap-4">
              <div className="flex-1 p-4 rounded-xl border border-hairline bg-surface-2/30 flex flex-col items-center text-center">
                <div className="h-32 flex items-center justify-center mb-4">
                  {cairns.length > 0 ? (
                    <CairnStack count={cairns.length} />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center text-ink-2">
                      <Pickaxe size={24} />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold mb-1">Evidence</h3>
                <p className="text-sm text-ink-2 mb-4 h-10">
                  {cairns.length > 0 ? `${cairns.length} pattern cairns mined.` : 'Mine the transaction graph for typologies.'}
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={!canMine || mineMutation.isPending}
                  loading={mineMutation.isPending}
                  onClick={() => mineMutation.mutate()}
                >
                  Mine Graph
                </Button>
              </div>

              <div className="flex-1 p-4 rounded-xl border border-hairline bg-surface-2/30 flex flex-col items-center text-center">
                <div className="h-32 flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center text-accent">
                    <PenTool size={24} />
                  </div>
                </div>
                <h3 className="font-semibold mb-1">STR Draft</h3>
                <p className="text-sm text-ink-2 mb-4 h-10">
                  Compile evidence into a verifiable draft using Quill.
                </p>
                <Button 
                  variant="primary" 
                  className="w-full"
                  disabled={!canDraft}
                  onClick={() => navigate(`/cases/${c.CASE_ID}/draft`)}
                >
                  Create Draft
                </Button>
              </div>
            </div>
          </div>

          {cairns.length > 0 && (
             <div className="bg-surface rounded-card border border-hairline overflow-hidden shadow-1">
               <div className="p-4 border-b border-hairline bg-surface-2/30">
                 <h2 className="font-semibold">Mined Evidence Cairns</h2>
               </div>
               <div className="divide-y divide-hairline">
                 {cairns.map(cairn => (
                   <div key={cairn.CAIRN_ID} className="p-4 hover:bg-surface-2/20">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="font-mono text-xs text-ink-2">{cairn.CAIRN_ID}</span>
                       <Chip>{cairn.PATTERN_TYPE}</Chip>
                     </div>
                     <pre className="text-xs font-mono bg-surface-2/50 p-2 rounded-md overflow-x-auto text-ink-2">
                       {JSON.stringify(cairn.SUMMARY, null, 2)}
                     </pre>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {kyc && (
            <div className="bg-surface rounded-card p-5 border border-hairline shadow-1">
              <h2 className="text-headline mb-4">KYC Profile</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-ink-2">Name</dt>
                  <dd className="font-medium">{kyc.CUSTOMER_NAME_SYNTH}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Occupation</dt>
                  <dd className="font-medium">{kyc.OCCUPATION}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Declared Income</dt>
                  <dd className="font-medium tabular-nums font-mono">{kyc.DECLARED_MONTHLY_INCOME} {kyc.INCOME_CCY}/mo</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Branch</dt>
                  <dd className="font-medium">{kyc.BRANCH}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Risk Rating</dt>
                  <dd><Chip variant={kyc.RISK_RATING === 'HIGH' ? 'danger' : 'default'}>{kyc.RISK_RATING}</Chip></dd>
                </div>
              </dl>
              <div className="mt-4 pt-4 border-t border-hairline text-xs text-ink-2 flex gap-1">
                <AlertOctagon size={14} className="shrink-0" />
                This is synthetic data.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
