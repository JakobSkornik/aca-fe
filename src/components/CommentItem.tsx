import React, { useEffect, useRef, useState } from 'react'

type Props = {
  title: string
  text: string
  isActive: boolean
  className?: string
  titleClassName?: string
  textClassName?: string
  initialDelay?: number
  typewriterSpeed?: number
  finalizeIfNotHighlighted?: boolean
  id?: string
}

const CommentItem: React.FC<Props> = ({
  title,
  text,
  isActive,
  className = '',
  titleClassName = '',
  textClassName = '',
  initialDelay = 0,
  typewriterSpeed = 25,
  finalizeIfNotHighlighted = false,
  id
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
    if (!isActive && !isComplete) {
      timeoutsRef.current.forEach(t => clearTimeout(t))
      timeoutsRef.current = []
      setDisplayedText(text)
      setIsAnimating(false)
      setIsComplete(true)
    }
  }, [finalizeIfNotHighlighted, isActive, isComplete, text])

  return (
    <div className={`p-4 rounded-md transition-all duration-300 ${isActive ? 'bg-light-gray shadow-md transform scale-[1.02]' : 'bg-transparent border-b border-light-gray'} ${className}`}>
      <div className={`font-bold mb-2 transition-all duration-300 ${isActive ? 'text-lg text-darkest-gray' : 'text-sm text-dark-gray'} ${titleClassName}`}>{title}</div>
      <div className={`text-gray-800 leading-relaxed transition-all duration-300 ${isActive ? 'text-base' : 'text-sm'} ${textClassName}`}>
        {text}
      </div>
    </div>
  )
}

export default CommentItem