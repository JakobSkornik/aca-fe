import Image from 'next/image'
import React, { useRef, useState } from 'react'

import Dropdown from './ui/Dropdown'
import { UIHelpers } from '@/helpers/uiHelpers'
import { useGameState } from '@/contexts/GameStateContext'

const PgnLoader = () => {
  const { manager } = useGameState()
  const [tempPgn, setTempPgn] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [processingInfo, setProcessingInfo] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const staticPgns = [
    { value: '/data/example1.pgn', label: 'Example 1' },
    { value: '/data/2759.pgn', label: '2759 elo' },
    { value: '/data/2000.pgn', label: '2000 elo' },
    { value: '/data/short.pgn', label: 'Test' },
  ]

  // Enhanced PGN processing function
  const processPgnText = (rawText: string): { processed: string; info: string } => {
    let processed = rawText
    const processingSteps: string[] = []

    // 1. Normalize line endings
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // 2. Remove BOM (Byte Order Mark) if present
    if (processed.charCodeAt(0) === 0xFEFF) {
      processed = processed.slice(1)
      processingSteps.push('Removed BOM')
    }

    // 3. Trim excessive whitespace but preserve PGN structure
    processed = processed.trim()

    // 4. Fix common encoding issues
    const encodingFixes = [
      { pattern: /â€"/g, replacement: '–' }, // En dash
      { pattern: /â€™/g, replacement: "'" }, // Right single quotation mark
      { pattern: /â€œ/g, replacement: '"' }, // Left double quotation mark
      { pattern: /â€\x9D/g, replacement: '"' }, // Right double quotation mark
      { pattern: /Ã¡/g, replacement: 'á' },
      { pattern: /Ã©/g, replacement: 'é' },
      { pattern: /Ã­/g, replacement: 'í' },
      { pattern: /Ã³/g, replacement: 'ó' },
      { pattern: /Ãº/g, replacement: 'ú' },
    ]

    encodingFixes.forEach(fix => {
      if (fix.pattern.test(processed)) {
        processed = processed.replace(fix.pattern, fix.replacement)
        processingSteps.push('Fixed encoding issues')
      }
    })

    // 5. Standardize move notation
    // Fix inconsistent castling notation
    processed = processed.replace(/0-0-0/g, 'O-O-O')
    processed = processed.replace(/0-0/g, 'O-O')
    
    // Fix piece notation inconsistencies
    processed = processed.replace(/♔/g, 'K').replace(/♕/g, 'Q').replace(/♖/g, 'R')
                      .replace(/♗/g, 'B').replace(/♘/g, 'N').replace(/♙/g, '')
                      .replace(/♚/g, 'K').replace(/♛/g, 'Q').replace(/♜/g, 'R')
                      .replace(/♝/g, 'B').replace(/♞/g, 'N').replace(/♟/g, '')

    // 6. Handle different result notations
    const resultVariations = [
      { pattern: /1\s*-\s*0/g, replacement: '1-0' },
      { pattern: /0\s*-\s*1/g, replacement: '0-1' },
      { pattern: /1\/2\s*-\s*1\/2/g, replacement: '1/2-1/2' },
      { pattern: /½\s*-\s*½/g, replacement: '1/2-1/2' },
      { pattern: /draw/gi, replacement: '1/2-1/2' },
      { pattern: /white\s+wins?/gi, replacement: '1-0' },
      { pattern: /black\s+wins?/gi, replacement: '0-1' },
    ]

    resultVariations.forEach(variation => {
      if (variation.pattern.test(processed)) {
        processed = processed.replace(variation.pattern, variation.replacement)
        processingSteps.push('Standardized result notation')
      }
    })

    // 7. Clean up move numbering inconsistencies
    // Fix move numbers with inconsistent spacing
    processed = processed.replace(/(\d+)\.+\s*/g, '$1. ')
    processed = processed.replace(/(\d+)\s*\.\s*\.\s*\./g, '$1...')

    // 8. Handle multiple games in one file
    const gameCount = (processed.match(/\[Event\s+/g) || []).length
    if (gameCount > 1) {
      processingSteps.push(`Detected ${gameCount} games - using first game`)
      // Extract first game only
      const firstGameEnd = processed.indexOf('\n\n[Event', processed.indexOf('[Event') + 1)
      if (firstGameEnd > 0) {
        processed = processed.substring(0, firstGameEnd)
      }
    }

    // 9. Remove excessive blank lines but preserve structure
    processed = processed.replace(/\n{3,}/g, '\n\n')

    // 10. Validate and fix header format
    const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g
    const headerMatches = [...processed.matchAll(headerRegex)]
    if (headerMatches.length > 0) {
      processingSteps.push(`Found ${headerMatches.length} headers`)
    }

    // 11. Try to detect file format
    let detectedFormat = 'Unknown'
    if (processed.includes('[Event')) {
      detectedFormat = 'PGN'
    } else if (processed.includes('"moves"') || processed.includes('"pvs"')) {
      detectedFormat = 'JSON Analysis'
    } else if (/^[1-9]\.\s*[a-h][1-8]/.test(processed.trim())) {
      detectedFormat = 'Move list only'
      // Wrap in minimal PGN structure
      processed = `[Event "Game"]\n[Result "*"]\n\n${processed}`
      processingSteps.push('Added minimal PGN headers')
    }

    const info = `Detected: ${detectedFormat}${processingSteps.length > 0 ? ` | Applied: ${processingSteps.join(', ')}` : ''}`
    
    return { processed, info }
  }

  // Enhanced file upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        const { processed, info } = processPgnText(content)
        setTempPgn(processed)
        setProcessingInfo(info)
        setError('')
      }
      reader.readAsText(file, 'UTF-8') // Explicitly specify UTF-8 encoding
    }
  }

  // Enhanced string upload handler
  const handleStringUpload = (input: string) => {
    const { processed, info } = processPgnText(input)
    setTempPgn(processed)
    setProcessingInfo(info)
    if (error) setError('') // Clear previous errors
  }

  // Enhanced dropdown handler
  const handleDropdownSelection = async (filePath: string) => {
    try {
      setError('')
      setProcessingInfo('Loading...')
      const response = await fetch(filePath)
      if (!response.ok) {
        throw new Error(`Failed to load PGN from ${filePath}`)
      }
      const content = await response.text()
      const { processed, info } = processPgnText(content)
      setTempPgn(processed)
      setProcessingInfo(info)
    } catch (err) {
      setError((err as Error).message)
      setProcessingInfo('')
    }
  }

  // Enhanced validation before submission
  const validatePgn = (pgn: string): { isValid: boolean; issues: string[] } => {
    const issues: string[] = []
    
    // Check for basic PGN structure
    if (!pgn.includes('[Event') && !pgn.includes('"moves"')) {
      issues.push('No valid PGN headers or JSON structure detected')
    }
    
    // Check for moves
    const movePattern = /\d+\.\s*[a-zA-Z][a-zA-Z0-9\-\+\#\=]*(\s+[a-zA-Z][a-zA-Z0-9\-\+\#\=]*)?/
    if (!movePattern.test(pgn) && !pgn.includes('"moves"')) {
      issues.push('No valid moves detected')
    }
    
    // Check file size (reasonable limit)
    if (pgn.length > 100000) { // 100KB
      issues.push('File is very large - consider using a smaller PGN')
    }
    
    return { isValid: issues.length === 0, issues }
  }

  const submitPgn = async () => {
    try {
      setError('')
      setLoading(true)

      // Validate before sending
      const validation = validatePgn(tempPgn)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.issues.join(', ')}`)
      }

      const response = await fetch('/api/submit_pgn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tempPgn }),
      })

      if (!response.ok) {
        throw new Error(
          `Analyze API returned ${response.status}: ${await response.text()}`
        )
      }
      const data = await response.json()
      if (data.session_id) {
        manager.connectToSession(data.session_id)
      }
    } catch (err) {
      console.error('Error loading game:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-[400px] bg-lightest-gray p-4 rounded shadow-md">
      <h2 className="text-xl font-semibold mb-4">Load PGN / Analysis</h2>

      {/* Custom Dropdown */}
      <div className="mb-4">
        <Dropdown
          options={[{ value: '', label: 'Select a PGN file' }, ...staticPgns]}
          onChange={handleDropdownSelection}
          placeholder="Select a PGN file"
        />
      </div>

      {/* File Upload */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.pgn"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={handleCustomButtonClick}
          className={`${UIHelpers.getButtonClasses()} w-full flex justify-between`}
        >
          <span>Upload PGN/JSON File</span>
          <Image src="/icons/upload.svg" alt="Upload" width={20} height={20} priority />
        </button>
      </div>

      {/* Processing info display */}
      {processingInfo && (
        <div className="mb-3 p-2 bg-dark-gray border rounded text-sm">
          {processingInfo}
        </div>
      )}

      {/* Textarea for PGN/JSON input */}
      <textarea
        rows={8}
        placeholder="Paste your PGN or JSON here..."
        value={tempPgn}
        className="block w-full text-sm border border-gray-300 rounded-md p-2 mb-4 font-mono"
        onChange={(e) => handleStringUpload(e.target.value)}
      />

      <button
        disabled={loading || !tempPgn.trim()}
        onClick={submitPgn}
        className={UIHelpers.getPrimaryButtonClasses(loading || !tempPgn.trim())}
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
