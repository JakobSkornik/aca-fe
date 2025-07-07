import { Move } from '@/types/chess/Move'
import { CaptureCount } from '@/types/chess/CaptureCount'
import { MoveListServerPayload, NodeAnalysisUpdatePayload } from '@/types/WebSocketMessages'
import { calculateScoreDiff, classifyMove, applyMoveClassification } from '@/helpers/commentator/utils'

/**
 * Utility functions for managing a 2D move list structure where:
 * - moveList[idx][0] contains the mainline move
 * - moveList[idx][1...n] contains the PV moves for that position
 * - PV moves for position idx are stored at idx + 1
 */

export class MoveListItem {
  move: Move
  pv1: Move[]
  pv2: Move[]

  constructor(move: Move, pv1: Move[] = [], pv2: Move[] = []) {
    this.move = move
    this.pv1 = pv1
    this.pv2 = pv2
  }
}

export class MoveList {
  moves: MoveListItem[]

  constructor(moves: MoveListItem[] = []) { 
    this.moves = moves
  }

  // === Core Move List Operations ===

  /**
   * Gets the mainline move at the specified index with safety checks
   */
  getMainlineMove(index: number | undefined): Move[] {
    if (index === undefined || index < 0 || index >= this.moves.length) {
      return []
    }
    return this.moves.slice(0, index + 1).map(move => move.move)
  }

  /**
   * Gets the mainline move at a specific index
   */
  getMoveAtIndex(index: number): Move | null {
    if (index < 0 || index >= this.moves.length) {
      return null
    }
    return this.moves[index].move
  }

  /**
   * Finds the index of a move by its ID with safety checks
   */
  getMoveIdxById(id: number): number {
    if (id === undefined || id === null) {
      return -1
    }

    let result = this.moves.findIndex(move => move.move.id === id)
    if (result !== -1) return result

    result = this.moves.findIndex(move => move.pv1.find(pv => pv.id === id))
    if (result !== -1) return result

    result = this.moves.findIndex(move => move.pv2.find(pv => pv.id === id))
    return result
  }

  /**
   * Gets PV1 moves for a specific index with safety checks
   */
  getPv1(index: number): Move[] {
    if (index < 0 || index >= this.moves.length) {
      return []
    }
    return [...this.moves[index].pv1]
  }

  /**
   * Gets PV2 moves for a specific index with safety checks
   */
  getPv2(index: number): Move[] {
    if (index < 0 || index >= this.moves.length) {
      return []
    }
    return [...this.moves[index].pv2]
  }

  /**
   * Gets all PV moves for a specific index with safety checks
   */
  getPvMoves(index: number): Move[] {
    if (index < 0 || index >= this.moves.length) {
      return []
    }
    const item = this.moves[index]
    return [...item.pv1, ...item.pv2]
  }

  /**
   * Gets all moves (mainline + PV) at the specified index with safety checks
   */
  getMovesAtIndex(index: number): Move[] {
    if (index < 0 || index >= this.moves.length) {
      return []
    }
    const item = this.moves[index]
    return [item.move, ...item.pv1, ...item.pv2]
  }

  // === Add/Update Operations ===

  /**
   * Adds a move to the move list with safety checks
   */
  addMove(move: Move, pv1: Move[] = [], pv2: Move[] = []): void {
    if (!move) {
      throw new Error('Cannot add null or undefined move')
    }
    this.moves.push(new MoveListItem(move, pv1, pv2))
  }

  /**
   * Adds a move list payload to the move list
   */
  handleWsMoveListPayload(payload: MoveListServerPayload) {
    for (const move of payload.moveList) {
      this.addMove(move)
    }
    
    // Apply move classifications to all moves after loading the complete list
    this.applyClassificationsToAllMoves()
  }

  /**
   * Applies move classifications to all moves in the list
   */
  applyClassificationsToAllMoves(): void {
    for (let i = 1; i < this.moves.length; i++) {
      const currentMove = this.getMoveAtIndex(i)
      const previousMove = this.getMoveAtIndex(i - 1)
      if (currentMove && previousMove) {
        const scoreDiff = calculateScoreDiff(currentMove, previousMove, i)
        const classification = classifyMove(scoreDiff, currentMove)
        const updatedMove = applyMoveClassification(currentMove, classification)
        
        // Update the move in the move list
        this.updateMainlineMove(i, updatedMove)
      }
    }
  }

