import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Phone,
  Search,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { CatalogueMeta, EligibilityResult } from '../../types'

interface SchemesPageProps {
  results: EligibilityResult[]
  loading: boolean
  savedIds: string[]
  meta: CatalogueMeta | null
  onToggleSave: (id: string) => void
  onAskScheme: (name: string) => void
}

type StatusFilter = 'all' | 'eligible' | 'ineligible'

export function SchemesPage({ results, loading, savedIds, meta, onToggleSave, onAskScheme }: SchemesPageProps) {
  const { tr } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return results.filter((r) => {
      if (status === 'eligible' && !r.eligible) return false
      if (status === 'ineligible' && r.eligible) return false
      if (category !== 'all' && r.category_code !== category) return false
      if (!q) return true
      return (
        r.scheme_name.toLowerCase().includes(q) ||
        r.benefits_summary.toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [results, query, category, status])

  if (loading) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3 p-6">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ))}
        <p className="sr-only">{tr('schemesLoading')}</p>
      </div>
    )
  }

  const categories = meta?.categories ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr('searchSchemes')}
            className="input pl-11"
            aria-label={tr('searchSchemes')}
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`chip ${category === 'all' ? 'chip-active' : ''}`}
            >
              {tr('allCategories')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.code}
                type="button"
                onClick={() => setCategory(cat.code)}
                className={`chip ${category === cat.code ? 'chip-active' : ''}`}
              >
                {cat.name}
                <span className="opacity-60">{cat.scheme_count}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-full border border-line bg-surface p-1">
            <SlidersHorizontal className="ml-2 h-3.5 w-3.5 text-muted" />
            {(['all', 'eligible', 'ineligible'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  status === s ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {s === 'all' ? tr('statusAll') : s === 'eligible' ? tr('statusEligible') : tr('statusIneligible')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 border-dashed p-14 text-center">
          <Search className="h-6 w-6 text-muted" />
          <p className="font-medium">{tr('noResults')}</p>
          <p className="text-sm text-muted">{tr('noResultsHint')}</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((result) => {
            const saved = savedIds.includes(result.scheme_id)
            const isOpen = expanded === result.scheme_id
            const passedCount = result.rules_checked.filter((r) => r.passed).length
            return (
              <motion.article
                key={result.scheme_id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="card flex flex-col p-5 transition-shadow duration-200 hover:shadow-lift"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-elevated text-muted">{result.category ?? tr('activeScheme')}</span>
                    {result.eligible ? (
                      <span className="badge bg-success/12 text-success">
                        <CheckCircle2 className="h-3 w-3" /> {tr('eligible')}
                      </span>
                    ) : (
                      <span className="badge bg-danger/10 text-danger">
                        <XCircle className="h-3 w-3" /> {tr('ineligible')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleSave(result.scheme_id)}
                    className="icon-btn shrink-0"
                    aria-label={saved ? tr('removeBookmark') : 'Save'}
                    title={saved ? tr('removeBookmark') : 'Save'}
                  >
                    {saved ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                </div>

                <h3 className="font-display text-xl font-semibold tracking-tight">{result.scheme_name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{result.benefits_summary}</p>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : result.scheme_id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between rounded-xl border border-line bg-elevated px-3.5 py-2.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
                  >
                    <span>
                      {tr('rulesTitle')} · {passedCount}/{result.rules_checked.length} {tr('passed').toLowerCase()}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <ul className="mt-3 space-y-1.5">
                          {result.rules_checked.map((rule, idx) => (
                            <li
                              key={`${rule.field_name}-${idx}`}
                              className="flex items-start justify-between gap-3 text-xs"
                            >
                              <span className={rule.passed ? 'text-muted' : 'text-danger'}>{rule.description}</span>
                              <span
                                className={`shrink-0 font-semibold ${rule.passed ? 'text-success' : 'text-danger'}`}
                              >
                                {rule.passed ? tr('passed') : tr('failed')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {result.required_documents.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {tr('documentsTitle')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.required_documents.map((doc) => (
                        <span key={doc.id} className="rounded-lg bg-elevated px-2 py-1 text-[11px] text-muted" title={doc.description}>
                          {doc.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  {result.official_website && (
                    <a
                      href={result.official_website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn-primary flex-1 py-2.5 text-xs"
                    >
                      {tr('officialPortal')} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onAskScheme(result.scheme_name)}
                    className="btn-outline py-2.5 text-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> {tr('chatAbout')}
                  </button>
                </div>

                {result.helpline && (
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                    <Phone className="h-3 w-3" />
                    {tr('helpline')}: <span className="font-semibold text-ink">{result.helpline}</span>
                  </p>
                )}
              </motion.article>
            )
          })}
        </div>
      )}
    </div>
  )
}
