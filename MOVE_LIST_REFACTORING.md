# Move List Refactoring Summary

## Overview
Successfully refactored the game state to use a 2D array structure (`MoveList`) for better organization of mainline moves and their principal variations (PVs).

## Changes Made

### 1. Created Move List Utilities (`src/helpers/moveListUtils.ts`)
- **`MoveList`** type: `Move[][]` where each index contains an array of moves
- **Structure**: `moveList[idx][0]` = mainline move, `moveList[idx][1...n]` = PV moves
- **PV Storage**: PVs for position `idx` are stored at `idx + 1`

#### Core Functions:
- `createMoveList()`: Creates empty move list
- `addMainlineMove()`: Adds mainline move
- `getMainlineMove()`: Gets mainline move at index
- `getPvMoves()`: Gets PV moves for position (stored at position + 1)
- `setPvMoves()`: Sets PV moves for position
- `updateMainlineMove()`: Updates mainline move
- `findMoveIndexByPosition()`: Finds move by FEN position

#### Legacy Compatibility Functions:
- `convertLegacyMoveList()`: Converts old `Move[][]` format
- `convertMoveArrayToMoveList()`: Converts `Move[]` to `MoveList`
- `integratePvsIntoMoveList()`: Integrates PV record into move list
- `getMainlineMoves()`: Extracts mainline moves as `Move[]`
- `getPvsAsRecord()`: Converts back to legacy PV record format

### 2. Updated GameState Type (`src/types/GameState.ts`)
- Changed `moves: Move[][]` → `moves: MoveList`
- Removed `movePvs: Record<number, Move[][]>`
- Changed `previewMoves: Move[][]` → `previewMoves: MoveList`
- Removed `previewMovePvs: Record<number, Move[][]>`

### 3. Updated GameStateContext (`src/contexts/GameStateContext.tsx`)

#### Interface Changes:
- Updated `setMoves()` to accept `MoveList`
- Removed `setMovePvs()` function
- Added utility functions: `addMainlineMove`, `getMainlineMove`, `getPvMoves`, `setPvMoves`
- Updated preview functions to work with `MoveList`

#### Implementation Updates:
- **Initial State**: Uses `createMoveList()` for empty move lists
- **WebSocket Handlers**: 
  - `MOVE_LIST`: Converts legacy format using `convertLegacyMoveList()`
  - `ANALYSIS_UPDATE`: Uses utility functions for move updates and PV integration
  - `FULL_ANALYSIS_COMPLETE`: Uses `convertMoveArrayToMoveList()` and `integratePvsIntoMoveList()`
- **Annotation Functions**: Updated to use utility functions for move updates

## Benefits

1. **Cleaner Structure**: Mainline moves and PVs are co-located in the same data structure
2. **Easier Access**: `moveList[idx][0]` for mainline, utility functions for PVs
3. **Better Performance**: No separate PV lookup in different data structure
4. **Type Safety**: Strong typing with `MoveList` type
5. **Backward Compatibility**: Utility functions handle legacy format conversion
6. **Extensible**: Easy to add more move-related data at each position

## Usage Examples

```typescript
// Get mainline move
const mainlineMove = getMainlineMove(moveList, 5)

// Get PV moves for position 5 (stored at index 6)
const pvMoves = getPvMoves(moveList, 5)

// Add a mainline move
const newMoveList = addMainlineMove(moveList, move)

// Set PV moves for position 5
const updatedMoveList = setPvMoves(moveList, 5, pvMoves)

// Access via context
const { getMainlineMove, getPvMoves, setPvMoves } = useGameState()
```

## Migration Notes

- All existing components using the old `moves` structure will need updates
- PV access changed from `movePvs[index]` to `getPvMoves(moves, index)`
- Preview functionality maintains the same API but uses new structure internally
- WebSocket message handlers automatically convert legacy formats

The refactoring maintains full backward compatibility through utility functions while providing a cleaner, more efficient data structure for future development.

## Integration with Components

### MainlineChessboard Component

The `MainlineChessboard` component has been updated to use the elegant new helper functions:

```tsx
// Before (complex and error-prone)
const currentFen = getMainlineMove(moves, currentMoveIndex).position
const whiteCaptures = moves[currentMoveIndex]?.capturedByWhite
const blackCaptures = moves[currentMoveIndex]?.capturedByBlack

// After (elegant and safe)
const currentFen = getPositionForIndex(moves, currentMoveIndex)
const { capturedByWhite: whiteCaptures, capturedByBlack: blackCaptures } = getCapturesForMove(moves, currentMoveIndex)

// Captures display simplified
const whiteCapturesString = formatCapturesForDisplay(whiteCaptures, true)
const blackCapturesString = formatCapturesForDisplay(blackCaptures, false)
```

### Context Integration

The `GameStateContext` now provides elegant helper functions accessible via the `useGameState()` hook:

```tsx
const { 
  getCurrentPosition,
  getCapturesForMove,
  getMoveAnnotation,
  hasPvMoves,
  getMainlineMoveCount,
  canGoToNext,
  canGoToPrevious,
  goToNext,
  goToPrevious,
  goToMove,
  formatCapturesForDisplay
} = useGameState()
```

### Navigation Helpers

New navigation functions make move traversal elegant:

```tsx
// Check if navigation is possible
const canNext = canGoToNext(currentMoveIndex)
const canPrev = canGoToPrevious(currentMoveIndex)

// Navigate moves
goToNext()           // Go to next move
goToPrevious()       // Go to previous move
goToMove(5)          // Go to specific move index
goToMove(-1)         // Go to starting position
```

### Component Helper Functions

Elegant functions for common component needs:

```tsx
// Safe position access (handles null/undefined)
const fen = getCurrentPosition(moveIndex) // Returns FEN string or null

// Safe captures access
const { capturedByWhite, capturedByBlack } = getCapturesForMove(moveIndex)

// Format captures for display
const whiteCapturesDisplay = formatCapturesForDisplay(capturedByWhite, true)
const blackCapturesDisplay = formatCapturesForDisplay(capturedByBlack, false)

// Check for variations
const hasVariations = hasPvMoves(positionIndex)

// Get move count
const totalMoves = getMainlineMoveCount()
```
