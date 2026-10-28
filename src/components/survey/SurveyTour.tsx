import { useLayoutEffect, useState } from 'react'
import styles from './survey.module.css'

/** One message per region of the round; region 3 holds both the comments and the questions. */
export const TOUR_STEPS = [
  { region: 1, title: 'The board',
    text: 'This board shows the position after the move the comments discuss. The green arrow is the move that was played; a gray arrow marks the engine’s alternative. The buttons below the board step through the game.' },
  { region: 2, title: 'Variations',
    text: 'The comments are written from these engine lines. The small board plays through the selected line; choose the main line or the alternative below it.' },
  { region: 3, title: 'The comments',
    text: 'These are the generated comments you will evaluate. Each is written for the same move and the same audience; the authors are hidden.' },
  { region: 3, title: 'Your ratings',
    text: 'Rate every comment from 1 to 5 on each question, then press “Save & continue”. If you cannot judge a round, skip it.' },
]
const CARD_WIDTH = 340
const GAP = 16

/** Card placed beside the highlighted region; the region itself is highlighted by CSS (data-tour). */
export default function SurveyTour({ step, onNext, onClose }: { step: number; onNext: () => void; onClose: () => void }) {
  const current = TOUR_STEPS[step - 1]
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const region = document.querySelector(`[data-tour-region="${current.region}"]`)
      if (!region) return
      const rect = region.getBoundingClientRect()
      const width = Math.min(CARD_WIDTH, window.innerWidth - 32)
      // Beside the region, on whichever side has room; stacked layouts put it below the region's top.
      let left = rect.right + GAP
      if (left + width > window.innerWidth - GAP) left = rect.left - GAP - width
      if (left < GAP) left = Math.min(Math.max(GAP, rect.left + GAP), window.innerWidth - width - GAP)
      const top = Math.min(Math.max(GAP, rect.top + 72), window.innerHeight - 260)
      setPosition({ left, top })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [current.region, step])

  const last = step === TOUR_STEPS.length
  return <div key={step} role="dialog" aria-modal="false" aria-labelledby="survey-tour-title" className={styles.tourCard}
    style={position ? { left: position.left, top: position.top } : { visibility: 'hidden' }}>
    <span className={styles.tourStep}>Guide · {step} of {TOUR_STEPS.length}</span>
    <h2 id="survey-tour-title" style={{ fontSize: 17, margin: '4px 0 0' }}>{current.title}</h2>
    <p>{current.text}</p>
    <div className={styles.tourActions}>
      <button type="button" className={styles.tourSkip} onClick={onClose}>Skip guide</button>
      <button type="button" className={styles.button} autoFocus onClick={last ? onClose : onNext}>{last ? 'Start rating' : 'Next →'}</button>
    </div>
  </div>
}
