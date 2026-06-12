import React from 'react'
import PvLineChips from './PvLineChips'

export type PvLineEntry = { san: string; fen: string }

type Props = {
  pvLine: PvLineEntry[]
  /** Inside an accordion or card — omit extra chrome */
  embedded?: boolean
}

/**
 * Renders engine PV moves as chips; hover previews the position, click opens
 * the line popup (slider / autoplay / step controls).
 */
const InlinePvMoves: React.FC<Props> = ({ pvLine, embedded = false }) => {
  if (!pvLine.length) return null

  const wrapClass = embedded ? '' : 'mt-2 border-t border-border-tertiary pt-2'

  return (
    <div className={wrapClass}>
      {!embedded ? (
        <div className="mb-1 text-xs font-semibold text-text-tertiary">
          Engine line (hover to preview, click to play)
        </div>
      ) : null}
      <PvLineChips steps={pvLine} />
    </div>
  )
}

export default InlinePvMoves
