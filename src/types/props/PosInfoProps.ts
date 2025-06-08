import { Move } from '../chess/Move'

export interface PosInfoProps {
  mainNode: Move | null
  compareNode?: Move | null
  onClose?: () => void
  highlight?: boolean
}
