import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: boolean; active_sessions?: number } | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const httpUrl = process.env.API_URL || ''
  try {
    const backendResponse = await fetch(`${httpUrl}/evaluator/status`)
    const json = await backendResponse.json()
    return res.status(200).json(json)
  } catch (e) {
    return res.status(200).json({ ok: false })
  }
}


