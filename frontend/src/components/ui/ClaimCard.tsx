
import { motion, AnimatePresence } from 'motion/react'
import { Check, X, HelpCircle, User, FileText, AlertTriangle } from 'lucide-react'
import { type Claim, type VerdictItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip } from './Chip'

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
  
  const iconMap = {
    VERIFIED: <Check size={18} className="text-verified" />,
    CONTRADICTED: <X size={18} className="text-contradicted" />,
    UNSUPPORTED: <HelpCircle size={18} className="text-unsupported" />,
    JUDGEMENT: <User size={18} className="text-judgement" />
  }

  const borderMap = {
    VERIFIED: 'border-l-verified',
    CONTRADICTED: 'border-l-contradicted',
    UNSUPPORTED: 'border-l-unsupported',
    JUDGEMENT: 'border-l-judgement',
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "bg-surface border border-hairline rounded-card p-4 shadow-1 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-2",
        "border-l-4", borderMap[v],
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-canvas shadow-2"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="pt-1">{iconMap[v]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-ink-2">{claim.claim_id}</span>
            <Chip variant={v.toLowerCase() as any}>{v}</Chip>
            {claim.type !== 'JUDGEMENT' && (
              <span className="text-xs text-ink-2 ml-auto">{claim.type}</span>
            )}
          </div>
          <p className="text-body font-medium text-ink leading-snug">{claim.text}</p>
          
          <AnimatePresence>
            {v === 'CONTRADICTED' && verdictItem?.actual && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 p-3 bg-contradicted/5 rounded-md border border-contradicted/10 text-sm"
              >
                <div className="flex items-start gap-2 text-contradicted">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-1">Data mismatch</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="opacity-75 block">Asserted</span>
                        <span className="font-mono tabular-nums">{verdictItem.asserted?.value} {verdictItem.asserted?.currency}</span>
                      </div>
                      <div>
                        <span className="opacity-75 block">Actual</span>
                        <span className="font-mono tabular-nums">{verdictItem.actual.value} {verdictItem.actual.currency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-2">
            <FileText size={14} />
            <span>{claim.evidence_ids.length} txns referenced</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
