import { Move } from '../chess/Move'

export type ChartProps = {
  mainNode?: Move | null
  compareNode?: Move | null
  maxDepth: number
  onClickNode: (node: Move) => void
}
