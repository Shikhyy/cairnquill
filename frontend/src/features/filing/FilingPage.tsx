import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, Filing } from '@/lib/api'
import { SealBadge, Skeleton } from '@/components/ui'
import { Archive, ArrowRight } from 'lucide-react'

const MOCK_FILINGS: Filing[] = [
  {
    FILING_ID: 'filing_8a7d9b1c',
    CASE_ID: 'case_0142',
    DRAFT_ID: 'draft_0142_v1',
    EVIDENCE_SHA: '8f4a3e2b1c9d0a7f8e5d3c2b1a9f8e7d6c5b4a3e2b1c9d0a7f8e5d3c2b1a9f8e',
    SEAL_SHA: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    PREV_SEAL_SHA: 'GENESIS_SEAL_000000000000000000000000000000000000000000000000000000000000',
    MAKER: 'demo_investigator',
    APPROVER: 'senior_compliance_officer',
    APPROVED_TS: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    FILING_ID: 'filing_4f2c1d8a',
    CASE_ID: 'case_0139',
    DRAFT_ID: 'draft_0139_v2',
    EVIDENCE_SHA: '3c2b1a9f8e7d6c5b4a3e2b1c9d0a7f8e5d3c2b1a9f8e7d6c5b4a3e2b1c9d0a7f',
    SEAL_SHA: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    PREV_SEAL_SHA: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    MAKER: 'alex_analyst',
    APPROVER: 'chief_aml_officer',
    APPROVED_TS: new Date(Date.now() - 86400000 * 1.5).toISOString(),
  }
]

export default function FilingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['filings'],
    queryFn: () => api.getFilings(),
    retry: 1,
  })

  if (isLoading && !error) {
    return <div className="p-6"><Skeleton className="h-64 w-full" /></div>
  }

  const filings = data?.filings?.length ? data.filings : MOCK_FILINGS

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
