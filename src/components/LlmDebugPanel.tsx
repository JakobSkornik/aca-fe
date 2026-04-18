import React, { useState } from 'react'
import type { AiCommentLlmDebug } from '@/types/WebSocketMessages'

type Props = {
  debug: AiCommentLlmDebug
}

const LlmDebugPanel: React.FC<Props> = ({ debug }) => {
  const [open, setOpen] = useState(false)
  const passStr = debug.passes.map((p) => `${p.name}(${p.effort})`).join(', ')

  return (
    <div className="mt-2 border border-gray-200 rounded-md bg-gray-50/90 text-xs">
      <button
        type="button"
        className="w-full text-left px-2 py-1.5 font-semibold text-gray-700 flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>LLM debug</span>
        <span className="font-normal text-gray-500">
          {debug.move_category ?? '—'} · {debug.key_moment_type ?? '—'} · tokens{' '}
          {debug.token_usage_total ?? '—'}
        </span>
        {passStr ? (
          <span className="font-normal text-gray-500 break-all">{passStr}</span>
        ) : null}
      </button>
      {open && (
        <div className="border-t border-gray-200 p-2 space-y-3 max-h-[60vh] overflow-y-auto">
          <section>
            <h4 className="font-semibold text-gray-600 mb-1">Tier</h4>
            <pre className="whitespace-pre-wrap break-words bg-white p-2 rounded border border-gray-100 text-[11px] leading-snug">
              {JSON.stringify(debug.tier, null, 2)}
            </pre>
          </section>
          <section>
            <h4 className="font-semibold text-gray-600 mb-1">Rationale</h4>
            <pre className="whitespace-pre-wrap break-words bg-white p-2 rounded border border-gray-100 text-[11px] leading-snug">
              {JSON.stringify(debug.rationale, null, 2)}
            </pre>
          </section>
          <section>
            <h4 className="font-semibold text-gray-600 mb-1">RAG query</h4>
            <pre className="whitespace-pre-wrap break-words bg-white p-2 rounded border border-gray-100 text-[11px] leading-snug">
              {JSON.stringify(debug.rag_query, null, 2)}
            </pre>
          </section>
          <section>
            <h4 className="font-semibold text-gray-600 mb-1">System prompts</h4>
            <div className="space-y-2">
              {debug.system_prompts.map((sp) => (
                <div key={sp.name} className="bg-white p-2 rounded border border-gray-100">
                  <div className="font-medium text-gray-700 mb-1">{sp.name}</div>
                  <pre className="whitespace-pre-wrap break-words text-[11px] leading-snug text-gray-800">
                    {sp.text}
                  </pre>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h4 className="font-semibold text-gray-600 mb-1">User prompt</h4>
            <pre className="whitespace-pre-wrap break-words bg-white p-2 rounded border border-gray-100 text-[11px] leading-snug">
              {debug.user_text}
            </pre>
          </section>
        </div>
      )}
    </div>
  )
}

export default LlmDebugPanel
