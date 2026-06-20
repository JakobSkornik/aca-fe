import React, { useEffect, useRef, useState } from 'react'
import AnnotatedText from './AnnotatedText'
import LlmDebugPanel from './LlmDebugPanel'
import { AccordionRow } from '@/components/ui/AccordionRow'
import type {
  AiCommentLlmDebug,
  ResolvedAnnotationToken,
} from '@/types/WebSocketMessages'
import {
  keyMomentLabel,
  keyMomentSeverity,
  severityBadgeClass,
} from '@/helpers/keyMoments'

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
  resolvedTokens?: ResolvedAnnotationToken[] | null
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
  resolvedTokens,
  llmDebug,
}) => {
  const hasInlineAnnotations =
    (resolvedTokens && resolvedTokens.length > 0) ||
    /\[(\w+):[^\]]+\]/.test(text)

  const [displayedText, setDisplayedText] = useState<string>('')
  const [isComplete, setIsComplete] = useState<boolean>(false)
  const charIndexRef = useRef<number>(0)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t))
    timeoutsRef.current = []
    charIndexRef.current = 0

    if (hasInlineAnnotations) {
      setDisplayedText(text)
      setIsComplete(true)
      return
    }

    setDisplayedText('')
    setIsComplete(false)

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
  }, [id, text, hasInlineAnnotations, initialDelay, typewriterSpeed])

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
    <div className={className}>
      {title || (keyMomentType && kmLabel) ? (
        <div
          className={`mb-1 flex flex-wrap items-center gap-1.5 ${titleClassName}`}
        >
          {title ? (
            <span className="font-bold text-text-primary">{title}</span>
          ) : null}
          {keyMomentType && kmLabel ? (
            <span
              className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${badgeClass}`}
            >
              {kmLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={`comment-text ${textClassName}`}>
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
      <div className="mt-2 space-y-0.5">
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
