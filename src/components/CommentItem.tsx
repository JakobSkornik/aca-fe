import React, { useEffect, useRef, useState } from 'react'
import InlinePvMoves, { PvLineEntry } from './InlinePvMoves'
import AnnotatedText from './AnnotatedText'
import RagRefChips from './RagRefChips'
import LlmDebugPanel from './LlmDebugPanel'
import type { AiCommentLlmDebug, ResolvedAnnotationToken } from '@/types/WebSocketMessages'
import type { RagRef } from '@/contexts/GameStateManager'

// Badge colors/labels for key moment types
const KEY_MOMENT_STYLES: Record<string, { label: string; className: string }> = {
  brilliant:                  { label: '!!',        className: 'bg-teal-500 text-white' },
  great_move:                 { label: '!',         className: 'bg-emerald-500 text-white' },
  good_defense:               { label: 'Defense',   className: 'bg-blue-500 text-white' },
  inaccuracy:                 { label: '?!',        className: 'bg-yellow-500 text-gray-900' },
  mistake:                    { label: '?',         className: 'bg-orange-500 text-white' },
  blunder:                    { label: '??',        className: 'bg-red-600 text-white' },
  missed_opportunity:         { label: 'Missed',    className: 'bg-amber-500 text-gray-900' },
  critical_decision:          { label: 'Critical',  className: 'bg-purple-600 text-white' },
  structural_transformation:  { label: 'Structure', className: 'bg-indigo-500 text-white' },
  king_safety_crisis:         { label: 'King!',     className: 'bg-red-500 text-white' },
  initiative_shift:           { label: 'Initiative',className: 'bg-cyan-600 text-white' },
  piece_activation:           { label: 'Activate',  className: 'bg-sky-500 text-white' },
  opening_transition:         { label: 'Opening',   className: 'bg-gray-500 text-white' },
  endgame_transition:         { label: 'Endgame',   className: 'bg-gray-600 text-white' },
}

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
  keyMomentType?: string
  pvLine?: PvLineEntry[]
  resolvedTokens?: ResolvedAnnotationToken[] | null
  ragRefs?: RagRef[]
  llmDebug?: AiCommentLlmDebug
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
  id,
  keyMomentType,
  pvLine,
  resolvedTokens,
  ragRefs,
  llmDebug,
}) => {
  const hasInlineAnnotations =
    (resolvedTokens && resolvedTokens.length > 0) || /\[(\w+):[^\]]+\]/.test(text)

  const [displayedText, setDisplayedText] = useState<string>('')
  const [isComplete, setIsComplete] = useState<boolean>(false)
  const charIndexRef = useRef<number>(0)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    if (hasInlineAnnotations) {
      timeoutsRef.current.forEach((t) => clearTimeout(t))
      timeoutsRef.current = []
      setDisplayedText(text)
      setIsComplete(true)
      return
    }
    // start or continue animation on mount
    if (isComplete) return
    const start = () => {
      step()
    }
    const step = () => {
      if (charIndexRef.current >= text.length) {
        setIsComplete(true)
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
  }, [id, text, hasInlineAnnotations])

  // Optionally finalize when it loses highlight
  useEffect(() => {
    if (!finalizeIfNotHighlighted) return
    if (!isActive && !isComplete) {
      timeoutsRef.current.forEach(t => clearTimeout(t))
      timeoutsRef.current = []
      setDisplayedText(text)
      setIsComplete(true)
    }
  }, [finalizeIfNotHighlighted, isActive, isComplete, text])

  // Key moment badge
  const badge = keyMomentType && KEY_MOMENT_STYLES[keyMomentType]
    ? KEY_MOMENT_STYLES[keyMomentType]
    : null

  // Split multi-sentence text into paragraphs for readability
  const paragraphs = text.split('\n').filter(Boolean)

  return (
    <div className={`p-4 rounded-md transition-all duration-300 ${isActive ? 'bg-light-gray shadow-md transform scale-[1.02]' : 'bg-transparent border-b border-light-gray'} ${className}`}>
      <div className={`flex items-center gap-2 mb-2 transition-all duration-300 ${titleClassName}`}>
        <span className={`font-bold ${isActive ? 'text-lg text-darkest-gray' : 'text-sm text-dark-gray'}`}>{title}</span>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className={`text-gray-800 leading-relaxed transition-all duration-300 ${isActive ? 'text-base' : 'text-sm'} ${textClassName}`}>
        {hasInlineAnnotations ? (
          <AnnotatedText text={text} resolvedTokens={resolvedTokens} />
        ) : paragraphs.length <= 1 ? (
          displayedText || text
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
              {p}
            </p>
          ))
        )}
      </div>
      {pvLine && pvLine.length > 0 && <InlinePvMoves pvLine={pvLine} />}
      {ragRefs && ragRefs.length > 0 && <RagRefChips ragRefs={ragRefs} />}
      {llmDebug && <LlmDebugPanel debug={llmDebug} />}
    </div>
  )
}

export default CommentItem