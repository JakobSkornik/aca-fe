import React, { useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useGameState } from '@/contexts/GameStateContext'
import { UIHelpers } from '@/helpers/uiHelpers'
import Tooltip from '@/components/ui/Tooltip'

/** Compact nav for the Moves card header (first/prev/next/last + close). */
const MoveNavButtons: React.FC = () => {
  const { manager } = useGameState()
  const router = useRouter()

  const handleMoveNavigation = useCallback(
    (action: 'first' | 'prev' | 'next' | 'last') => {
      switch (action) {
        case 'first':
          manager.goToFirst()
          break
        case 'prev':
          manager.movePrev()
          break
        case 'next':
          manager.moveNext()
          break
        case 'last':
          manager.goToLast()
          break
      }
    },
    [manager]
  )

  const btn = `${UIHelpers.getButtonClasses()} !px-1.5 !py-1`
  const iconBtn = `${UIHelpers.getIconButtonClasses()} !p-1`

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Tooltip content="Go to first move">
        <button type="button" onClick={() => handleMoveNavigation('first')} className={btn}>
          <Image src="/icons/fast_back.svg" alt="First" width={14} height={14} className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <Tooltip content="Previous move">
        <button type="button" onClick={() => handleMoveNavigation('prev')} className={btn}>
          <Image src="/icons/back.svg" alt="Previous" width={14} height={14} className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <Tooltip content="Next move">
        <button type="button" onClick={() => handleMoveNavigation('next')} className={btn}>
          <Image src="/icons/forward.svg" alt="Next" width={14} height={14} className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <Tooltip content="Go to last move">
        <button type="button" onClick={() => handleMoveNavigation('last')} className={btn}>
          <Image src="/icons/fast_forward.svg" alt="Last" width={14} height={14} className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <Tooltip content="Close analysis session">
        <button type="button" onClick={() => router.push('/')} className={iconBtn}>
          <Image src="/icons/close.svg" alt="Close" width={14} height={14} className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  )
}

export default MoveNavButtons
