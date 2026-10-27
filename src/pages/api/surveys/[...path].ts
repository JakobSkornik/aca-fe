import type { NextApiRequest, NextApiResponse } from 'next'

export const config = { api: { bodyParser: { sizeLimit: '64kb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Referrer-Policy', 'no-referrer')
  if (!['GET', 'POST', 'PUT'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, POST, PUT')
    return res.status(405).json({ detail: 'Method not allowed.' })
  }
  const segments = req.query.path
  // Longest route: grid/<token>/round/<game>/board.
  if (!Array.isArray(segments) || segments.length > 5 || segments.some(s => !/^[A-Za-z0-9_.-]+$/.test(s) || s === '.' || s === '..')) {
    return res.status(404).json({ detail: 'Not found.' })
  }
  const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
  try {
    const upstream = await fetch(`${base}/surveys/${segments.map(encodeURIComponent).join('/')}`, {
      method: req.method, cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
      ...(req.method !== 'GET' ? { body: JSON.stringify(req.body) } : {}),
    })
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    const disposition = upstream.headers.get('content-disposition')
    if (disposition) res.setHeader('Content-Disposition', disposition)
    return res.status(upstream.status).send(await upstream.text())
  } catch {
    return res.status(502).json({ detail: 'The survey service is unavailable. Your saved answers are safe; please try again.' })
  }
}
