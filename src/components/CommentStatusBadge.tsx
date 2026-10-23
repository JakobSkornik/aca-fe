import type { GameMove } from '@/types/GameJson'
import type { AiCommentLlmDebug } from '@/types/WebSocketMessages'

export interface CommentStatusBadgeProps {
  move?: GameMove | null
  llmDebug?: AiCommentLlmDebug
  generating?: boolean
  commentaryComplete?: boolean
}

const LABELS: Record<string, string> = {
  pending: 'Pending', generating: 'Generating', llm_unreviewed: 'LLM unreviewed',
  llm_approved: 'LLM approved', template_validation_failed: 'Template · validation failed',
  template_review_rejected: 'Template · review rejected', template_provider_failed: 'Template · provider failed',
  template_disabled: 'Template · LLM disabled', book: 'Book', reference: 'Reference',
  instructional: 'Template', template: 'Template', skipped: 'Skipped',
}

export function getCommentStatus({ move, generating, commentaryComplete }: CommentStatusBadgeProps): { label: string; reason?: string | null } | null {
  if (generating) return { label: 'Generating' }
  const status = move?.commentary_status
  if (status && LABELS[status]) return { label: LABELS[status], reason: move?.commentary_reason }
  if (move?.comment_kind === 'book' || move?.comment_kind === 'reference') return { label: LABELS[move.comment_kind] }
  // Older saved games lack provenance; avoid inferring LLM approval from text.
  if (move?.comment?.trim()) return { label: 'Commentary' }
  if (commentaryComplete === false) return { label: 'Pending' }
  return null
}

export function CommentStatusBadge(props: CommentStatusBadgeProps) {
  const status = getCommentStatus(props)
  if (!status) return null
  return <span className="inline-flex rounded border border-border-tertiary px-1.5 py-0.5 text-[10px] text-text-secondary" title={status.reason || undefined} role="status">{status.label}</span>
}

export default CommentStatusBadge
