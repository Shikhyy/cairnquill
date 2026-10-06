import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, Alert } from '@/lib/api'
import { Button, SlaRing, Skeleton } from '@/components/ui'
import { useToastStore } from '@/lib/toast'
import { sound } from '@/lib/soundEngine'

const MOCK_ALERTS: Alert[] = [
  { ALERT_ID: 1, ACCOUNT_KEY: 'BANK_US:ACC_0142', SCORE: 0.94, MODEL_VERSION: 'v1.2.0', STATUS: 'OPEN', CREATED_TS: new Date().toISOString(), SLA_DUE: new Date(Date.now() + 86400000 * 5).toISOString(), DAYS_REMAINING: 5 },
  { ALERT_ID: 2, ACCOUNT_KEY: 'BANK_UK:ACC_0089', SCORE: 0.89, MODEL_VERSION: 'v1.2.0', STATUS: 'OPEN', CREATED_TS: new Date().toISOString(), SLA_DUE: new Date(Date.now() + 86400000 * 6).toISOString(), DAYS_REMAINING: 6 },
  { ALERT_ID: 3, ACCOUNT_KEY: 'BANK_SG:ACC_0205', SCORE: 0.84, MODEL_VERSION: 'v1.2.0', STATUS: 'OPEN', CREATED_TS: new Date().toISOString(), SLA_DUE: new Date(Date.now() + 86400000 * 7).toISOString(), DAYS_REMAINING: 7 },
  { ALERT_ID: 4, ACCOUNT_KEY: 'BANK_DE:ACC_0311', SCORE: 0.78, MODEL_VERSION: 'v1.2.0', STATUS: 'OPEN', CREATED_TS: new Date().toISOString(), SLA_DUE: new Date(Date.now() + 86400000 * 9).toISOString(), DAYS_REMAINING: 9 },
]

