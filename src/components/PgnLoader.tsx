import React, { useState } from 'react'
import { Chess } from 'chess.js'
import { useGameState } from '../contexts/GameStateContext'

const PgnLoader = () => {
  const { setGameState } = useGameState()
  const [tempPgn, setTempPgn] = useState<string>('')
  const [error, setError] = useState<string>('')

  const staticPgns = [
    { label: 'Grandmaster (2000+)', file: '/data/anotated.pgn' },
  ]

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

  const handleStringUpload = (input: string) => {
    setTempPgn(input)
  }

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

  const parseComment = (comment: string) => {
    const annotation = comment
      .split('|')[0]
      .replace('Comment: ', '')
      .replace('{', '')
      .replace('}', '')
    const scoreMatch = comment.match(/Score:\s*([0-9.]+)/)
    const bestContinuationsMatch = comment.match(
      /Best Continuations:\s*\[(.*?)\]/
    )

    return {
      annotation: annotation,
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      bestContinuations: bestContinuationsMatch
        ? bestContinuationsMatch[1].split(', ')
        : [],
    }
  }

  const loadGame = () => {
    try {
      const game = new Chess()
      game.loadPgn(tempPgn)

      const comments = game.getComments()
      const commentMap = new Map(
        comments.map(({ fen, comment }) => [fen, comment])
      )

      const capturedByWhite = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }
      const capturedByBlack = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }

      const moves = game.history({ verbose: true }).map((move) => {
        const fen = move.after
        const san = move.san
        const comment = commentMap.get(fen) || ''

        // Parse the comment for score, diff, and best continuations
        const { annotation, score, bestContinuations } = parseComment(comment)

        // Update captured pieces
        if (move.captured) {
          if (move.color === 'w') {
            capturedByBlack[move.captured] =
              (capturedByBlack[move.captured] || 0) + 1
          } else {
            capturedByWhite[move.captured] =
              (capturedByWhite[move.captured] || 0) + 1
          }
        }

        return {
          position: fen,
          move: san,
          comment: annotation,
          score,
          bestContinuations,
          capturedByWhite: { ...capturedByWhite },
          capturedByBlack: { ...capturedByBlack },
        }
      })

      const startingPosition = {
        position: 'start',
        move: '',
        comment: '',
        score: 0.5,
        bestContinuations: [],
        capturedByWhite: {},
        capturedByBlack: {},
      }

      setGameState({
        isLoaded: true,
        isAnnotated: true, // Set isAnnotated to true
        game: game,
        moves: [startingPosition, ...moves],
        currentMoveIndex: 0,
      })
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="w-[400px]">
      <h2 className="text-xl font-semibold mb-4">Load PGN</h2>
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
      <input
        type="file"
        accept=".pgn"
        onChange={handleFileUpload}
        className="block w-full text-sm border border-gray-300 rounded-md p-2 mb-4"
      />
      <textarea
        rows={8}
        placeholder="Paste PGN here"
        value={tempPgn}
        className="block w-full text-sm border border-gray-300 rounded-md p-2 mb-4"
        onChange={(e) => handleStringUpload(e.target.value)}
      />
      <button
        className="bg-gray-500 text-white py-2 px-4 rounded-md"
        onClick={loadGame}
      >
        Load PGN
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  )
}

export default PgnLoader
