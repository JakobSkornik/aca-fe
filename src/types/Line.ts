/** Shared shapes for variation lines shown in chips and the embedded player. */

export type LineStep = {
  san: string
  fen: string
  from?: string
  to?: string
}

export type KeyFactor = {
  text: string
  text_state?: string | null
  features?: string[]
  delta_cp?: number
  flag_note?: string | null
  beneficiary?: string | null
  is_concession?: boolean
}

export type PlayerLine = {
  steps: LineStep[]
  /** Position the line starts from. */
  startFen?: string | null
  evalCp?: number | null
  evalMate?: number | null
  depth?: number | null
  keyFactors?: KeyFactor[]
  title?: string
  /** Feature progression along this line (point 0 = start, then per ply), cp. */
  featureSeries?: Record<string, number[]>
  /** Feature names the comment fired on — the charts to show beside the board. */
  chartFeatures?: string[]
}
