// src/helpers/openingBook.ts

// — assuming you’ve downloaded these from the eco.json repo into this folder
import ecoA from './openings/ecoA.json'
import ecoB from './openings/ecoB.json'
import ecoC from './openings/ecoC.json'
import ecoD from './openings/ecoD.json'
import ecoE from './openings/ecoE.json'
import ecoInterpolated from './openings/eco_interpolated.json'

type EcoEntry = {
  name: string
  // other fields we don’t need here...
}

// merge all ECO objects into one
const ecoAll: Record<string, EcoEntry> = {
  ...ecoA,
  ...ecoB,
  ...ecoC,
  ...ecoD,
  ...ecoE,
  ...ecoInterpolated,
}

// build a simple map: fen → opening name
const openingBook: Record<string, string> = {}
for (const [fen, entry] of Object.entries(ecoAll)) {
  openingBook[fen] = entry.name
}

export default openingBook