  /**
   * Handles a node analysis update payload
   */
  handleWsNodeAnalysisUpdatePayload(payload: NodeAnalysisUpdatePayload): void {
    if (!payload.move || !payload.pvs) {
      throw new Error('Invalid node analysis update payload: missing move or pvs')
    }

    // Find the move in the move list
    const [moveIdx, pvIdx] = this.findAnyMoveIndexById(payload.move.id) || [-1, -1]
    
    if (moveIdx === -1) {
      // Move not found
      return
    }

    // Update the move with new analysis data
    this.updateMainlineMove(moveIdx, payload.move)

    // Apply move classification if we have a previous move
    if (moveIdx > 0) {
      const currentMove = this.getMoveAtIndex(moveIdx)
      const previousMove = this.getMoveAtIndex(moveIdx - 1)
      if (currentMove && previousMove) {
        const scoreDiff = calculateScoreDiff(currentMove, previousMove, moveIdx)
        const classification = classifyMove(scoreDiff, currentMove)
        const updatedMove = applyMoveClassification(currentMove, classification)
        
        // Update the move in the move list
        this.updateMainlineMove(moveIdx, updatedMove)
      }
    }

    // Handle PV moves if they exist
    if (payload.pvs && payload.pvs.length > 0) {
      // PVs for move N should be stored at move N+1
      // This is because PVs represent alternative moves for the position after move N
      const targetMoveIdx = moveIdx + 1
      // Only extend the move list if we have a valid move to add
      if (targetMoveIdx >= this.moves.length) {
        if (payload.pvs[0] && payload.pvs[0][0]) {
          // Add a new MoveListItem with the first PV move as the mainline move
          this.moves.push(new MoveListItem(payload.pvs[0][0]))
        } else {
          // No valid move to add, skip
          // Optionally, log a warning here
        }
      }
      // Handle the first PV line (pv1)
      if (payload.pvs[0] && payload.pvs[0].length > 0 && targetMoveIdx < this.moves.length) {
        this.setPv1(targetMoveIdx, payload.pvs[0])
      }
      // Handle the second PV line (pv2) if it exists
      if (payload.pvs[1] && payload.pvs[1].length > 0 && targetMoveIdx < this.moves.length) {
        this.setPv2(targetMoveIdx, payload.pvs[1])
      }
    }
  }

  /**
   * Updates a specific PV move at the given indices
   */
  updatePvMove(moveIdx: number, pvType: 'pv1' | 'pv2', pvIdx: number, move: Move): void {
    if (moveIdx < 0 || moveIdx >= this.moves.length) {
      throw new Error(`Invalid move index: ${moveIdx}`)
    }

    const item = this.moves[moveIdx]
    const pvArray = pvType === 'pv1' ? item.pv1 : item.pv2

    if (pvIdx < 0 || pvIdx >= pvArray.length) {
      throw new Error(`Invalid PV index: ${pvIdx} for ${pvType}`)
    }

    if (!move) {
      throw new Error('Cannot update with null or undefined move')
    }

    pvArray[pvIdx] = move
  }

  /**
   * Handles a node analysis update for a specific PV move
   */
  handleWsNodeAnalysisUpdatePayloadForPv(payload: NodeAnalysisUpdatePayload, pvType: 'pv1' | 'pv2', pvIdx: number): void {
    if (!payload.move || !payload.pvs) {
      throw new Error('Invalid node analysis update payload: missing move or pvs')
    }

    // Find the move in the move list
    const [moveIdx, _] = this.findAnyMoveIndexById(payload.move.id) || [-1, -1]
    
    if (moveIdx === -1) {
      // Move not found
      return
    }

    // Update the specific PV move
    this.updatePvMove(moveIdx, pvType, pvIdx, payload.move)

    // Handle PV moves if they exist (for the position after this PV move)
    if (payload.pvs && payload.pvs.length > 0) {
      // PVs for this PV move should be stored at the next position in the same PV line
      const nextPvIdx = pvIdx + 1
      
      // Handle the first PV line (pv1)
      if (payload.pvs[0] && payload.pvs[0].length > 0) {
        // Extend the PV array if necessary
        const currentPv = pvType === 'pv1' ? this.moves[moveIdx].pv1 : this.moves[moveIdx].pv2
        while (currentPv.length <= nextPvIdx) {
          currentPv.push({} as Move)
        }
        
        // Update the next move in the PV line
        if (payload.pvs[0][0]) {
          currentPv[nextPvIdx] = payload.pvs[0][0]
        }
      }

      // Handle the second PV line (pv2) if it exists
      if (payload.pvs[1] && payload.pvs[1].length > 0) {
        const otherPvType = pvType === 'pv1' ? 'pv2' : 'pv1'
        const otherPv = otherPvType === 'pv1' ? this.moves[moveIdx].pv1 : this.moves[moveIdx].pv2
        
        // Extend the other PV array if necessary
        while (otherPv.length <= nextPvIdx) {
          otherPv.push({} as Move)
        }
        
        // Update the next move in the other PV line
        if (payload.pvs[1][0]) {
          otherPv[nextPvIdx] = payload.pvs[1][0]
        }
      }
    }
  }

