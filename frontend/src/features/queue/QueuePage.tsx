import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, Alert } from '@/lib/api'
import { Button, SlaRing, Skeleton } from '@/components/ui'
import { ArrowRight, AlertOctagon, ShieldAlert, Sparkles, Filter } from 'lucide-react'
import { useToastStore } from '@/lib/toast'

const MOCK_ALERTS: Alert[] = [
  { ALERT_ID: 101, ACCOUNT_KEY: 'ACC_98231_CORP', SCORE: 0.96, MODEL_VERSION: 'CQ_DETECTOR_v1', STATUS: 'OPEN', CREATED_TS: new Date().toISOString(), SLA_DUE: new Date(Date.now() + 86400000 * 2).toISOString(), DAYS_REMAINING: 2 },
  { ALERT_ID: 102, ACCOUNT_KEY: 'ACC_14209_SHELL', SCORE: 0.91, MODEL_VERSION: 'CQ_DETECTOR_v1', STATUS: 'OPEN', CREATED_TS: new Date().toISOString(), SLA_DUE: new Date(Date.now() + 86400000 * 3).toISOString(), DAYS_REMAINING: 3 },
  { ALERT_ID: 103, ACCOUNT_KEY: 'ACC_47182_HOLD', SCORE: 0.84, MODEL_VERSION: 'CQ_DETECTOR_v1', STATUS: 'OPEN', CREATED_TS: new Date().toISOString(), SLA_DUE: new Date(Date.now() + 86400000 * 4).toISOString(), DAYS_REMAINING: 4 },
  { ALERT_ID: 104, ACCOUNT_KEY: 'ACC_61044_OFFSHORE', SCORE: 0.78, MODEL_VERSION: 'CQ_DETECTOR_v1', STATUS: 'OPEN', CREATED_TS: new Date().toISOString(), SLA_DUE: new Date(Date.now() + 86400000 * 6).toISOString(), DAYS_REMAINING: 6 },
]

export default function QueuePage() {
  const navigate = useNavigate()
  const { addToast } = useToastStore()
  const [filter, setFilter] = useState<'all' | 'high_risk'>('all')
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts('OPEN'),
    retry: 1,
  })

  async function handleStartCase(alertId: number) {
    try {
      const res = await api.createCase(alertId)
      navigate(`/cases/${res.case_id}`)
    } catch (err) {
      console.error(err)
      // In offline/demo fallback mode, route to standard demo case
      addToast('Navigating to Case 0142 (Demo Sandbox)', 'info')
      navigate(`/cases/case_0142`)
    }
  }

  // Gracefully use live alerts or fallback to demo alerts
  const alertsList: Alert[] = data?.alerts || (error ? MOCK_ALERTS : [])
  const displayedAlerts = filter === 'high_risk' 
    ? alertsList.filter(a => a.SCORE >= 0.85)
    : alertsList

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Triage &amp; Investigation Queue</h1>
          <p className="text-xs text-ink-2 mt-1">High-risk anomalous accounts detected via XGBoost model on <code className="text-cyan-300 font-mono text-xs">FEATURES.ACCOUNT_FEATURES</code></p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-ink-2">
          <div><span className="text-white font-bold tabular-nums">{alertsList.length}</span> unassigned</div>
          <span>•</span>
          <div><span className="text-rose-400 font-bold tabular-nums">{alertsList.filter(a => a.DAYS_REMAINING <= 2).length}</span> urgent SLA</div>
        </div>
      </div>

      {/* Offline Sandbox Notice if Backend is unreachable */}
      {error && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs font-mono text-cyan-200">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-cyan-400 shrink-0" />
            <span>Standalone Presentation Mode: Snowflake backend offline. Showing verified synthetic sandbox alerts.</span>
          </div>
          <span className="hidden sm:inline px-2 py-0.5 rounded bg-cyan-500/20 text-[10px] uppercase font-bold">
            Demo Sandbox
          </span>
        </div>
      )}

      {/* Filter and Table Card */}
      <div className="glass-card rounded-card border border-hairline/80 overflow-hidden shadow-2">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-hairline/60 bg-surface-2/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-ink-2" />
            <span className="text-xs font-mono text-ink-2 uppercase tracking-wider">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                filter === 'all' ? 'bg-accent text-white font-semibold' : 'text-ink-2 hover:text-ink'
              }`}
            >
              All Alerts ({alertsList.length})
            </button>
            <button
              onClick={() => setFilter('high_risk')}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                filter === 'high_risk' ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30' : 'text-ink-2 hover:text-ink'
              }`}
            >
              Critical (&ge; 85%)
            </button>
          </div>
          <span className="text-xs font-mono text-ink-2">Sorted by Risk Score &darr;</span>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline/60 bg-surface-2/20 text-ink-2 text-xs font-mono uppercase tracking-wider">
                  <th className="p-4 font-semibold">Account Identifier</th>
                  <th className="p-4 font-semibold">Risk Probability</th>
                  <th className="p-4 font-semibold">SLA Window</th>
                  <th className="p-4 font-semibold text-right">Investigation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/40">
                {displayedAlerts.map((alert: Alert) => (
                  <tr key={alert.ALERT_ID} className="hover:bg-surface-2/40 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                        <div>
                          <div className="font-mono text-sm font-semibold text-white">{alert.ACCOUNT_KEY}</div>
                          <div className="text-[11px] font-mono text-zinc-500">Alert #{alert.ALERT_ID}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-surface-2 rounded-full overflow-hidden border border-hairline/40">
                          <div 
                            className={`h-full ${alert.SCORE >= 0.85 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                            style={{ width: `${alert.SCORE * 100}%` }}
                          />
                        </div>
                        <span className="tabular-nums font-mono font-bold text-xs text-ink">
                          {(alert.SCORE * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <SlaRing daysRemaining={alert.DAYS_REMAINING} />
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-full px-4 text-xs font-semibold hover:border-cyan-500/50 hover:text-cyan-400"
                        onClick={() => handleStartCase(alert.ALERT_ID)}
                      >
                        Open Case <ArrowRight size={14} className="ml-1.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-zinc-500 font-mono">
        All alerts generated from synthetic graph mining. Zero actual customer PII is utilized or exposed.
      </div>
    </div>
  )
}
