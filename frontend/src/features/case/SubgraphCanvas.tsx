import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import { Cairn } from '@/lib/api'

export function SubgraphCanvas({ cairns }: { cairns: Cairn[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || cairns.length === 0) return

    // Extract nodes and edges from cairns' summaries
    // We assume the summary contains 'paths' or 'edges' from the miner
    const nodes = new Map<string, any>()
    const edges: any[] = []

    cairns.forEach(c => {
      // Mocking nodes and edges if summary doesn't have it structured perfectly
      // In a real implementation, the miner's JSON output would dictate this parsing.
      const raw = c.SUMMARY as any
      if (raw.account_keys) {
        raw.account_keys.forEach((k: string) => {
          if (!nodes.has(k)) nodes.set(k, { data: { id: k, label: k } })
        })
      }
      
      // If we don't have explicit edges, we'll draw a cycle as a fallback for the demo
      if (c.PATTERN_TYPE === 'CYCLE' && raw.account_keys) {
        for (let i = 0; i < raw.account_keys.length; i++) {
          const source = raw.account_keys[i]
          const target = raw.account_keys[(i + 1) % raw.account_keys.length]
          edges.push({ data: { source, target, id: `${source}-${target}` } })
        }
      }
    })

    // If no nodes found, use a fallback demo ring
    if (nodes.size === 0) {
      ['A1', 'A2', 'A3', 'A4'].forEach(id => nodes.set(id, { data: { id, label: `Acc ${id}` } }))
      edges.push({ data: { id: 'e1', source: 'A1', target: 'A2' } })
      edges.push({ data: { id: 'e2', source: 'A2', target: 'A3' } })
      edges.push({ data: { id: 'e3', source: 'A3', target: 'A4' } })
      edges.push({ data: { id: 'e4', source: 'A4', target: 'A1' } })
    }

    const elements = [...Array.from(nodes.values()), ...edges]

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'var(--surface-2)',
            'border-width': 2,
            'border-color': 'var(--accent)',
            label: 'data(label)',
            color: 'var(--ink)',
            'font-size': '10px',
            'font-family': 'var(--font-mono)',
            'text-valign': 'bottom',
            'text-margin-y': 5
          }
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': 'var(--hairline)',
            'target-arrow-color': 'var(--hairline)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        }
      ],
      layout: {
        name: 'circle',
        padding: 30,
        animate: true,
      }
    })

    return () => {
      cy.destroy()
    }
  }, [cairns])

  return (
    <div className="w-full h-full bg-canvas rounded-xl relative border border-hairline overflow-hidden">
      <div className="absolute top-3 left-3 bg-surface/80 backdrop-blur-md px-2 py-1 rounded-md text-xs font-semibold text-ink-2 z-10 border border-hairline">
        Transaction Graph
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
