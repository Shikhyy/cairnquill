import { motion, AnimatePresence } from 'motion/react'
import { type Claim, type VerdictItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip } from './Chip'
import { sound } from '@/lib/soundEngine'

export function ClaimCard({
  claim,
  verdictItem,
  onClick,
  selected,
}: {
  claim: Claim
  verdictItem?: VerdictItem
  onClick?: () => void
  selected?: boolean
}) {
  const v = verdictItem?.verdict || 'UNSUPPORTED'
  
  const statusConfig = {
    VERIFIED: {
      badge: 'verified' as const,
      border: 'border-emerald-500/30',
      label: 'VERIFIED',
      desc: 'Matches ground truth evidence snapshot'
    },
    CONTRADICTED: {
      badge: 'contradicted' as const,
      border: 'border-rose-500/40 bg-rose-500/[0.02]',
      label: 'CONTRADICTED',
      desc: 'Hallucination detected by Surveyor SQL template'
    },
    UNSUPPORTED: {
      badge: 'unsupported' as const,
      border: 'border-slate-500/30',
      label: 'UNSUPPORTED',
      desc: 'Cites transaction IDs absent from evidence cairn'
    },
    JUDGEMENT: {
      badge: 'judgement' as const,
      border: 'border-purple-500/30',
      label: 'JUDGEMENT',
      desc: 'Qualitative analyst reasoning (excluded from numeric verification)'
    }
  }

  const current = statusConfig[v as keyof typeof statusConfig] || statusConfig.UNSUPPORTED

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={() => {
        sound.playClick(850, 0.02)
        onClick?.()
      }}
      className={cn(
        "bg-surface border rounded-[4px] p-4 transition-all cursor-pointer relative",
        selected 
          ? "border-accent ring-1 ring-accent/30 shadow-inset" 
          : cn("border-hairline hover:border-hairline-bold hover:bg-surface-2/40", current.border)
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-ink-2">{claim.claim_id}</span>
          <Chip variant={current.badge}>{current.label}</Chip>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-ink-faint">
          <span>{claim.type}</span>
          {claim.evidence_ids?.length > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-surface-2 text-ink-2 border border-hairline">
              {claim.evidence_ids.length} txns
            </span>
          )}
        </div>
      </div>

      <p className="text-body font-normal text-ink leading-relaxed mb-3">
        {claim.text}
      </p>

      {/* Discrepancy comparison when contradicted */}
      <AnimatePresence>
        {v === 'CONTRADICTED' && verdictItem?.actual && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3 bg-rose-500/10 rounded-[3px] border border-rose-500/30 text-xs font-mono space-y-2"
          >
            <div className="text-rose-400 font-semibold tracking-wide flex items-center justify-between">
              <span>SURVEYOR CONTRADICTION DETECTED</span>
              <span className="text-[10px] text-rose-300">BLOCKS FILING</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-rose-500/20 text-xs">
              <div>
                <span className="text-rose-400/80 block text-[10px] uppercase">LLM Asserted</span>
                <span className="font-bold text-rose-200 tabular-nums">
                  {verdictItem.asserted?.value} {verdictItem.asserted?.currency || ''}
                </span>
              </div>
              <div>
                <span className="text-rose-400/80 block text-[10px] uppercase">Ground Truth Actual</span>
                <span className="font-bold text-rose-200 tabular-nums">
                  {verdictItem.actual.value} {verdictItem.actual.currency || ''}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Citations footer */}
      {claim.evidence_ids && claim.evidence_ids.length > 0 && (
        <div className="pt-2.5 mt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] font-mono text-ink-faint">
          <div className="flex items-center gap-1.5">
            <span>TXNS:</span>
            <span className="text-ink-2">
              [{claim.evidence_ids.slice(0, 4).join(', ')}{claim.evidence_ids.length > 4 ? '...' : ''}]
            </span>
          </div>
          <span className="text-[10px] text-ink-faint">{current.desc}</span>
        </div>
      )}
    </motion.div>
  )
}
