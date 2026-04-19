import React, { useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useGameState } from '@/contexts/GameStateContext'
import { UIHelpers } from '@/helpers/uiHelpers'
import Tooltip from '@/components/ui/Tooltip'

const triggerCell = 'relative block h-full min-h-[2rem] min-w-0 w-full'

/** Compact nav for the Moves panel (first/prev/next/last + close), laid out in a full-width bar. */
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

  const btn = `${UIHelpers.getButtonClasses()} !m-0 !rounded-none !border-0 !shadow-none flex h-full min-h-[2rem] w-full items-center justify-center !px-0 !py-1`
  const iconBtn = `${UIHelpers.getIconButtonClasses()} !m-0 !rounded-none !border-0 flex h-full min-h-[2rem] w-full items-center justify-center !p-0`

  return (
    <div className="grid w-full shrink-0 grid-cols-5 divide-x divide-border-tertiary">
      <div className="min-w-0">
        <Tooltip content="Go to first move" triggerClassName={triggerCell}>
          <button type="button" onClick={() => handleMoveNavigation('first')} className={btn}>
            <Image src="/icons/fast_back.svg" alt="First" width={14} height={14} className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
      <div className="min-w-0">
        <Tooltip content="Previous move" triggerClassName={triggerCell}>
          <button type="button" onClick={() => handleMoveNavigation('prev')} className={btn}>
            <Image src="/icons/back.svg" alt="Previous" width={14} height={14} className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
      <div className="min-w-0">
        <Tooltip content="Next move" triggerClassName={triggerCell}>
          <button type="button" onClick={() => handleMoveNavigation('next')} className={btn}>
            <Image src="/icons/forward.svg" alt="Next" width={14} height={14} className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
      <div className="min-w-0">
        <Tooltip content="Go to last move" triggerClassName={triggerCell}>
          <button type="button" onClick={() => handleMoveNavigation('last')} className={btn}>
            <Image src="/icons/fast_forward.svg" alt="Last" width={14} height={14} className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
      <div className="min-w-0">
        <Tooltip content="Close analysis session" triggerClassName={triggerCell}>
          <button type="button" onClick={() => router.push('/')} className={iconBtn}>
            <Image src="/icons/close.svg" alt="Close" width={14} height={14} className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

export default MoveNavButtons
