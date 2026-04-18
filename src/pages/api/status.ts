import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: boolean } | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const httpUrl = process.env.API_URL || ''
  try {
    const backendResponse = await fetch(`${httpUrl}/health`, { cache: 'no-store' })
    const json = (await backendResponse.json().catch(() => ({}))) as { ok?: boolean }
    const ok = backendResponse.ok && Boolean(json?.ok)
    return res.status(200).json({ ok })
  } catch {
    return res.status(200).json({ ok: false })
  }
}
