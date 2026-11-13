import { Bookmark, CheckCircle2, ExternalLink, XCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { EligibilityResult } from '../../types'

interface SavedPageProps {
  results: EligibilityResult[]
  savedIds: string[]
  onToggleSave: (id: string) => void
}

export function SavedPage({ results, savedIds, onToggleSave }: SavedPageProps) {
  const { tr, setActiveTab } = useApp()
  const saved = results.filter((r) => savedIds.includes(r.scheme_id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Bookmark className="h-6 w-6 text-accent" />
          {tr('savedTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {tr('savedCount', { n: saved.length })}
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 border-dashed p-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-elevated">
            <Bookmark className="h-5 w-5 text-muted" />
          </div>
          <p className="text-sm text-muted">{tr('savedEmpty')}</p>
          <button type="button" onClick={() => setActiveTab('schemes')} className="btn-primary">
            {tr('browseSchemes')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {saved.map((result) => (
            <article key={result.scheme_id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{result.scheme_name}</h3>
                {result.eligible ? (
                  <span className="badge shrink-0 bg-success/12 text-success">
                    <CheckCircle2 className="h-3 w-3" /> {tr('eligible')}
                  </span>
                ) : (
                  <span className="badge shrink-0 bg-danger/10 text-danger">
                    <XCircle className="h-3 w-3" /> {tr('ineligible')}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{result.benefits_summary}</p>

              <div className="mt-auto flex items-center gap-2 pt-5">
                {result.official_website && (
                  <a
                    href={result.official_website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-outline flex-1 py-2.5 text-xs"
                  >
                    {tr('officialPortal')} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onToggleSave(result.scheme_id)}
                  className="btn-ghost py-2.5 text-xs text-danger hover:text-danger"
                >
                  {tr('removeBookmark')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
