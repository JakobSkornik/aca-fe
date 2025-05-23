import React, { useState, useRef } from 'react'

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  let tooltipClass =
    'absolute z-50 px-2 py-1 text-xs bg-dark-gray text-lightest-gray rounded shadow whitespace-nowrap'

  // Position styling
  switch (position) {
    case 'top':
      tooltipClass += ' bottom-full left-1/2 transform -translate-x-1/2 mb-1'
      break
    case 'bottom':
      tooltipClass += ' top-full left-1/2 transform -translate-x-1/2 mt-1'
      break
    case 'left':
      tooltipClass += ' right-full top-1/2 transform -translate-y-1/2 mr-1'
      break
    case 'right':
      tooltipClass += ' left-full top-1/2 transform -translate-y-1/2 ml-1'
      break
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && <div className={tooltipClass}>{content}</div>}
    </div>
  )
}

export default Tooltip
