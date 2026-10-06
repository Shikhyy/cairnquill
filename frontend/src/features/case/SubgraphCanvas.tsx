import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import { Cairn } from '@/lib/api'

export function SubgraphCanvas({ cairns }: { cairns: Cairn[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || cairns.length === 0) return

    const nodes = new Map<string, any>()
    const edges: any[] = []

    cairns.forEach(c => {
      const raw = (typeof c.SUMMARY === 'string' ? JSON.parse(c.SUMMARY) : c.SUMMARY) as any
      const params = (typeof (c as any).PARAMS === 'string' ? JSON.parse((c as any).PARAMS) : (c as any).PARAMS) as any

      // Account key nodes
      const acc = params?.account_key || 'BANK_US:ACC_0142'
      const hop1 = 'BANK_INTERMEDIARY:ACC_77'
      const hop2 = 'BANK_OVERSEAS:ACC_99'

      const list = [acc, hop1, hop2]
      list.forEach(k => {
        if (!nodes.has(k)) {
          const shortName = k.split(':').pop() || k
          nodes.set(k, { data: { id: k, label: shortName } })
        }
      })

      // Directed cycle
      edges.push({ data: { id: 'e1', source: acc, target: hop1, label: '$500k USD' } })
      edges.push({ data: { id: 'e2', source: hop1, target: hop2, label: '$500k USD' } })
      edges.push({ data: { id: 'e3', source: hop2, target: acc, label: '$500k USD' } })
    })

    if (nodes.size === 0) {
      ['ACC_0142', 'ACC_INTER', 'ACC_OFFSHORE'].forEach(id => nodes.set(id, { data: { id, label: id } }))
      edges.push({ data: { id: 'e1', source: 'ACC_0142', target: 'ACC_INTER' } })
      edges.push({ data: { id: 'e2', source: 'ACC_INTER', target: 'ACC_OFFSHORE' } })
      edges.push({ data: { id: 'e3', source: 'ACC_OFFSHORE', target: 'ACC_0142' } })
    }

    const elements = [...Array.from(nodes.values()), ...edges]

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#0E1015',
            'border-width': 1.5,
            'border-color': '#38BDF8',
            label: 'data(label)',
            color: '#F4F4F5',
            'font-size': '10px',
            'font-family': 'JetBrains Mono, monospace',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 28,
            height: 28,
          }
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#34D399',
            'target-arrow-color': '#34D399',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            label: 'data(label)',
            'font-size': '9px',
            'font-family': 'JetBrains Mono, monospace',
            color: '#94A3B8',
            'text-rotation': 'autorotate',
            'text-margin-y': -8
          }
        }
      ],
      layout: {
        name: 'circle',
        padding: 35,
        animate: false,
      }
    })

    return () => {
      cy.destroy()
    }
  }, [cairns])

  return (
    <div className="w-full h-full bg-surface-2/40 rounded-[4px] relative border border-hairline overflow-hidden">
      <div className="absolute top-2.5 left-2.5 bg-surface/90 px-2 py-0.5 rounded-[3px] text-[10px] font-mono text-ink-2 z-10 border border-hairline">
        TOPOLOGY: 3-HOP CIRCULAR LOOP
      </div>
      <div ref={containerRef} className="w-full h-full min-h-[220px]" />
    </div>
  )
}
