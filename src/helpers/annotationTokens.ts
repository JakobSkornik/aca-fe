import type { ResolvedAnnotationToken } from '@/types/WebSocketMessages'

export type AnnotationSegment =
  | { kind: 'text'; text: string }
  | {
      kind: 'token'
      tokenType: string
      raw: string
      content: string
      data: Record<string, unknown> | null
    }

const TOKEN_RE = /\[(\w+):([^\]]+)\]/g

/**
 * Split commentary into plain text and structured tokens.
 * Prefer `resolvedTokens` from the backend (FENs, from/to); otherwise parse `[type:content]` for display only.
 */
export function parseAnnotatedText(
  text: string,
  resolvedTokens?: ResolvedAnnotationToken[] | null
): AnnotationSegment[] {
  const src = text ?? ''
  if (resolvedTokens && resolvedTokens.length > 0) {
    return segmentsFromResolved(src, resolvedTokens)
  }
  return parseFromRegexOnly(src)
}

function segmentsFromResolved(text: string, resolvedTokens: ResolvedAnnotationToken[]): AnnotationSegment[] {
  const sorted = [...resolvedTokens].sort((a, b) => a.start - b.start)
  const out: AnnotationSegment[] = []
  let cursor = 0
  for (const t of sorted) {
    if (t.start > text.length) break
    if (t.start > cursor) {
      out.push({ kind: 'text', text: text.slice(cursor, t.start) })
    }
    if (t.end <= cursor) continue
    out.push({
      kind: 'token',
      tokenType: t.type,
      raw: t.raw,
      content: t.content,
      data: t.data ?? null,
    })
    cursor = Math.max(cursor, t.end)
  }
  if (cursor < text.length) {
    out.push({ kind: 'text', text: text.slice(cursor) })
  }
  if (out.length === 0) {
    return [{ kind: 'text', text }]
  }
  return out
}

function parseFromRegexOnly(text: string): AnnotationSegment[] {
  const out: AnnotationSegment[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: 'text', text: text.slice(last, m.index) })
    }
    out.push({
      kind: 'token',
      tokenType: m[1].toLowerCase(),
      raw: m[0],
      content: m[2].trim(),
      data: null,
    })
    last = m.index + m[0].length
  }
  if (last < text.length) {
    out.push({ kind: 'text', text: text.slice(last) })
  }
  if (out.length === 0) {
    return [{ kind: 'text', text }]
  }
  return out
}
