export async function surveyRequest<T>(path: string, options: RequestInit = {}, sessionToken?: string): Promise<T> {
  const response = await fetch(`/api/surveys/${path}`, {
    ...options, cache: 'no-store', headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = typeof data.detail === 'string' ? data.detail : 'The request could not be saved. Please try again.'
    throw new Error(message)
  }
  return response.json() as Promise<T>
}
