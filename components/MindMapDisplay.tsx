import React, { useEffect, useRef, useState } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { Toolbar } from 'markmap-toolbar'
import 'markmap-toolbar/dist/style.css'

interface MindMapDisplayProps {
  markdown: string
}

const transformer = new Transformer()

export function MindMapDisplay({ markdown }: MindMapDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mm, setMm] = useState<Markmap | null>(null)
  const refToolbar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (svgRef.current && !mm) {
      const markmap = Markmap.create(svgRef.current)
      setMm(markmap)

      if (refToolbar.current) {
        Toolbar.create(markmap)
      }
    }
  }, [svgRef.current])

  useEffect(() => {
    if (mm && markdown) {
      const { root } = transformer.transform(markdown)
      mm.setData(root)
      mm.fit()
    }
  }, [mm, markdown])

  return (
    <div className="relative flex h-full w-full flex-col" style={{ minHeight: '500px' }}>
      <div className="flex-1 overflow-hidden rounded-lg border bg-white">
        <svg ref={svgRef} className="h-full w-full" style={{ minHeight: '500px' }} />
      </div>
      <div ref={refToolbar} className="absolute bottom-4 right-4" />
    </div>
  )
}
