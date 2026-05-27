export type LlmProvider = 'openai' | 'anthropic' | 'cursor'
export type LlmEffort = 'low' | 'medium' | 'high'

export const DEFAULT_LLM_PROVIDER: LlmProvider = 'cursor'
export const DEFAULT_LLM_EFFORT: LlmEffort = 'medium'

export const LLM_PROVIDER_OPTIONS: {
  value: LlmProvider
  label: string
  modelSummary: string
  supportsEffort: boolean
}[] = [
  {
    value: 'cursor',
    label: 'Cursor',
    modelSummary: 'composer-2.5 (all stages)',
    supportsEffort: false,
  },
  {
    value: 'openai',
    label: 'OpenAI',
    modelSummary: 'gpt-4.1 / gpt-4.1-mini',
    supportsEffort: true,
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    modelSummary: 'Sonnet 4.5 / Haiku 4.5',
    supportsEffort: true,
  },
]

export function modelSummaryForProvider(provider: string | null | undefined): string {
  return LLM_PROVIDER_OPTIONS.find((o) => o.value === provider)?.modelSummary ?? '—'
}

export function providerSupportsEffort(provider: LlmProvider): boolean {
  return LLM_PROVIDER_OPTIONS.find((o) => o.value === provider)?.supportsEffort ?? true
}