  /**
   * Sets PV1 moves for a specific index with safety checks
   */
  setPv1(index: number, pv1: Move[]): void {
    if (index < 0 || index >= this.moves.length) {
      throw new Error(`Invalid index: ${index}. Move list length: ${this.moves.length}`)
    }
    this.moves[index].pv1 = Array.isArray(pv1) ? [...pv1] : []
  }

  /**
   * Sets PV2 moves for a specific index with safety checks
   */
  setPv2(index: number, pv2: Move[]): void {
    if (index < 0 || index >= this.moves.length) {
      throw new Error(`Invalid index: ${index}. Move list length: ${this.moves.length}`)
    }
    this.moves[index].pv2 = Array.isArray(pv2) ? [...pv2] : []
  }

  /**
   * Updates the mainline move at the specified index with safety checks
   */
  updateMainlineMove(index: number, move: Move): void {
    if (index < 0 || index >= this.moves.length) {
      throw new Error(`Invalid index: ${index}. Move list length: ${this.moves.length}`)
    }
    if (!move) {
      throw new Error('Cannot update with null or undefined move')
    }
    this.moves[index].move = move
  }

  /**
   * Updates PV1 move at specific indices with safety checks
   */
  updatePv1Move(move: Move, mainlineIndex: number, previewIndex: number): void {
    if (mainlineIndex < 0 || mainlineIndex >= this.moves.length) {
      throw new Error(`Invalid mainline index: ${mainlineIndex}`)
    }
    if (previewIndex < 0 || previewIndex >= this.moves[mainlineIndex].pv1.length) {
      throw new Error(`Invalid preview index: ${previewIndex}`)
    }
    if (!move) {
      throw new Error('Cannot update with null or undefined move')
    }
    this.moves[mainlineIndex].pv1[previewIndex] = move
  }

  /**
   * Updates all moves at a specific index with safety checks
   */
  updateMovesAtIndex(index: number, moves: Move[]): void {
    if (index < 0) {
      throw new Error(`Invalid index: ${index}`)
    }
    if (!Array.isArray(moves)) {
      throw new Error('Moves must be an array')
    }

    // Extend the array if necessary
    while (this.moves.length <= index) {
      this.moves.push(new MoveListItem({} as Move))
    }

    if (moves.length > 0) {
      this.moves[index].move = moves[0]
      const pvMoves = moves.slice(1)
      const halfIndex = Math.ceil(pvMoves.length / 2)
      this.moves[index].pv1 = pvMoves.slice(0, halfIndex)
      this.moves[index].pv2 = pvMoves.slice(halfIndex)
    }
  }

  // === Navigation Operations ===

  /**
   * Checks if navigation is possible with safety checks
   */
  canGoTo(index: number, preview: boolean): boolean {
    if (index < 0) return false
    
    if (preview) {
      return index < this.moves.length && index < this.moves[index]?.pv1.length - 1
    } else {
      return index < this.moves.length - 1
    }
  }

  /**
   * Checks if next navigation is possible
   */
  canGoToNext(index: number, preview: boolean): boolean {
    return this.canGoTo(index + 1, preview)
  }

  /**
   * Checks if previous navigation is possible
   */
  canGoToPrevious(index: number): boolean {
    return index > -1 // -1 represents starting position
  }

  // === Search Operations ===

  /**
   * Finds move index by position with safety checks
   */
  findMoveIndexByPosition(position: string): number {
    if (!position) {
      return -1
    }
    return this.moves.findIndex(move => move.move.position === position)
  }

  /**
   * Finds move index by ID with safety checks
   */
  findMoveIndexById(id: number): number {
    return this.getMoveIdxById(id)
  }

