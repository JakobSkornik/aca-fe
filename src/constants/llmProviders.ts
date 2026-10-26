export type LlmProvider = 'openai' | 'anthropic' | 'cursor'
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
    value: 'cursor',
    label: 'Cursor',
    modelSummary: 'composer-2.5 (all stages)',
    supportsEffort: false,
  },
  {
    value: 'openai',
    label: 'GPT-6 Luna (OpenAI)',
    modelSummary: 'GPT-6 Luna',
    supportsEffort: true,
  },
  {
    value: 'anthropic',
    label: 'Claude Haiku 5.5 (Anthropic)',
    modelSummary: 'Claude Haiku 5.5',
    supportsEffort: true,
  },
]

export function modelSummaryForProvider(provider: string | null | undefined): string {
  return LLM_PROVIDER_OPTIONS.find((o) => o.value === provider)?.modelSummary ?? '—'
}

export function providerSupportsEffort(provider: LlmProvider): boolean {
  return LLM_PROVIDER_OPTIONS.find((o) => o.value === provider)?.supportsEffort ?? true
}
