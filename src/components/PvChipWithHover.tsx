import React, { useState } from 'react'
import PvHoverBoard from './PvHoverBoard'

type Props = {
  san: string
  fenAfterMove: string
  className: string
}

/**
 * PV SAN chip with hover mini-board (reuses PvHoverBoard).
 */
const PvChipWithHover: React.FC<Props> = ({ san, fenAfterMove, className }) => {
  const [hover, setHover] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    setHover(true)
    setAnchorEl(e.currentTarget)
  }

  const onLeave = () => {
    setHover(false)
    setAnchorEl(null)
  }

  return (
    <>
      <span
        className={className}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {san}
      </span>
      {hover && fenAfterMove && (
        <PvHoverBoard fen={fenAfterMove} visible={hover} anchorEl={anchorEl} />
      )}
    </>
  )
}

export default PvChipWithHover