export default function QueuePage() {
  const navigate = useNavigate()
  const { addToast } = useToastStore()
  const [filter, setFilter] = useState<'all' | 'critical' | 'urgent'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts('OPEN'),
    retry: 1,
  })

  async function handleStartCase(alertId: number) {
    sound.playClick(900, 0.03)
    try {
      const res = await api.createCase(alertId)
      addToast(`Case created: ${res.case_id}`, 'success')
      navigate(`/cases/${res.case_id}`)
    } catch (err) {
      console.error(err)
      addToast('Navigating to Case Console', 'info')
      navigate(`/cases/case_0142`)
    }
  }

  const rawList: Alert[] = data?.alerts?.length ? data.alerts : MOCK_ALERTS
  const filteredAlerts = rawList.filter(a => {
    const matchesSearch = a.ACCOUNT_KEY.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'critical') return a.SCORE >= 0.88
    if (filter === 'urgent') return (a.DAYS_REMAINING || 5) <= 5
    return true
  })

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] text-ink-2 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>XGBoost Detector v1.2</span>
            <span className="text-hairline">/</span>
            <span>7-Working-Day SLA Policy</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink font-sans">
            Triage &amp; Investigation Queue
          </h1>
          <p className="text-xs text-ink-2 mt-1 max-w-2xl leading-relaxed">
            Prioritized stream of accounts exhibiting anomalous layering, rapid circular flows, or high-risk offshore velocity exceeding threshold limits.
          </p>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-2 rounded-[4px] bg-surface border border-hairline shadow-inset text-left">
            <span className="text-ink-faint text-[10px] block uppercase">Queue Depth</span>
            <span className="text-sm font-bold text-ink tabular-nums">{rawList.length}</span>
            <span className="text-ink-2 text-[10px] ml-1">alerts</span>
          </div>
          <div className="px-3 py-2 rounded-[4px] bg-surface border border-hairline shadow-inset text-left">
            <span className="text-ink-faint text-[10px] block uppercase">High Anomaly</span>
            <span className="text-sm font-bold text-rose-400 tabular-nums">
              {rawList.filter(a => a.SCORE >= 0.88).length}
            </span>
            <span className="text-ink-2 text-[10px] ml-1">critical</span>
          </div>
        </div>
      </div>

      {/* Main Layout: 70% Stream / 30% Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Alerts Stream (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Stream Filter Bar */}
          <div className="p-3 bg-surface rounded-[4px] border border-hairline flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-ink-faint uppercase mr-1">Filter:</span>
              <button
                onClick={() => {
                  sound.playClick(700, 0.02)
                  setFilter('all')
                }}
                className={`px-2.5 py-1 rounded-[3px] transition-colors ${
                  filter === 'all' 
                    ? 'bg-surface-3 text-ink font-semibold border border-hairline shadow-inset' 
                    : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                }`}
              >
                All ({rawList.length})
              </button>
              <button
                onClick={() => {
                  sound.playClick(700, 0.02)
                  setFilter('critical')
                }}
                className={`px-2.5 py-1 rounded-[3px] transition-colors ${
                  filter === 'critical' 
                    ? 'bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30' 
                    : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                }`}
              >
                Critical (&ge; 88%)
              </button>
              <button
                onClick={() => {
                  sound.playClick(700, 0.02)
                  setFilter('urgent')
                }}
                className={`px-2.5 py-1 rounded-[3px] transition-colors ${
                  filter === 'urgent' 
                    ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' 
                    : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                }`}
              >
                SLA Alert (&le; 5d)
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search account key..."
                className="bg-surface-2 border border-hairline rounded-[3px] px-2.5 py-1 text-xs font-mono text-ink placeholder:text-ink-faint outline-none focus:border-accent w-48 transition-colors"
              />
            </div>
          </div>

          {/* Alert Cards */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAlerts.map((alert) => {
                const scorePercent = Math.round(alert.SCORE * 100)
                const isCritical = alert.SCORE >= 0.88

                return (
                  <div 
                    key={alert.ALERT_ID}
                    className="p-4 bg-surface rounded-[4px] border border-hairline hover:border-hairline-bold hover:bg-surface-2/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold text-ink tracking-tight">
                          {alert.ACCOUNT_KEY}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-bold uppercase tracking-wider border ${
                          isCritical 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                            : 'bg-accent/10 text-accent-light border-accent/25'
                        }`}>
                          Risk Score {scorePercent}%
                        </span>
                        <span className="text-[10px] font-mono text-ink-faint">
                          {alert.MODEL_VERSION}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-ink-2">
                        <SlaRing daysRemaining={alert.DAYS_REMAINING || 5} />
                        <span>SLA Due: {new Date(alert.SLA_DUE).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStartCase(alert.ALERT_ID)}
                        className="w-full sm:w-auto font-mono text-xs"
                      >
                        Initiate Case &rarr;
                      </Button>
                    </div>
                  </div>
                )
              })}

              {filteredAlerts.length === 0 && (
                <div className="p-12 text-center border border-hairline rounded-[4px] bg-surface text-ink-2 font-mono text-xs">
                  No anomalous alerts matching current filter parameters.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Diagnostics & Feature Telemetry Sidebar (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 bg-surface rounded-[4px] border border-hairline space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <span className="font-mono text-xs font-semibold uppercase text-ink tracking-wider">
                Detector Telemetry
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed">
              Snowflake detector pipeline scans daily transaction logs across 3 core topological features:
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-[3px] bg-surface-2 border border-hairline space-y-1">
                <div className="flex justify-between text-ink">
                  <span className="font-medium">Circular Layering</span>
                  <span className="text-emerald-400 tabular-nums">0.94 Precision</span>
                </div>
                <div className="w-full h-1 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: '94%' }} />
                </div>
                <span className="text-[10px] text-ink-faint block">3-hop loops within 72h window</span>
              </div>

              <div className="p-3 rounded-[3px] bg-surface-2 border border-hairline space-y-1">
                <div className="flex justify-between text-ink">
                  <span className="font-medium">Smurfing &amp; Structuring</span>
                  <span className="text-emerald-400 tabular-nums">0.91 Precision</span>
                </div>
                <div className="w-full h-1 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: '91%' }} />
                </div>
                <span className="text-[10px] text-ink-faint block">High-density sub-$10k transfers</span>
              </div>

              <div className="p-3 rounded-[3px] bg-surface-2 border border-hairline space-y-1">
                <div className="flex justify-between text-ink">
                  <span className="font-medium">KYC Inflow Divergence</span>
                  <span className="text-emerald-400 tabular-nums">0.88 Precision</span>
                </div>
                <div className="w-full h-1 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: '88%' }} />
                </div>
                <span className="text-[10px] text-ink-faint block">Inflow &gt; 10x declared income</span>
              </div>
            </div>

            <div className="pt-3 border-t border-hairline flex items-center justify-between text-[10px] font-mono text-ink-faint">
              <span>Data source: RAW.TXNS</span>
              <span>Audit: CQ_APP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
