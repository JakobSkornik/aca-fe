import { Chess, Square, Piece, Move as ChessMove } from 'chess.js'
import { Move } from '@/types/chess/Move'

export class ChessPositionManager {
  private chess: Chess
  private currentPosition: string = 'start'

  constructor() {
    this.chess = new Chess()
  }

  /**
   * Get the current chess.js instance
   */
  getChessInstance(): Chess {
    return this.chess
  }

  /**
   * Get the current FEN position
   */
  getCurrentFen(): string {
    return this.chess.fen()
  }

  /**
   * Check if the current position is in check
   */
  isInCheck(): boolean {
    return this.chess.inCheck()
  }

  /**
   * Check if the current position is checkmate
   */
  isCheckmate(): boolean {
    return this.chess.isCheckmate()
  }

  /**
   * Check if the current position is a draw
   */
  isDraw(): boolean {
    return this.chess.isDraw()
  }

  /**
   * Check if the current position is a stalemate
   */
  isStalemate(): boolean {
    return this.chess.isStalemate()
  }

  /**
   * Get castling rights for the current position
   */
  getCastlingRights(): {
    w: { k: boolean; q: boolean }
    b: { k: boolean; q: boolean }
  } {
    // Access castling rights through the internal board state
    const fen = this.chess.fen()
    const parts = fen.split(' ')
    const castling = parts[2]
    
    return {
      w: { k: castling.includes('K'), q: castling.includes('Q') },
      b: { k: castling.includes('k'), q: castling.includes('q') }
    }
  }

  /**
   * Get the current turn (w or b)
   */
  getTurn(): 'w' | 'b' {
    return this.chess.turn()
  }

  /**
   * Get legal moves for the current position
   */
  getLegalMoves(): ChessMove[] {
    return this.chess.moves({ verbose: true })
  }

  /**
   * Get the current game phase (opening, middlegame, endgame)
   */
  getGamePhase(): 'opening' | 'middlegame' | 'endgame' {
    const pieceCount = this.chess.board().flat().filter(p => p !== null).length
    
    if (pieceCount > 20) return 'opening'
    if (pieceCount > 12) return 'middlegame'
    return 'endgame'
  }

  /**
   * Get the number of moves made
   */
  getMoveCount(): number {
    return this.chess.history().length
  }

  /**
   * Get the current move number (1-based)
   */
  getMoveNumber(): number {
    return Math.floor(this.getMoveCount() / 2) + 1
  }

  /**
   * Check if it's white's turn
   */
  isWhiteTurn(): boolean {
    return this.getTurn() === 'w'
  }

  /**
   * Check if it's black's turn
   */
  isBlackTurn(): boolean {
    return this.getTurn() === 'b'
  }

  /**
   * Get the last move made
   */
  getLastMove(): ChessMove | null {
    const history = this.chess.history({ verbose: true })
    return history.length > 0 ? history[history.length - 1] : null
  }

  /**
   * Get the piece at a specific square
   */
  getPieceAt(square: string): Piece | null {
    const piece = this.chess.get(square as Square)
    return piece || null
  }

  /**
   * Check if a square is under attack
   */
  isSquareUnderAttack(square: string, color: 'w' | 'b'): boolean {
    return this.chess.isAttacked(square as Square, color)
  }

  /**
   * Get all squares that are under attack by a specific color
   */
  getAttackedSquares(color: 'w' | 'b'): string[] {
    const squares: string[] = []
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = String.fromCharCode(97 + j) + (8 - i) as Square
        if (this.chess.isAttacked(square, color)) {
          squares.push(square)
        }
      }
    }
    return squares
  }

  /**
   * Update the chess position based on a move
   */
  updatePosition(move: Move): void {
    if (move.position && move.position !== this.currentPosition) {
      this.chess.load(move.position)
      this.currentPosition = move.position
    }
  }

  /**
   * Update the chess position based on a FEN string
   */
  updatePositionFromFen(fen: string): void {
    if (fen !== this.currentPosition) {
      this.chess.load(fen)
      this.currentPosition = fen
    }
  }

  /**
   * Reset to the starting position
   */
  resetToStart(): void {
    this.chess.reset()
    this.currentPosition = 'start'
  }

  /**
   * Get the current board state as a 2D array
   */
  getBoard(): (Piece | null)[][] {
    return this.chess.board()
  }

  /**
   * Get the current position's evaluation context for commenting
   */
  getPositionContext(): {
    isInCheck: boolean
    isCheckmate: boolean
    isDraw: boolean
    isStalemate: boolean
    gamePhase: 'opening' | 'middlegame' | 'endgame'
    turn: 'w' | 'b'
    moveNumber: number
    castlingRights: {
      w: { k: boolean; q: boolean }
      b: { k: boolean; q: boolean }
    }
    lastMove: ChessMove | null
  } {
    return {
      isInCheck: this.isInCheck(),
      isCheckmate: this.isCheckmate(),
      isDraw: this.isDraw(),
      isStalemate: this.isStalemate(),
      gamePhase: this.getGamePhase(),
      turn: this.getTurn(),
      moveNumber: this.getMoveNumber(),
      castlingRights: this.getCastlingRights(),
      lastMove: this.getLastMove()
    }
  }
}

// Create a singleton instance
export const chessPositionManager = new ChessPositionManager() 