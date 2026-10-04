import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ArrowRight, ShieldCheck, Database, FileSearch, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] py-12">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto text-center space-y-12"
      >
        {/* Hero Section */}
        <div className="space-y-6">
          <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-sm font-semibold tracking-wide">
            <Sparkles size={16} />
            <span>Snowflake CoCo Hackathon GCC Edition 2026</span>
          </motion.div>
          
          <motion.h1 variants={item} className="text-display tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-ink to-ink-2">
            Deterministic AML Copilot
          </motion.h1>
          
          <motion.p variants={item} className="text-title2 text-ink-2 max-w-2xl mx-auto font-normal leading-relaxed">
            Cairnquill leverages Snowflake Cortex to draft Suspicious Transaction Reports (STRs) while guaranteeing mathematical perfection through strict SQL verification and cryptographic sealing.
          </motion.p>
          
          <motion.div variants={item} className="pt-4 flex items-center justify-center gap-4">
            <Link to="/queue">
              <Button size="lg" className="rounded-full px-8 text-base shadow-lg shadow-accent/25 hover:scale-105 transition-transform">
                Open Investigator Queue <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Link to="/ask">
              <Button variant="secondary" size="lg" className="rounded-full px-8 text-base hover:scale-105 transition-transform">
                Query Regulatory AI
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <motion.div variants={item} className="grid md:grid-cols-3 gap-6 pt-16 text-left">
          
          <div className="bg-surface/50 backdrop-blur-md border border-hairline p-6 rounded-card hover:bg-surface transition-colors shadow-1">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
              <FileSearch size={24} />
            </div>
            <h3 className="text-headline mb-2">Automated Drafting</h3>
            <p className="text-sm text-ink-2 leading-relaxed">
              The Quill compiler builds full-context evidence facts and queries Snowflake Cortex to automatically generate natural-language claims.
            </p>
          </div>

          <div className="bg-surface/50 backdrop-blur-md border border-hairline p-6 rounded-card hover:bg-surface transition-colors shadow-1">
            <div className="w-12 h-12 rounded-full bg-verified/10 flex items-center justify-center text-verified mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-headline mb-2">Deterministic Surveyor</h3>
            <p className="text-sm text-ink-2 leading-relaxed">
              LLMs hallucinate numbers. Cairnquill doesn't trust them. Every numerical claim is strictly verified against raw row-level evidence via SQL.
            </p>
          </div>

          <div className="bg-surface/50 backdrop-blur-md border border-hairline p-6 rounded-card hover:bg-surface transition-colors shadow-1">
            <div className="w-12 h-12 rounded-full bg-judgement/10 flex items-center justify-center text-judgement mb-4">
              <Database size={24} />
            </div>
            <h3 className="text-headline mb-2">Cryptographic Seals</h3>
            <p className="text-sm text-ink-2 leading-relaxed">
              Approved drafts are sealed with a tamper-proof SHA-256 hash chaining the raw snapshot, claims, verdicts, and model versions to the audit trail.
            </p>
          </div>

        </motion.div>
      </motion.div>
    </div>
  )
}
