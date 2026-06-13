import React from 'react'

// Ported from the chess-annotator template (2px stroke, 24-box).
const PATHS: Record<string, string> = {
  flip: '<path d="M3 7h13l-3-3M21 17H8l3 3"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  moon: '<path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8z"/>',
  first: '<path d="M18 6l-7 6 7 6M7 5v14"/>',
  prev: '<path d="M15 6l-7 6 7 6"/>',
  next: '<path d="M9 6l7 6-7 6"/>',
  last: '<path d="M6 6l7 6-7 6M17 5v14"/>',
  play: '<path d="M7 5l11 7-11 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  chevDown: '<path d="M6 9l6 6 6-6"/>',
  chevRight: '<path d="M9 6l6 6-6 6"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
}

type Props = { name: string; size?: number; className?: string }

const Icon: React.FC<Props> = ({ name, size = 16, className }) => {
  const filled = name === 'play' || name === 'pause'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: PATHS[name] || '' }}
    />
  )
}

export default Icon
