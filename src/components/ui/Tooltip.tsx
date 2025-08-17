import React, { useState, useRef, useEffect } from 'react'

type TooltipProps = {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current && !isVisible) {
        const rect = triggerRef.current.getBoundingClientRect()
        let x = rect.left + rect.width / 2
        let y = rect.top

        // Adjust position based on tooltip position preference
        switch (position) {
          case 'top':
            y = rect.top - 8 // 8px above the element
            break
          case 'bottom':
            y = rect.bottom + 8
            break
          case 'left':
            x = rect.left - 8
            y = rect.top + rect.height / 2
            break
          case 'right':
            x = rect.right + 8
            y = rect.top + rect.height / 2
            break
        }

        setTooltipPosition({ x, y })
        setIsVisible(true)
      }
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onMouseMove={(e) => {
          // Prevent mouse move from triggering tooltip recalculation
          e.stopPropagation()
        }}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="fixed z-[9999] px-2 py-1 text-xs bg-dark-gray text-darkest-gray rounded shadow whitespace-pre-wrap break-words max-w-[420px] transform -translate-x-1/2 pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

export default Tooltip
