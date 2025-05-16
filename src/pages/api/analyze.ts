import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { AnalysisResult } from '@/types/AnalysisResult'

type ErrorResponse = {
  error: string
  details?: unknown
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalysisResult | ErrorResponse>
) {
  if (req.method === 'POST') {
    const API_URL = process.env.API_URL || 'http://localhost:8000'
    const { pgn } = req.body

    if (!pgn) {
      return res.status(400).json({ error: 'PGN is required.' })
    }

    try {
      // Call the Python API
      const pythonApiResponse = await axios.post(
        `${API_URL}/evaluator`,
        { pgn },
        {
          timeout: 300000, // 5 minute timeout as analysis can take time
          headers: { 'Content-Type': 'application/json' },
        }
      )

      // Check if the response has the expected structure
      const data = pythonApiResponse.data

      if (!data.moves || !data.move_tree) {
        console.error('Unexpected API response format:', data)
        return res.status(500).json({
          error: 'Invalid response from analysis API',
          details: 'Response missing moves or move_tree',
        })
      }

      // Return the complete analysis result
      res.status(200).json({
        metadata: data.metadata,
        moves: data.moves,
        move_tree: data.move_tree,
      })
    } catch (error) {
      console.error('Error calling Python API:', error)

      // Provide more detailed error information
      const errorMessage = axios.isAxiosError(error)
        ? `API error: ${error.response?.status || 'unknown'} - ${
            error.response?.data?.detail || error.message
          }`
        : `Unexpected error: ${(error as Error).message}`

      res.status(500).json({
        error: 'Failed to process PGN via Python API.',
        details: errorMessage,
      })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
