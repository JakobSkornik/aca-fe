import type { NextApiRequest, NextApiResponse } from 'next'

// Define the expected response structure from your FastAPI backend
interface FastAPIResponse {
  session_id: string
  websocket_url: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FastAPIResponse | { error: string; details?: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const { tempPgn } = req.body // Matches the key used in PgnLoader.tsx

  if (!tempPgn || typeof tempPgn !== 'string') {
    return res
      .status(400)
      .json({ error: 'PGN string (tempPgn) is required in the request body.' })
  }

  const httpUrl = process.env.API_URL || ''
  try {
    const backendResponse = await fetch(`${httpUrl}/evaluator/submit_pgn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pgn_string: tempPgn }),
    })

    const responseBodyText = await backendResponse.text()
    if (!backendResponse.ok) {
      let errorDetails: string | undefined = responseBodyText
      try {
        errorDetails = JSON.parse(responseBodyText) // Try to parse as JSON for more structured error
      } catch (e) {
        console.error('Error parsing backend error response:', e)
      }
      console.error(
        `FastAPI backend error (${backendResponse.status}):`,
        errorDetails
      )
      return res.status(backendResponse.status).json({
        error: `Error from analysis backend: ${backendResponse.statusText}`,
        details: errorDetails,
      })
    }

    // Assuming the backend returns JSON with session_id and websocket_url
    const data: FastAPIResponse = JSON.parse(responseBodyText)
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error forwarding PGN to backend:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    return res.status(500).json({
      error: 'Failed to submit PGN to analysis backend.',
      details: errorMessage,
    })
  }
}
