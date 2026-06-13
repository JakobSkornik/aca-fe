import React, { useState } from 'react'
import type { AiCommentLlmDebug } from '@/types/WebSocketMessages'

type Props = {
  debug: AiCommentLlmDebug
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{title}</h4>
      {children}
    </section>
  )
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="mono whitespace-pre-wrap break-words rounded border border-border-tertiary bg-background-secondary p-2 text-[11px] leading-snug text-text-secondary">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

/** Guarded debug panel: renders whichever fields exist on either the facts
 * composer or the legacy composer shape, and never throws. */
const LlmDebugPanel: React.FC<Props> = ({ debug }) => {
  const [open, setOpen] = useState(false)

  const renderings =
    debug.facts_renderings && Object.keys(debug.facts_renderings).length
      ? Object.entries(debug.facts_renderings)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : null
  const passes = Array.isArray(debug.passes) ? debug.passes : []
  const systemPrompts = Array.isArray(debug.system_prompts) ? debug.system_prompts : []
  const claims = Array.isArray(debug.claims) ? debug.claims : []
  const featureRefs = Array.isArray(debug.feature_refs) ? debug.feature_refs : []

  const summaryBits = [
    debug.move_category,
    debug.key_moment_type,
    renderings ? `render ${renderings}` : null,
    debug.facts_contract_ok != null ? `contract ${debug.facts_contract_ok ? 'ok' : 'fallback'}` : null,
    debug.token_usage_total != null ? `${debug.token_usage_total} tok` : null,
  ].filter(Boolean)

  return (
    <div className="mt-2 rounded-md border border-border-tertiary bg-background-secondary/60 text-xs">
      <button
        type="button"
        className="flex w-full flex-wrap items-baseline gap-x-2 px-2 py-1.5 text-left font-semibold text-text-secondary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>LLM debug</span>
        {summaryBits.length ? <span className="font-normal text-text-tertiary">{summaryBits.join(' · ')}</span> : null}
      </button>
      {open ? (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto border-t border-border-tertiary p-2">
          {claims.length ? (
            <Block title="Claims">
              <ul className="list-disc pl-4 text-text-secondary">
                {claims.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </Block>
          ) : null}
          {featureRefs.length ? (
            <Block title="Feature refs">
              <div className="mono text-[11px] text-text-secondary">{featureRefs.join(', ')}</div>
            </Block>
          ) : null}
          {renderings ? (
            <Block title="Renderings">
              <div className="mono text-[11px] text-text-secondary">
                {renderings}
                {debug.forbidden_phrase_hits != null ? ` · forbidden ${debug.forbidden_phrase_hits}` : ''}
              </div>
            </Block>
          ) : null}
          {debug.tier ? (
            <Block title="Tier">
              <Json value={debug.tier} />
            </Block>
          ) : null}
          {debug.rationale ? (
            <Block title="Rationale">
              <Json value={debug.rationale} />
            </Block>
          ) : null}
          {debug.rag_query ? (
            <Block title="RAG query">
              <Json value={debug.rag_query} />
            </Block>
          ) : null}
          {systemPrompts.length ? (
            <Block title="System prompts">
              <div className="space-y-2">
                {systemPrompts.map((sp, i) => (
                  <div key={sp.name ?? i} className="rounded border border-border-tertiary bg-background-secondary p-2">
                    <div className="mb-1 font-medium text-text-primary">{sp.name}</div>
                    <pre className="mono whitespace-pre-wrap break-words text-[11px] leading-snug text-text-secondary">{sp.text}</pre>
                  </div>
                ))}
              </div>
            </Block>
          ) : null}
          {debug.user_text ? (
            <Block title="User prompt">
              <pre className="mono whitespace-pre-wrap break-words rounded border border-border-tertiary bg-background-secondary p-2 text-[11px] leading-snug text-text-secondary">
                {debug.user_text}
              </pre>
            </Block>
          ) : null}
          {passes.length ? (
            <Block title="Passes">
              <div className="mono text-[11px] text-text-secondary">
                {passes.map((p) => `${p.name}(${p.effort})`).join(', ')}
              </div>
            </Block>
          ) : null}
          {/* Always-available raw fallback so the panel can never be empty/broken */}
          <Block title="Raw">
            <Json value={debug} />
          </Block>
        </div>
      ) : null}
    </div>
  )
}

export default LlmDebugPanel
