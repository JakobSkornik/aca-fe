import React, { useEffect, useRef, useState } from 'react'
import InlinePvMoves, { PvLineEntry } from './InlinePvMoves'
import AnnotatedText from './AnnotatedText'
import RagRefChips from './RagRefChips'
import LlmDebugPanel from './LlmDebugPanel'
import { AccordionRow } from '@/components/ui/AccordionRow'
import type { AiCommentLlmDebug, ResolvedAnnotationToken } from '@/types/WebSocketMessages'
import type { RagRef } from '@/contexts/GameStateManager'
import { keyMomentLabel, keyMomentSeverity, severityBadgeClass } from '@/helpers/keyMoments'

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
      timeoutsRef.current.forEach((t) => clearTimeout(t))
      timeoutsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, text, hasInlineAnnotations])

  useEffect(() => {
    if (!finalizeIfNotHighlighted) return
    if (!isActive && !isComplete) {
      timeoutsRef.current.forEach((t) => clearTimeout(t))
      timeoutsRef.current = []
      setDisplayedText(text)
      setIsComplete(true)
    }
  }, [finalizeIfNotHighlighted, isActive, isComplete, text])

  const sev = keyMomentSeverity(keyMomentType)
  const kmLabel = keyMomentLabel(keyMomentType)
  const badgeClass = keyMomentType ? severityBadgeClass(sev) : ''

  const paragraphs = text.split('\n').filter(Boolean)

  return (
    <div
      className={`rounded-lg transition-all duration-300 ${
        isActive
          ? 'bg-background-secondary shadow-md ring-1 ring-border-secondary'
          : 'border-b border-border-tertiary bg-transparent'
      } ${className}`}
    >
      <div className={`flex flex-wrap items-center gap-1.5 px-2.5 pb-1 pt-2 ${titleClassName}`}>
        <span
          className={`font-bold ${isActive ? 'text-sm text-text-primary' : 'text-xs text-text-secondary'}`}
        >
          {title}
        </span>
        {keyMomentType && kmLabel ? (
          <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${badgeClass}`}>
            {kmLabel}
          </span>
        ) : null}
      </div>
      <div
        className={`px-2.5 pb-2 text-text-secondary transition-all duration-300 ${
          isActive ? 'text-sm leading-snug' : 'text-xs leading-snug'
        } ${textClassName}`}
      >
        {hasInlineAnnotations ? (
          <AnnotatedText text={text} resolvedTokens={resolvedTokens} />
        ) : paragraphs.length <= 1 ? (
          displayedText || text
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {p}
            </p>
          ))
        )}
      </div>
      <div className="space-y-0.5 px-2.5 pb-2">
        {pvLine && pvLine.length > 0 ? (
          <AccordionRow label="Principal variation" defaultOpen={isActive}>
            <InlinePvMoves pvLine={pvLine} embedded />
          </AccordionRow>
        ) : null}
        {ragRefs && ragRefs.length > 0 ? (
          <AccordionRow label="Reference games (RAG)">
            <RagRefChips ragRefs={ragRefs} embedded />
          </AccordionRow>
        ) : null}
        {llmDebug ? (
          <AccordionRow label="LLM debug">
            <LlmDebugPanel debug={llmDebug} />
          </AccordionRow>
        ) : null}
      </div>
    </div>
  )
}

export default CommentItem
