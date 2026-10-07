import { FormEvent, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { SendHorizontal, Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { ChatMessage } from '../../types'
import type { TranslationKey } from '../../i18n'

interface ChatPageProps {
  messages: ChatMessage[]
  input: string
  loading: boolean
  onInputChange: (value: string) => void
  onSend: (text: string) => void
}

const SUGGESTIONS: TranslationKey[] = ['chatSuggest1', 'chatSuggest2', 'chatSuggest3', 'chatSuggest4']

export function ChatPage({ messages, input, loading, onInputChange, onSend }: ChatPageProps) {
  const { tr } = useApp()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSend(input)
  }

  const showSuggestions = messages.filter((m) => m.role === 'user').length === 0

  return (
    <div className="card flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col overflow-hidden lg:h-[calc(100dvh-12rem)]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-ink">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{tr('chatTitle')}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-subtle" />
            {tr('chatLive')}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-xl ${
                msg.role === 'user'
                  ? 'rounded-br-md bg-brand text-brand-ink shadow-soft'
                  : 'rounded-bl-md border border-line bg-elevated text-ink'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 border-t border-line pt-2.5 text-[11px]">
                  <p className="mb-1.5 font-semibold uppercase tracking-wide text-muted">{tr('sources')}</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-md bg-surface px-2 py-1 text-brand hover:underline"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 text-sm text-muted">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-brand"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </span>
            {tr('chatThinking')}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showSuggestions && (
        <div className="border-t border-line px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{tr('chatSuggestTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((key) => (
              <button key={key} type="button" onClick={() => onSend(tr(key))} className="chip">
                {tr(key)}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="flex gap-2 border-t border-line p-4">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={tr('chatPlaceholder')}
          aria-label={tr('chatPlaceholder')}
          className="input"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary shrink-0 px-4"
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
