import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, Filing } from '@/lib/api'
import { SealBadge, Skeleton } from '@/components/ui'
import { Archive, ArrowRight } from 'lucide-react'

export default function FilingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['filings'],
    queryFn: () => api.getFilings(),
  })

  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-64 w-full" /></div>
  }

  const filings = data?.filings || []

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-title1 mb-1">Sealed Filings</h1>
          <p className="text-ink-2">Immutable audit trail of approved cases.</p>
        </div>
        <div className="text-3xl font-light tabular-nums">{filings.length}</div>
      </div>

      <div className="bg-surface rounded-card border border-hairline overflow-hidden shadow-1">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hairline bg-surface-2/30 text-ink-2">
              <th className="p-4 font-semibold">Timestamp</th>
              <th className="p-4 font-semibold">Case ID</th>
              <th className="p-4 font-semibold">Seal (SHA-256)</th>
              <th className="p-4 font-semibold">Approver</th>
              <th className="p-4 font-semibold text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {filings.map((f: Filing) => (
              <tr key={f.FILING_ID} className="border-b border-hairline last:border-0 hover:bg-surface-2/20">
                <td className="p-4 tabular-nums text-ink-2">
                  {new Date(f.APPROVED_TS).toLocaleString()}
                </td>
                <td className="p-4 font-mono font-medium">{f.CASE_ID}</td>
                <td className="p-4">
                  <SealBadge sha={f.SEAL_SHA} />
                </td>
                <td className="p-4">{f.APPROVER}</td>
                <td className="p-4 text-right">
                  <Link 
                    to={`/cases/${f.CASE_ID}/review`}
                    className="inline-flex items-center text-accent hover:underline font-medium"
                  >
                    Details <ArrowRight size={14} className="ml-1" />
                  </Link>
                </td>
              </tr>
            ))}
            {filings.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-ink-2">
                  <Archive className="mx-auto mb-3 opacity-20" size={32} />
                  No sealed filings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