  /**
   * Finds any move index by position with safety checks
   */
  findAnyMoveIndexByPosition(position: string): [number, number] | null {
    if (!position) {
      return null
    }

    for (let i = 0; i < this.moves.length; i++) {
      const item = this.moves[i]
      if (item.move?.position === position) {
        return [i, 0]
      }
      for (let j = 0; j < item.pv1.length; j++) {
        if (item.pv1[j]?.position === position) {
          return [i, j + 1]
        }
      }
      for (let j = 0; j < item.pv2.length; j++) {
        if (item.pv2[j]?.position === position) {
          return [i, j + item.pv1.length + 1]
        }
      }
    }
    return null
  }

  /**
   * Finds any move index by ID with safety checks
   */
  findAnyMoveIndexById(id: number): [number, number] | null {
    if (id === undefined || id === null) {
      return null
    }

    for (let i = 0; i < this.moves.length; i++) {
      const item = this.moves[i]
      if (item.move?.id === id) {
        return [i, 0]
      }
      for (let j = 0; j < item.pv1.length; j++) {
        if (item.pv1[j]?.id === id) {
          return [i, j + 1]
        }
      }
      for (let j = 0; j < item.pv2.length; j++) {
        if (item.pv2[j]?.id === id) {
          return [i, j + item.pv1.length + 1]
        }
      }
    }
    return null
  }

  // === Utility Operations ===

  /**
   * Gets the length of the move list
   */
  getLength(): number {
    return this.moves.length
  }

  /**
   * Checks if the move list is empty
   */
  isEmpty(): boolean {
    return this.moves.length === 0
  }

  /**
   * Gets the total number of mainline moves
   */
  getMainlineMoveCount(): number {
    return this.moves.filter(item => item.move).length
  }

  /**
   * Checks if a position has PV moves
   */
  hasPvMoves(positionIndex: number): boolean {
    return this.getPvMoves(positionIndex).length > 0
  }

  /**
   * Removes PV moves for a given position index
   */
  removePvMoves(positionIndex: number): void {
    if (positionIndex < 0 || positionIndex >= this.moves.length) {
      throw new Error(`Invalid position index: ${positionIndex}`)
    }
    this.moves[positionIndex].pv1 = []
    this.moves[positionIndex].pv2 = []
  }

  /**
   * Gets all mainline moves as a simple Move[] array
   */
  getMainlineMoves(): Move[] {
    return this.moves.map(item => item.move).filter(move => move !== undefined)
  }

  /**
   * Gets PVs in the legacy Record<number, Move[][]> format
   */
  getPvsAsRecord(): Record<number, Move[][]> {
    const pvs: Record<number, Move[][]> = {}
    
    this.moves.forEach((item, index) => {
      const pvMoves = [...item.pv1, ...item.pv2]
      if (pvMoves.length > 0) {
        pvs[index] = [pvMoves]
      }
    })
    
    return pvs
  }

  /**
   * Creates a deep copy of the move list
   */
  clone(): MoveList {
    const clonedMoves = this.moves.map(item => new MoveListItem(
      { ...item.move },
      [...item.pv1],
      [...item.pv2]
    ))
    return new MoveList(clonedMoves)
  }

  // === Component Helper Operations ===

  /**
   * Gets the current move position (FEN) safely
   */
  getCurrentPosition(index: number): string | null {
    const move = this.getMoveAtIndex(index)
    return move?.position || null
  }

  /**
   * Gets captures for a specific move safely
   */
  getCapturesForMove(index: number): {
    capturedByWhite: CaptureCount | undefined
    capturedByBlack: CaptureCount | undefined
  } {
    const move = this.getMoveAtIndex(index)
    return {
      capturedByWhite: move?.capturedByWhite,
      capturedByBlack: move?.capturedByBlack
    }
  }

  /**
   * Gets move annotation safely
   */
  getMoveAnnotation(index: number): string | undefined {
    const move = this.getMoveAtIndex(index)
    return move?.annotation
  }

  /**
   * Gets move evaluation safely
   */
  getMoveEvaluation(index: number): {
    score: any
    depth: number | undefined
  } | null {
    const move = this.getMoveAtIndex(index)
    if (!move) return null
    
    return {
      score: move.score,
      depth: move.depth
    }
  }

  /**
   * Gets position for any move index, including -1 for starting position
   */
  getPositionForIndex(index: number): string {
    if (index < 0) {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    }
    return this.getCurrentPosition(index) || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  }

