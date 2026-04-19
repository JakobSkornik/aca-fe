import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Chessboard } from 'react-chessboard'

const BOARD_W = 200

type Props = {
  fen: string
  visible: boolean
  anchorEl: HTMLElement | null
}

/**
 * Small read-only board shown near the anchor while hovering a PV move.
 */
const PvHoverBoard: React.FC<Props> = ({ fen, visible, anchorEl }) => {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const place = useCallback(() => {
    if (!anchorEl) return
    const r = anchorEl.getBoundingClientRect()
    const pad = 8
    let left = r.right + pad
    let top = r.top
    if (left + BOARD_W > window.innerWidth - pad) {
      left = r.left - BOARD_W - pad
    }
    if (left < pad) left = pad
    if (top + BOARD_W > window.innerHeight - pad) {
      top = window.innerHeight - BOARD_W - pad
    }
    if (top < pad) top = pad
    setPos({ top, left })
  }, [anchorEl])

  useEffect(() => {
    if (!visible) return
    place()
    const onScroll = () => place()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [visible, place])

  if (!visible || !anchorEl) return null

  const board = (
    <div
      className="pointer-events-none fixed z-[9999] rounded border border-border-secondary bg-background-primary p-1 shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      <Chessboard
        position={fen}
        boardWidth={BOARD_W}
        customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
        customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
        arePiecesDraggable={false}
        boardOrientation="white"
        showBoardNotation={true}
      />
    </div>
  )

  return createPortal(board, document.body)
}

export default PvHoverBoard
