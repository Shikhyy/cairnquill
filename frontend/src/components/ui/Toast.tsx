import { AnimatePresence, motion } from 'motion/react'
import { useToastStore } from '@/lib/toast'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="text-verified" size={18} />,
            error: <AlertTriangle className="text-danger" size={18} />,
            info: <Info className="text-accent" size={18} />
          }
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-surface border border-hairline shadow-2 rounded-lg p-3 flex items-start gap-3"
            >
              <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
              <p className="flex-1 text-sm font-medium text-ink leading-snug">{toast.message}</p>
              <button 
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-ink-2 hover:text-ink transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