  /**
   * Gets all PV moves at a specific position as Move[] arrays
   */
  getAllPvsAtPosition(positionIndex: number): Move[][] {
    const pvMoves = this.getPvMoves(positionIndex)
    return pvMoves.length > 0 ? [pvMoves] : []
  }

  /**
   * Gets the next available ID by finding the highest used ID and adding 1
   */
  getNextId(): number {
    let maxId = -1
    
    // Check mainline moves
    this.moves.forEach(item => {
      if (item.move && item.move.id > maxId) {
        maxId = item.move.id
      }
      // Check PV1 moves
      item.pv1.forEach(move => {
        if (move && move.id > maxId) {
          maxId = move.id
        }
      })
      // Check PV2 moves
      item.pv2.forEach(move => {
        if (move && move.id > maxId) {
          maxId = move.id
        }
      })
    })
    
    return maxId + 1
  }
}

// === Legacy Utility Functions (for backward compatibility) ===

/**
 * Creates an empty move list
 */
export function createMoveList(): MoveList {
  return new MoveList()
}

/**
 * Adds a mainline move to the move list
 */
export function addMainlineMove(moveList: MoveList, move: Move): MoveList {
  const newMoveList = moveList.clone()
  newMoveList.addMove(move)
  return newMoveList
}

/**
 * Gets the mainline move at the specified index
 */
export function getMainlineMove(moveList: MoveList, index: number | null): Move | null {
  return moveList.getMoveAtIndex(index || 0)
}

/**
 * Gets all moves (mainline + PV) at the specified index
 */
export function getMovesAtIndex(moveList: MoveList, index: number): Move[] {
  return moveList.getMovesAtIndex(index)
}

/**
 * Gets the PV moves for a given position index
 */
export function getPvMoves(moveList: MoveList, positionIndex: number): Move[] {
  return moveList.getPvMoves(positionIndex)
}

/**
 * Sets the PV moves for a given position index
 */
export function setPvMoves(moveList: MoveList, positionIndex: number, pvMoves: Move[]): MoveList {
  const newMoveList = moveList.clone()
  
  // PVs for move N should be stored at move N+1
  const targetMoveIdx = positionIndex + 1
  
  // Ensure the target move exists
  if (targetMoveIdx >= newMoveList.moves.length) {
    while (newMoveList.moves.length <= targetMoveIdx) {
      newMoveList.moves.push(new MoveListItem({} as Move))
    }
  }

  // Handle the first PV line (pv1)
  if (pvMoves.length > 0) {
    newMoveList.setPv1(targetMoveIdx, pvMoves)
  }
  
  return newMoveList
}

/**
 * Updates a mainline move at the specified index
 */
export function updateMainlineMove(moveList: MoveList, index: number, move: Move): MoveList {
  const newMoveList = moveList.clone()
  newMoveList.updateMainlineMove(index, move)
  return newMoveList
}

/**
 * Updates the entire move array at the specified index
 */
export function updateMovesAtIndex(moveList: MoveList, index: number, moves: Move[]): MoveList {
  const newMoveList = moveList.clone()
  newMoveList.updateMovesAtIndex(index, moves)
  return newMoveList
}

/**
 * Gets the total number of positions in the move list
 */
export function getMoveListLength(moveList: MoveList): number {
  return moveList.getLength()
}

/**
 * Checks if the move list is empty
 */
export function isMoveListEmpty(moveList: MoveList): boolean {
  return moveList.isEmpty()
}

/**
 * Converts the old Move[][] format to the new 2D structure
 */
export function convertLegacyMoveList(legacyMoves: Move[][]): MoveList {
  const moveList = new MoveList()
  legacyMoves.forEach(moveArray => {
    if (moveArray.length > 0) {
      const mainlineMove = moveArray[0]
      const pvMoves = moveArray.slice(1)
      const halfIndex = Math.ceil(pvMoves.length / 2)
      moveList.addMove(mainlineMove, pvMoves.slice(0, halfIndex), pvMoves.slice(halfIndex))
    }
  })
  return moveList
}

/**
 * Finds the index of a move by its position (FEN)
 */
export function findMoveIndexByPosition(moveList: MoveList, position: string): number {
  return moveList.findMoveIndexByPosition(position)
}

/**
 * Finds the index of a move by its ID
 */
export function findMoveIndexById(moveList: MoveList, id: number): number {
  return moveList.findMoveIndexById(id)
}

/**
 * Creates a copy of the move list
 */
export function cloneMoveList(moveList: MoveList): MoveList {
  return moveList.clone()
}

