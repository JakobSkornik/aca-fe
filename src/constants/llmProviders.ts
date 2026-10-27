/** Provider keys sent as `llm_provider`; the backend resolves each to one model. */
export type LlmProvider = 'openai' | 'grok' | 'cursor'
export type LlmEffort = 'low' | 'medium' | 'high'

export const DEFAULT_LLM_PROVIDER: LlmProvider = 'openai'
export const DEFAULT_LLM_EFFORT: LlmEffort = 'medium'

export const LLM_PROVIDER_OPTIONS: {
  value: LlmProvider
  label: string
  modelSummary: string
  supportsEffort: boolean
}[] = [
  {
    value: 'openai',
    label: 'GPT-6 Luna (OpenAI)',
    modelSummary: 'GPT-6 Luna',
    supportsEffort: true,
  },
  {
    value: 'grok',
    label: 'Grok 4.6 (Cursor)',
    modelSummary: 'Grok 4.6',
    supportsEffort: true,
  },
  {
    value: 'cursor',
    label: 'Composer 2.5 (Cursor)',
    modelSummary: 'Composer 2.5',
    supportsEffort: false,
  },
]

export function modelSummaryForProvider(provider: string | null | undefined): string {
  return LLM_PROVIDER_OPTIONS.find((o) => o.value === provider)?.modelSummary ?? '—'
}

export function providerSupportsEffort(provider: LlmProvider): boolean {
  return LLM_PROVIDER_OPTIONS.find((o) => o.value === provider)?.supportsEffort ?? true
}
