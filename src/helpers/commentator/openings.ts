import { MoveAnalysisNode } from '@/types/AnalysisResult'

import ecoA from './openings/ecoA.json'
import ecoB from './openings/ecoB.json'
import ecoC from './openings/ecoC.json'
import ecoD from './openings/ecoD.json'
import ecoE from './openings/ecoE.json'
import ecoInterpolated from './openings/eco_interpolated.json'

type EcoEntry = {
  name: string
}

const ecoAll: Record<string, EcoEntry> = {
  ...ecoA,
  ...ecoB,
  ...ecoC,
  ...ecoD,
  ...ecoE,
  ...ecoInterpolated,
}

const openingBook: Record<string, string> = {}
for (const [fen, entry] of Object.entries(ecoAll)) {
  openingBook[fen] = entry.name
}

export default openingBook

export function getOpeningName(node: MoveAnalysisNode): string | null {
  if (!node?.fen) return null
  return openingBook[node.fen] || null
}

export function getOpeningComment(node: MoveAnalysisNode): string | null {
  const openingName = getOpeningName(node)
  return openingName ? `Book move: ${openingName}.` : null
}