/**
 * Removes PV moves for a given position index
 */
export function removePvMoves(moveList: MoveList, positionIndex: number): MoveList {
  const newMoveList = moveList.clone()
  newMoveList.removePvMoves(positionIndex)
  return newMoveList
}

/**
 * Converts a Move[] to MoveList by wrapping each move in an array
 */
export function convertMoveArrayToMoveList(moves: Move[]): MoveList {
  const moveList = new MoveList()
  moves.forEach(move => moveList.addMove(move))
  return moveList
}

/**
 * Converts a Record<number, Move[][]> PV structure to the new MoveList format
 */
export function integratePvsIntoMoveList(moveList: MoveList, pvs: Record<number, Move[][]>): MoveList {
  let result = moveList.clone()
  Object.entries(pvs).forEach(([indexStr, pvMoves]) => {
    const index = parseInt(indexStr)
    if (pvMoves && pvMoves.length > 0) {
      // PVs for move N should be stored at move N+1
      const targetMoveIdx = index + 1
      // Only extend the move list if we have a valid move to add
      if (targetMoveIdx >= result.moves.length) {
        if (pvMoves[0] && pvMoves[0][0]) {
          result.moves.push(new MoveListItem(pvMoves[0][0]))
        } else {
          // No valid move to add, skip
          // Optionally, log a warning here
        }
      }
      // Handle the first PV line (pv1)
      if (pvMoves[0] && pvMoves[0].length > 0 && targetMoveIdx < result.moves.length) {
        result.setPv1(targetMoveIdx, pvMoves[0])
      }
      // Handle the second PV line (pv2) if it exists
      if (pvMoves[1] && pvMoves[1].length > 0 && targetMoveIdx < result.moves.length) {
        result.setPv2(targetMoveIdx, pvMoves[1])
      }
    }
  })
  return result
}

/**
 * Gets all mainline moves as a simple Move[] array
 */
export function getMainlineMoves(moveList: MoveList): Move[] {
  return moveList.getMainlineMoves()
}

/**
 * Gets PVs in the legacy Record<number, Move[][]> format
 */
export function getPvsAsRecord(moveList: MoveList): Record<number, Move[][]> {
  return moveList.getPvsAsRecord()
}

// === Elegant Component Helper Functions ===

/**
 * Gets the current move position (FEN) safely
 */
export function getCurrentPosition(moveList: MoveList, index: number): string | null {
  return moveList.getCurrentPosition(index)
}

/**
 * Gets captures for a specific move safely
 */
export function getCapturesForMove(moveList: MoveList, index: number): {
  capturedByWhite: CaptureCount | undefined
  capturedByBlack: CaptureCount | undefined
} {
  return moveList.getCapturesForMove(index)
}

/**
 * Gets move annotation safely
 */
export function getMoveAnnotation(moveList: MoveList, index: number): string | undefined {
  return moveList.getMoveAnnotation(index)
}

/**
 * Gets move evaluation safely
 */
export function getMoveEvaluation(moveList: MoveList, index: number): {
  score: any
  depth: number | undefined
} | null {
  return moveList.getMoveEvaluation(index)
}

/**
 * Checks if a position has PV moves
 */
export function hasPvMoves(moveList: MoveList, positionIndex: number): boolean {
  return moveList.hasPvMoves(positionIndex)
}

/**
 * Gets the total number of mainline moves (ignoring PVs)
 */
export function getMainlineMoveCount(moveList: MoveList): number {
  return moveList.getMainlineMoveCount()
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
  return moveList.getPositionForIndex(index)
}

/**
 * Navigation helpers
 */
export function canGoToNext(moveList: MoveList, currentIndex: number): boolean {
  return currentIndex < moveList.getMainlineMoveCount();
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
  return moveList.getAllPvsAtPosition(positionIndex)
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
  return moveList.findAnyMoveIndexByPosition(position)
}

/**
 * Finds the index [i, j] of any move (mainline or PV) by its ID
 */
export function findAnyMoveIndexById(moveList: MoveList, id: number): [number, number] | null {
  return moveList.findAnyMoveIndexById(id)
}

/**
 * Gets the next available ID across both mainline and preview move lists
 */
export function getNextAvailableId(mainlineMoves: MoveList, previewMoves: MoveList): number {
  const mainlineNextId = mainlineMoves.getNextId()
  const previewNextId = previewMoves.getNextId()
  
  return Math.max(mainlineNextId, previewNextId)
}
