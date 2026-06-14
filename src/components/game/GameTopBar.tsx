import React, { useEffect, useRef, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { useTheme } from '@/helpers/useTheme'

type Props = {
  jobLabel: string
  onHome: () => void
  onFlip: () => void
  onExportPgn: () => void
  onExportJson: () => void
}

/** Game-view topbar (chess-annotator template chrome): brand, theme toggle,
 * flip, and an Export dropdown. */
const GameTopBar: React.FC<Props> = ({ jobLabel, onHome, onFlip, onExportPgn, onExportJson }) => {
  const { theme, toggle } = useTheme()
  const [menu, setMenu] = useState(false)
  const mref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (mref.current && !mref.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="ca-topbar">
      <button type="button" className="brand" onClick={onHome} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
        <div className="brand-mark">{'♞︎'}</div>
        <div>
          <div className="brand-title">Chess Annotator</div>
          <div className="brand-sub mono">{jobLabel}</div>
        </div>
      </button>
      <div style={{ flex: 1 }} />
      <button className="btn icon-btn" title="Toggle theme" onClick={toggle}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
      <button className="btn" onClick={onFlip}>
        <Icon name="flip" />
        Flip
      </button>
      <div className="menu-wrap" ref={mref}>
        <button className="btn btn-primary" onClick={() => setMenu((v) => !v)}>
          <Icon name="download" />
          Export
          <Icon name="chevDown" size={14} />
        </button>
        {menu ? (
          <div className="menu">
            <button
              onClick={() => {
                onExportPgn()
                setMenu(false)
              }}
            >
              <Icon name="download" />
              Export PGN
            </button>
            <button
              onClick={() => {
                onExportJson()
                setMenu(false)
              }}
            >
              <Icon name="download" />
              Export JSON
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default GameTopBar
