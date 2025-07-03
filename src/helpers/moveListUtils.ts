import { Move } from '@/types/chess/Move'
import { CaptureCount } from '@/types/chess/CaptureCount'

/**
 * Utility functions for managing a 2D move list structure where:
 * - moveList[idx][0] contains the mainline move
 * - moveList[idx][1...n] contains the PV moves for that position
 * - PV moves for position idx are stored at idx + 1
 */

export type MoveList = Move[][]

/**
 * Creates an empty move list
 */
export function createMoveList(): MoveList {
  return []
}

/**
 * Adds a mainline move to the move list
 */
export function addMainlineMove(moveList: MoveList, move: Move): MoveList {
  const newMoveList = [...moveList]
  newMoveList.push([move])
  return newMoveList
}

/**
 * Gets the mainline move at the specified index
 */
export function getMainlineMove(moveList: MoveList, index: number | null): Move | null {
  if (index === null || index < 0 || index >= moveList.length) {
    return null
  }
  return moveList[index][0] || null
}

/**
 * Gets all moves (mainline + PV) at the specified index
 */
export function getMovesAtIndex(moveList: MoveList, index: number): Move[] {
  if (index < 0 || index >= moveList.length) {
    return []
  }
  return moveList[index]
}

/**
 * Gets the PV moves for a given position index
 * PV moves for position idx are stored at idx + 1
 */
export function getPvMoves(moveList: MoveList, positionIndex: number): Move[] {
  const pvIndex = positionIndex + 1
  if (pvIndex < 0 || pvIndex >= moveList.length) {
    return []
  }
  // Return all moves except the first one (which is the mainline move)
  return moveList[pvIndex].slice(1)
}

/**
 * Sets the PV moves for a given position index
 * PV moves for position idx are stored at idx + 1
 */
export function setPvMoves(moveList: MoveList, positionIndex: number, pvMoves: Move[]): MoveList {
  const pvIndex = positionIndex + 1
  const newMoveList = [...moveList]
  
  // Ensure the array exists at pvIndex
  if (pvIndex >= newMoveList.length) {
    // Extend the array if necessary
    while (newMoveList.length <= pvIndex) {
      newMoveList.push([])
    }
  }
  
  // If there's no array at pvIndex, create one
  if (!newMoveList[pvIndex]) {
    newMoveList[pvIndex] = []
  }
  
  // Keep the mainline move (first element) and replace PV moves
  const mainlineMove = newMoveList[pvIndex][0]
  newMoveList[pvIndex] = mainlineMove ? [mainlineMove, ...pvMoves] : [...pvMoves]
  
  return newMoveList
}

/**
 * Updates a mainline move at the specified index
 */
export function updateMainlineMove(moveList: MoveList, index: number, move: Move): MoveList {
  if (index < 0 || index >= moveList.length) {
    return moveList
  }
  
  const newMoveList = [...moveList]
  const existingMoves = [...newMoveList[index]]
  existingMoves[0] = move
  newMoveList[index] = existingMoves
  
  return newMoveList
}

/**
 * Updates the entire move array at the specified index
 */
export function updateMovesAtIndex(moveList: MoveList, index: number, moves: Move[]): MoveList {
  if (index < 0) {
    return moveList
  }
  
  const newMoveList = [...moveList]
  
  // Extend the array if necessary
  while (newMoveList.length <= index) {
    newMoveList.push([])
  }
  
  newMoveList[index] = [...moves]
  return newMoveList
}

/**
 * Gets the total number of positions in the move list
 */
export function getMoveListLength(moveList: MoveList): number {
  return moveList.length
}

/**
 * Checks if the move list is empty
 */
export function isMoveListEmpty(moveList: MoveList): boolean {
  return moveList.length === 0
}

/**
 * Converts the old Move[][] format to the new 2D structure
 * This is for backward compatibility during migration
 */
export function convertLegacyMoveList(legacyMoves: Move[][]): MoveList {
  return legacyMoves.map(moveArray => Array.isArray(moveArray) ? moveArray : [moveArray])
}

/**
 * Finds the index of a move by its position (FEN)
 */
export function findMoveIndexByPosition(moveList: MoveList, position: string): number {
  return moveList.findIndex(moves => moves.length > 0 && moves[0].position === position)
}

/**
 * Creates a copy of the move list
 */
export function cloneMoveList(moveList: MoveList): MoveList {
  return moveList.map(moves => [...moves])
}

/**
 * Removes PV moves for a given position index
 */
export function removePvMoves(moveList: MoveList, positionIndex: number): MoveList {
  const pvIndex = positionIndex + 1
  if (pvIndex < 0 || pvIndex >= moveList.length) {
    return moveList
  }
  
  const newMoveList = [...moveList]
  const mainlineMove = newMoveList[pvIndex][0]
  newMoveList[pvIndex] = mainlineMove ? [mainlineMove] : []
  
  return newMoveList
}

/**
 * Converts a Move[] to MoveList by wrapping each move in an array
 * Useful for WebSocket payloads that send Move[] instead of Move[][]
 */
export function convertMoveArrayToMoveList(moves: Move[]): MoveList {
  return moves.map(move => [move])
}

/**
 * Converts a Record<number, Move[][]> PV structure to the new MoveList format
 * This integrates PVs into the correct positions in the move list
 */
export function integratePvsIntoMoveList(moveList: MoveList, pvs: Record<number, Move[][]>): MoveList {
  let result = cloneMoveList(moveList)
  
  Object.entries(pvs).forEach(([indexStr, pvMoves]) => {
    const index = parseInt(indexStr)
    if (pvMoves && pvMoves.length > 0) {
      // Flatten the PV moves and integrate them
      const flattenedPvs = pvMoves.flat()
      result = setPvMoves(result, index, flattenedPvs)
    }
  })
  
  return result
}

