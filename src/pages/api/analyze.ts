import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { pgn, config = {} } = req.body

    if (!pgn) {
      return res.status(400).json({ error: 'PGN is required.' })
    }

    try {
      // Call the Python API
      const pythonApiResponse = await axios.post(
        'http://localhost:8000/evaluator',
        {
          move: pgn,
          config, // Pass additional config if needed
        }
      )

      // Forward the response from the Python API to the client
      res.status(200).json({ enrichedPgn: pythonApiResponse.data.result })
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error('Error calling Python API:', (error as any).message)

      // Return an error response
      res.status(500).json({ error: 'Failed to process PGN via Python API.' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
