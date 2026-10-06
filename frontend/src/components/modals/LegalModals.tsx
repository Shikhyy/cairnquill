import React, { useState } from 'react'
import { sound } from '@/lib/soundEngine'
import { X, ShieldAlert, FileText, Lock } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function Modal({ isOpen, onClose, title, icon, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-surface border border-hairline rounded-xl shadow-2 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-5 border-b border-hairline bg-surface-2/40">
          <div className="flex items-center gap-2.5">
            {icon}
            <h2 className="font-semibold text-sm text-white">{title}</h2>
          </div>
          <button 
            onClick={() => {
              sound.playClick(600, 0.02)
              onClose()
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-surface-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs text-ink-2 leading-relaxed font-sans">
          {children}
        </div>

        <div className="p-4 border-t border-hairline bg-surface-2/20 flex justify-end">
          <button
            onClick={() => {
              sound.playClick(600, 0.02)
              onClose()
            }}
            className="px-4 py-1.5 rounded-md bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function LegalArchitecture() {
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <button 
          onClick={() => {
            sound.playClick(700, 0.02)
            setTermsOpen(true)
          }} 
          className="hover:text-white transition-colors underline-offset-4 hover:underline"
        >
          Terms of Service
        </button>
        <span>•</span>
        <button 
          onClick={() => {
            sound.playClick(700, 0.02)
            setPrivacyOpen(true)
          }} 
          className="hover:text-white transition-colors underline-offset-4 hover:underline"
        >
          Privacy &amp; Data Security
        </button>
        <span>•</span>
        <span className="text-zinc-500 font-mono">GCC 2026 CoCo Edition</span>
      </div>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        title="Terms of Service & Regulatory Framework"
        icon={<FileText size={16} className="text-cyan-400" />}
      >
        <p className="font-semibold text-white">1. Scope of Application</p>
        <p>
          Cairnquill is an autonomous verification copilot designed exclusively for compliance investigation and 
          Suspicious Transaction Report (STR) drafting. The application operates under a strict Zero Trust model 
          where all large language model inferences are treated as untrusted hypotheses subject to deterministic SQL proofs.
        </p>

        <p className="font-semibold text-white">2. Synthetic Data Disclosure</p>
        <p>
          All account numbers, transacted sums, counterparty structures, and entity dossiers rendered in this 
          demonstration environment are procedurally generated synthetic fixtures. Zero actual consumer Personally 
          Identifiable Information (PII) is processed or exposed.
        </p>

        <p className="font-semibold text-white">3. Maker-Checker Statutory Compliance</p>
        <p>
          In compliance with Financial Action Task Force (FATF) Recommendation 20 and Prevention of Money Laundering Act 
          (PMLA) guidelines, dual-control approval is enforced at the database level. An investigator (Maker) is 
          cryptographically barred from approving their own STR submission.
        </p>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Privacy Policy & Cryptographic Guarantee"
        icon={<Lock size={16} className="text-emerald-400" />}
      >
        <p className="font-semibold text-white">1. Zero-Egress Cryptographic Seals</p>
        <p>
          Evidence Cairns snapshot transaction rows directly into private customer schemas (<code className="text-cyan-300 font-mono">EVIDENCE.CASE_ROWS</code>). 
          No evidence records leave the designated Snowflake security perimeter.
        </p>

        <p className="font-semibold text-white">2. Immutable Audit Trails</p>
        <p>
          All verification verdicts, model versions, prompt hashes, and analyst decisions are appended to a SHA-256 
          hash-chained audit tree in <code className="text-cyan-300 font-mono">AUDIT.FILINGS</code>. Any subsequent tampering 
          with historical claims invalidates the cryptographic seal.
        </p>

        <p className="font-semibold text-white">3. Local Session Ephemerality</p>
        <p>
          Client state preferences (such as audio feedback state) are persisted strictly within local browser storage 
          without third-party tracking or telemetry beacons.
        </p>
      </Modal>
    </>
  )
}
