import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Button, Chip, Skeleton, SealBadge } from '@/components/ui'
import { ShieldCheck, MessageSquareX } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export default function ReviewPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { role } = useAppStore()
  const [comment, setComment] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => api.getCase(caseId!),
  })

  const approveMutation = useMutation({
    mutationFn: () => api.approveCase(caseId!),
    onSuccess: (res) => navigate(`/filings`),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectCase(caseId!, comment),
    onSuccess: () => navigate('/queue'),
  })

  if (isLoading || !data) return <div className="p-6"><Skeleton className="h-64" /></div>

  const c = data.case
  const canApprove = c.STATUS === 'SUBMITTED' && (role === 'approver' || role === 'dev')

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-title1">Case Review</h1>
        <Chip variant={c.STATUS === 'SEALED' ? 'verified' : 'default'}>{c.STATUS}</Chip>
      </div>

      <div className="bg-surface rounded-card p-6 border border-hairline shadow-1 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-ink-2 uppercase tracking-wider mb-2">Case Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-ink-2 block">Case ID</span><span className="font-mono">{c.CASE_ID}</span></div>
            <div><span className="text-ink-2 block">Account</span><span className="font-mono">{c.ACCOUNT_KEY}</span></div>
            <div><span className="text-ink-2 block">Maker</span>{c.MAKER}</div>
            <div><span className="text-ink-2 block">Submitted</span>{new Date(c.UPDATED_TS || c.CREATED_TS).toLocaleString()}</div>
          </div>
        </div>

        {canApprove && (
          <div className="pt-6 border-t border-hairline">
            <h3 className="text-sm font-semibold text-ink-2 uppercase tracking-wider mb-4">Approval Action</h3>
            <div className="flex gap-4">
              <Button 
                variant="primary" 
                className="flex-1"
                loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
              >
                <ShieldCheck size={18} className="mr-2" /> Approve & Seal
              </Button>
              
              <div className="flex-1 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Rejection reason..." 
                  className="flex-1 px-3 bg-surface-2 rounded-control text-sm border-none focus:ring-2 focus:ring-accent outline-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button 
                  variant="danger" 
                  disabled={!comment.trim() || rejectMutation.isPending}
                  loading={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate()}
                >
                  Reject
                </Button>
              </div>
            </div>
            
            {approveMutation.isError && (
              <p className="text-danger text-sm mt-3">{String(approveMutation.error)}</p>
            )}
          </div>
        )}

        {c.STATUS === 'SEALED' && (
          <div className="pt-6 border-t border-hairline bg-verified/5 -mx-6 -mb-6 p-6 rounded-b-card">
            <h3 className="text-sm font-semibold text-verified uppercase tracking-wider mb-2">Cryptographic Seal</h3>
            <p className="text-sm text-ink-2 mb-3">This case has been permanently sealed and written to the audit log.</p>
            {/* We'd fetch the filing to get the actual seal here, omitting for brevity in this mock view */}
            <div className="text-verified font-medium flex items-center gap-2">
              <ShieldCheck size={18} /> Verified Immutable Record
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
