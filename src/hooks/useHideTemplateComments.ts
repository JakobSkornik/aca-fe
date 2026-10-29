import { useCallback, useEffect, useState } from 'react'

const KEY = 'aca_hide_template_comments'
const EVENT = 'aca:hide-template-comments'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0' // on by default
  } catch {
    return true
  }
}

/**
 * Whether only model-written comments are shown (template, book and reference
 * notes hidden). Shared by the move list and the commentary panel; remembered
 * per browser.
 */
export function useHideTemplateComments(): [boolean, (hide: boolean) => void] {
  const [hide, setHide] = useState(true)

  useEffect(() => {
    setHide(read())
    const sync = () => setHide(read())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])

  const update = useCallback((value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? '1' : '0')
    } catch {
      /* Storage can be disabled; the switch then lasts for this page only. */
    }
    setHide(value)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return [hide, update]
}

/** Whether a move's comment is shown: always, or only when the model wrote it. Older
 * games without a recorded comment kind keep showing their comments. */
export function isShownComment(move: { comment_kind?: string | null } | undefined, hideTemplates: boolean): boolean {
  if (!hideTemplates) return true
  const kind = move?.comment_kind
  return kind == null || kind === 'llm'
}
