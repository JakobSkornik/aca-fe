import React, { useEffect, useRef, useState } from 'react'

type Props = {
  id: string
  title: string
  text: string
  highlighted: boolean
  className?: string
  titleClassName?: string
  textClassName?: string
  initialDelay?: number
  typewriterSpeed?: number
  finalizeIfNotHighlighted?: boolean
}

const CommentItem: React.FC<Props> = ({
  id,
  title,
  text,
  highlighted,
  className = '',
  titleClassName = '',
  textClassName = '',
  initialDelay = 500,
  typewriterSpeed = 25,
  finalizeIfNotHighlighted = false,
}) => {
  const [displayedText, setDisplayedText] = useState<string>('')
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [isComplete, setIsComplete] = useState<boolean>(false)
  const charIndexRef = useRef<number>(0)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    // start or continue animation on mount
    if (isComplete) return
    const start = () => {
      setIsAnimating(true)
      step()
    }
    const step = () => {
      if (charIndexRef.current >= text.length) {
        setIsComplete(true)
        setIsAnimating(false)
        return
      }
      const next = text.slice(0, charIndexRef.current + 1)
      setDisplayedText(next)
      charIndexRef.current += 1
      timeoutsRef.current.push(window.setTimeout(step, typewriterSpeed))
    }
    timeoutsRef.current.push(window.setTimeout(start, initialDelay))
    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t))
      timeoutsRef.current = []
    }
    // We intentionally depend only on the text/id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, text])

  // Optionally finalize when it loses highlight
  useEffect(() => {
    if (!finalizeIfNotHighlighted) return
    if (!highlighted && !isComplete) {
      timeoutsRef.current.forEach(t => clearTimeout(t))
      timeoutsRef.current = []
      setDisplayedText(text)
      setIsAnimating(false)
      setIsComplete(true)
    }
  }, [finalizeIfNotHighlighted, highlighted, isComplete, text])

  return (
    <div className={className}>
      <div className={titleClassName}>{title}</div>
      <div className={textClassName}>
        {displayedText}
        {isAnimating && <span className="animate-pulse">|</span>}
      </div>
    </div>
  )
}

export default CommentItem


