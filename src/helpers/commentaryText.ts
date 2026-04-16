/**
 * Engine-assembled key-moment line from analysis_retriever:
 * `{KeyMoment words} (Score change: {float})`
 * LLM commentary should not match this pattern.
 */
const ENGINE_KEY_MOMENT_SCORE = /\(\s*Score change:\s*[-\d.]+\s*\)\s*$/i

export function isEngineKeyMomentScoreComment(text: string): boolean {
  const t = text.trim()
  return t.length > 0 && ENGINE_KEY_MOMENT_SCORE.test(t)
}
