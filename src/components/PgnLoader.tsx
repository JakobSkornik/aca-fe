import React, { useState } from 'react'
import { Chess } from 'chess.js'
import { useGameState } from '../contexts/GameStateContext'
import { AnalysisResult } from '../types/AnalysisResult'

const PgnLoader = () => {
  const { setGameState } = useGameState()
  const [tempPgn, setTempPgn] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const staticPgns = [
    { label: '2759 elo', file: '/data/2759.pgn' },
    { label: '2000 elo', file: '/data/2759.pgn' },
    { label: 'Test', file: '/data/short.pgn' },
  ]

  // File upload: load PGN/JSON file and set its contents in the textarea.
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        setTempPgn(content)
      }
      reader.readAsText(file)
    }
  }

  // Update the textarea with string input.
  const handleStringUpload = (input: string) => {
    setTempPgn(input)
  }

  // Dropdown selection: fetch file from public path.
  const handleDropdownSelection = async (filePath: string) => {
    try {
      const response = await fetch(filePath)
      if (!response.ok) {
        throw new Error(`Failed to load PGN from ${filePath}`)
      }
      const content = await response.text()
      setTempPgn(content)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // Load the game by sending the PGN string to the analyze endpoint.
  const loadGame = async () => {
    try {
      setError('')
      setLoading(true)

      // Send the PGN string to your analyze endpoint.
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pgn: tempPgn }),
      })

      if (!response.ok) {
        throw new Error(
          `Analyze API returned ${response.status}: ${await response.text()}`
        )
      }

      const analysisResult = (await response.json()) as AnalysisResult

      // Create a new chess game
      const chessGame = new Chess()

      // Reconstruct the game directly from the analysis moves
      analysisResult.moves.forEach((moveData) => {
        if (moveData.move) {
          try {
            // Try to make the move from the analysis
            chessGame.move(moveData.move)
          } catch (moveErr) {
            console.error(`Failed to apply move: ${moveData.move}`, moveErr)

            // If standard notation fails, try UCI format
            try {
              const from = moveData.move.substring(0, 2)
              const to = moveData.move.substring(2, 4)
              const promotion =
                moveData.move.length > 4 ? moveData.move[4] : undefined

              chessGame.move({ from, to, promotion })
            } catch (uciErr) {
              console.error(
                `Failed to apply UCI move: ${moveData.move}`,
                uciErr
              )
            }
          }
        }
      })

      if (analysisResult.metadata) {
        chessGame.header(
          'White',
          analysisResult.metadata.white_name || '',
          'Black',
          analysisResult.metadata.black_name || '',
          'WhiteElo',
          analysisResult.metadata.white_elo?.toString() || '',
          'BlackElo',
          analysisResult.metadata.black_elo?.toString() || '',
          'Event',
          analysisResult.metadata.event || '',
          'Opening',
          analysisResult.metadata.opening || '',
          'Result',
          analysisResult.metadata.result || ''
        )
      }

      // Update game state with the enriched analysis
      setGameState({
        isLoaded: true,
        game: chessGame,
        moveTree: analysisResult.move_tree,
        moves: analysisResult.moves,
        currentMoveIndex: 0,
      })

      console.log('Game loaded with analysis:', {
        moveCount: analysisResult.moves.length,
        nodeCount: Object.keys(analysisResult.move_tree || {}).length,
      })
    } catch (err) {
      console.error('Error loading game:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-[400px]">
      <h2 className="text-xl font-semibold mb-4">Load PGN / Analysis</h2>

      {/* Dropdown for static PGN files */}
      <select
        onChange={(e) => handleDropdownSelection(e.target.value)}
        className="block w-full text-sm border border-gray-300 rounded-md p-2 mb-4"
      >
        <option value="">Select a PGN file</option>
        {staticPgns.map((pgn) => (
          <option key={pgn.file} value={pgn.file}>
            {pgn.label}
          </option>
        ))}
      </select>

      {/* File Upload */}
      <input
        type="file"
        accept=".json,.pgn"
        onChange={handleFileUpload}
        className="block w-full text-sm border border-gray-300 rounded-md p-2 mb-4"
      />

      {/* Textarea for PGN/JSON input */}
      <textarea
        rows={8}
        placeholder="Paste your PGN or JSON here..."
        value={tempPgn}
        className="block w-full text-sm border border-gray-300 rounded-md p-2 mb-4"
        onChange={(e) => handleStringUpload(e.target.value)}
      />

      <button
        disabled={loading || !tempPgn.trim()}
        onClick={loadGame}
        className={`bg-gray-500 text-white py-2 px-4 rounded-md ${
          loading || !tempPgn.trim() ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 mr-3 text-white"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
            Processing...
          </div>
        ) : (
          'Load PGN / Analysis'
        )}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  )
}

export default PgnLoader
