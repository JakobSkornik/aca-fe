import Image from 'next/image'
import React, { useRef, useState } from 'react'
import { useGameState } from '../contexts/GameStateContext'
import Dropdown from './ui/Dropdown'

const PgnLoader = () => {
  const { connectToAnalysisSession } = useGameState()
  const [tempPgn, setTempPgn] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const staticPgns = [
    { value: '/data/example1.pgn', label: 'Example 1' },
    { value: '/data/2759.pgn', label: '2759 elo' },
    { value: '/data/2000.pgn', label: '2000 elo' },
    { value: '/data/short.pgn', label: 'Test' },
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

  const submitPgn = async () => {
    try {
      setError('')
      setLoading(true)

      // Send the PGN string to your analyze endpoint.
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
        connectToAnalysisSession(data.session_id)
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
    <div className="w-[400px]">
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
          className="hidden" // Hide the native input
        />
        <button
          onClick={handleCustomButtonClick}
          className="flex items-center gap-2 bg-lightest-gray text-lightest-gray px-4 py-2 rounded-md hvr-shadow w-full"
        >
          <Image src="/icons/upload.svg" alt="Upload" width={20} height={20} />
          <span>Upload PGN/JSON File</span>
        </button>
      </div>

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
        onClick={submitPgn}
        className={`bg-darkest-gray text-white py-2 px-4 rounded-md ${
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
