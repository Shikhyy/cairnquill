import { useQuery, useMutation } from '@tanstack/react-query'
import { api, EvalRun } from '@/lib/api'
import { Button, Skeleton, Chip } from '@/components/ui'
import { Activity, Target, Zap } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export default function EvalPage() {
  const { role } = useAppStore()
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['scoreboard'],
    queryFn: () => api.getScoreboard(),
  })

  const runMutation = useMutation({
    mutationFn: () => api.runPlantedErrors(),
    onSuccess: () => refetch(),
  })

  if (role !== 'dev' && role !== 'auditor') {
    return <div className="p-6">Unauthorized. Must be dev or auditor.</div>
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-64" /></div>

  const runs = data?.runs || []
  const latest = runs[0]

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-title1 mb-1">Evaluation & Metrics</h1>
          <p className="text-ink-2">Planted-error harness and verifier accuracy.</p>
        </div>
        <Button 
          onClick={() => runMutation.mutate()} 
          loading={runMutation.isPending}
        >
          Run Eval Suite
        </Button>
      </div>

      {runMutation.isError && (
        <div className="p-4 bg-danger/10 text-danger rounded-md">
          {String(runMutation.error)}
        </div>
      )}

      {latest && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-surface p-6 rounded-card border border-hairline shadow-1 flex flex-col items-center justify-center text-center">
            <Target size={32} className="text-verified mb-3" />
            <div className="text-3xl font-bold tabular-nums">
              {((latest.METRICS as any)?.catch_rate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-ink-2 font-medium mt-1">Catch Rate</div>
            <p className="text-xs text-ink-2/70 mt-2">Target: &ge;95%</p>
          </div>
          
          <div className="bg-surface p-6 rounded-card border border-hairline shadow-1 flex flex-col items-center justify-center text-center">
            <Activity size={32} className="text-accent mb-3" />
            <div className="text-3xl font-bold tabular-nums">
              {((latest.METRICS as any)?.false_block_rate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-ink-2 font-medium mt-1">False-Block Rate</div>
            <p className="text-xs text-ink-2/70 mt-2">Target: &le;2%</p>
          </div>

          <div className="bg-surface p-6 rounded-card border border-hairline shadow-1 flex flex-col items-center justify-center text-center">
            <Zap size={32} className="text-judgement mb-3" />
            <div className="text-3xl font-bold tabular-nums">
              {(latest.METRICS as any)?.latency_ms || 0}ms
            </div>
            <div className="text-sm text-ink-2 font-medium mt-1">Avg Verification Time</div>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-card border border-hairline overflow-hidden shadow-1">
        <div className="p-4 border-b border-hairline bg-surface-2/30">
          <h2 className="font-semibold">Recent Runs</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-ink-2">
              <th className="p-4 font-semibold">Timestamp</th>
              <th className="p-4 font-semibold">Run ID</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold text-right">Catch Rate</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r: EvalRun) => {
              const metrics = r.METRICS as any
              return (
                <tr key={r.RUN_ID} className="border-b border-hairline last:border-0">
                  <td className="p-4 text-ink-2">{new Date(r.TS).toLocaleString()}</td>
                  <td className="p-4 font-mono">{r.RUN_ID}</td>
                  <td className="p-4"><Chip>{r.KIND}</Chip></td>
                  <td className="p-4 text-right tabular-nums font-medium">
                    {metrics?.catch_rate !== undefined ? `${(metrics.catch_rate * 100).toFixed(1)}%` : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
