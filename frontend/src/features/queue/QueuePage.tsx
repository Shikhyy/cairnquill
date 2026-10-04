import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, Alert } from '@/lib/api'
import { Button, Chip, SlaRing, Skeleton } from '@/components/ui'
import { ArrowRight, AlertOctagon } from 'lucide-react'
import { useToastStore } from '@/lib/toast'

export default function QueuePage() {
  const navigate = useNavigate()
  const { addToast } = useToastStore()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts('OPEN'),
  })

  async function handleStartCase(alertId: number) {
    try {
      const res = await api.createCase(alertId)
      navigate(`/cases/${res.case_id}`)
    } catch (err) {
      console.error(err)
      addToast('Failed to start case', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <h1 className="text-title1">Triage Queue</h1>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-danger/10 text-danger rounded-card border border-danger/20 flex flex-col items-center">
        <AlertOctagon className="mb-2" />
        <p className="font-semibold">Failed to load alerts</p>
        <p className="text-sm opacity-80">{String(error)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-title1 mb-1">Triage Queue</h1>
          <p className="text-ink-2">Unassigned high-risk alerts from the ML detector.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-light tabular-nums">{data?.alerts.length || 0}</div>
          <div className="text-xs text-ink-2 font-medium uppercase tracking-wider">Open Alerts</div>
        </div>
      </div>

      <div className="bg-surface rounded-card border border-hairline overflow-hidden shadow-1">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hairline bg-surface-2/30 text-ink-2">
              <th className="p-4 font-semibold">Account</th>
              <th className="p-4 font-semibold">Risk Score</th>
              <th className="p-4 font-semibold">SLA</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {data?.alerts.map((alert: Alert) => (
              <tr key={alert.ALERT_ID} className="border-b border-hairline last:border-0 hover:bg-surface-2/20 transition-colors">
                <td className="p-4 font-mono">{alert.ACCOUNT_KEY}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-contradicted" 
                        style={{ width: `${alert.SCORE * 100}%` }}
                      />
                    </div>
                    <span className="tabular-nums font-medium">{(alert.SCORE * 100).toFixed(0)}</span>
                  </div>
                </td>
                <td className="p-4">
                  <SlaRing daysRemaining={alert.DAYS_REMAINING} />
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleStartCase(alert.ALERT_ID)}>
                    Start Case <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {data?.alerts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-ink-2">
                  No open alerts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data?.synthetic_data && (
        <p className="text-xs text-ink-2 text-center">
          Note: This environment uses synthetic data. No real PII is present.
        </p>
      )}
    </div>
  )
}