/**
 * Gets all mainline moves as a simple Move[] array
 * Useful for backward compatibility
 */
export function getMainlineMoves(moveList: MoveList): Move[] {
  return moveList.map(moves => moves[0]).filter(move => move !== undefined)
}

/**
 * Gets PVs in the legacy Record<number, Move[][]> format
 * Useful for backward compatibility with existing APIs
 */
export function getPvsAsRecord(moveList: MoveList): Record<number, Move[][]> {
  const pvs: Record<number, Move[][]> = {}
  
  moveList.forEach((_, index) => {
    const pvMoves = getPvMoves(moveList, index)
    if (pvMoves.length > 0) {
      // Group PV moves back into arrays (this might need adjustment based on your PV structure)
      pvs[index] = [pvMoves]
    }
  })
  
  return pvs
}

// === Elegant Component Helper Functions ===

/**
 * Gets the current move position (FEN) safely
 */
export function getCurrentPosition(moveList: MoveList, index: number): string | null {
  const move = getMainlineMove(moveList, index)
  return move?.position || null
}

/**
 * Gets captures for a specific move safely
 */
export function getCapturesForMove(moveList: MoveList, index: number): {
  capturedByWhite: CaptureCount | undefined
  capturedByBlack: CaptureCount | undefined
} {
  const move = getMainlineMove(moveList, index)
  return {
    capturedByWhite: move?.capturedByWhite,
    capturedByBlack: move?.capturedByBlack
  }
}

/**
 * Gets move annotation safely
 */
export function getMoveAnnotation(moveList: MoveList, index: number): string | undefined {
  const move = getMainlineMove(moveList, index)
  return move?.annotation
}

/**
 * Gets move evaluation safely
 */
export function getMoveEvaluation(moveList: MoveList, index: number): {
  score: any
  depth: number | undefined
} | null {
  const move = getMainlineMove(moveList, index)
  if (!move) return null
  
  return {
    score: move.score,
    depth: move.depth
  }
}

/**
 * Checks if a position has PV moves
 */
export function hasPvMoves(moveList: MoveList, positionIndex: number): boolean {
  return getPvMoves(moveList, positionIndex).length > 0
}

/**
 * Gets the total number of mainline moves (ignoring PVs)
 */
export function getMainlineMoveCount(moveList: MoveList): number {
  return moveList.filter(moves => moves.length > 0 && moves[0]).length
}

/**
 * Safely gets the FEN for the starting position (before first move)
 */
export function getStartingPosition(): string {
  return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
}

/**
 * Gets position for any move index, including -1 for starting position
 */
export function getPositionForIndex(moveList: MoveList, index: number): string {
  if (index < 0) {
    return getStartingPosition()
  }
  return getCurrentPosition(moveList, index) || getStartingPosition()
}

/**
 * Navigation helpers
 */
export function canGoToNext(moveList: MoveList, currentIndex: number): boolean {
  return currentIndex < getMainlineMoveCount(moveList) - 1
}

export function canGoToPrevious(currentIndex: number): boolean {
  return currentIndex > -1 // -1 represents starting position
}

export function getNextMoveIndex(moveList: MoveList, currentIndex: number): number {
  if (canGoToNext(moveList, currentIndex)) {
    return currentIndex + 1
  }
  return currentIndex
}

export function getPreviousMoveIndex(currentIndex: number): number {
  if (canGoToPrevious(currentIndex)) {
    return currentIndex - 1
  }
  return currentIndex
}

/**
 * Converts CaptureCount to display strings for UI
 */
export function formatCapturesForDisplay(captures: CaptureCount | undefined, isWhitePerspective: boolean): string {
  if (!captures) return ''
  
  const captureMap = isWhitePerspective 
    ? { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' } // Black pieces (captured by white)
    : { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' } // White pieces (captured by black)
  
  const captureStrings: string[] = []
  Object.entries(captures).forEach(([piece, count]) => {
    if (count > 0) {
      captureStrings.push(`${captureMap[piece as keyof CaptureCount]} `.repeat(count))
    }
  })
  
  return captureStrings.join('')
}

/**
 * Gets all PV moves at a specific position as Move[] arrays
 * Each array represents one PV line
 */
export function getAllPvsAtPosition(moveList: MoveList, positionIndex: number): Move[][] {
  const pvMoves = getPvMoves(moveList, positionIndex)
  // For now, treat all PV moves as a single line
  // This may need to be adjusted based on how your PVs are structured
  return pvMoves.length > 0 ? [pvMoves] : []
}

/**
 * Gets a specific move from a PV array by index
 */
export function getMoveFromPv(pv: Move[], moveIndex: number): Move | null {
  if (moveIndex < 0 || moveIndex >= pv.length) {
    return null
  }
  return pv[moveIndex]
}

/**
 * Gets the first move from a PV array (for score access)
 */
export function getFirstMoveFromPv(pv: Move[]): Move | null {
  return pv.length > 0 ? pv[0] : null
}

/**
 * Finds the index [i, j] of any move (mainline or PV) by its position (FEN)
 */
export function findAnyMoveIndexByPosition(moveList: MoveList, position: string): [number, number] | null {
  for (let i = 0; i < moveList.length; i++) {
    for (let j = 0; j < moveList[i].length; j++) {
      if (moveList[i][j]?.position === position) {
        return [i, j]
      }
    }
  }
  return null
}
