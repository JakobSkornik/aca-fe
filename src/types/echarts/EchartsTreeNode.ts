import { Move } from '../chess/Move'

export interface EchartsTreeNode {
  name: string
  value: number | null
  itemStyle: {
    color: string
    borderColor?: string
    borderWidth?: number
    shadowBlur?: number
    shadowColor?: string
  }
  lineStyle?: {
    color?: string
    width?: number
  }
  symbol: string
  symbolSize: number
  label?: {
    position?: string
    verticalAlign?: string
    align?: string
    formatter?: (params: { data: EchartsTreeNode }) => string
    color?: string
    fontWeight?: number
    fontSize?: number
  }
  children: EchartsTreeNode[]
  analysisNode: Move
  depth: number
}
