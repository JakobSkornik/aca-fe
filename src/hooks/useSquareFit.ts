import { useEffect, useState } from 'react'

type Options = {
  padding?: number
  min?: number
  max?: number
  mode?: 'contain' | 'width' | 'height'
}

/**
 * Computes the largest square size that fits inside the containerRef element.
 * - Observes only the container, avoiding layout feedback loops.
 * - Returns a clamped integer size suitable for pixel dimensions.
 */
export function useSquareFit(
  containerRef: React.RefObject<HTMLElement | null>,
  { padding = 0, min = 0, max = Infinity, mode = 'contain' }: Options = {}
) {
  const [size, setSize] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const compute = () => {
      const rect = el.getBoundingClientRect()
      const availW = Math.max(0, rect.width - padding * 2)
      const availH = Math.max(0, rect.height - padding * 2)

      let next = 0
      if (mode === 'width') next = availW
      else if (mode === 'height') next = availH
      else next = Math.min(availW, availH)

      next = Math.floor(Math.max(min, Math.min(max, next)))
      setSize(next)
    }

    compute()

    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, padding, min, max, mode])

  return size
}

