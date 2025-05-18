export type PosFeature =
  | 'Bishops'
  | 'Imbalance'
  | 'King Safety'
  | 'Knights'
  | 'Material'
  | 'Mobility'
  | 'Passed Pawns'
  | 'Queens'
  | 'Rooks'
  | 'Space'
  | 'Threats'
  | 'Winnable'
  | 'Total'

export type Trace = {
  [K in PosFeature]: number
}
