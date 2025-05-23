import { MoveAnalysisNode } from '../ws';

export interface MoveTreeProps {
  moveTree: Record<string, MoveAnalysisNode>
  onClose: () => void
  onArrowHover: (arrow: string | null) => void
}
