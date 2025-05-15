export interface MoveTreeConfig {
  bandColors: {
    white: string
    black: string
  }
  nodeColors: {
    white: string
    black: string
    mainlineWhite: string
    mainlineBlack: string
    pv: string
    alternative: string
  }
  linkColors?: {
    mainline?: string
    pv?: string
    alternative?: string
  }
  fontFamily: string
}
