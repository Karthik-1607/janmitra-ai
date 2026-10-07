import { motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, ExternalLink, FileText, HelpCircle, Radio, RefreshCw, Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { CatalogueMeta, EligibilityResult, SchemeUpdate } from '../../types'
import { timeAgo } from '../../utils/format'

interface DashboardPageProps {
  results: EligibilityResult[]
  meta: CatalogueMeta | null
  liveUpdates: SchemeUpdate[]
  liveRefreshing: boolean
  onRefreshLive: () => void
}

export function DashboardPage({ results, meta, liveUpdates, liveRefreshing, onRefreshLive }: DashboardPageProps) {
  const { tr, lang, setActiveTab } = useApp()

  const eligible = results.filter((r) => r.eligible)
  const ineligible = results.filter((r) => !r.eligible)
  const total = results.length
  const matchRate = total > 0 ? Math.round((eligible.length / total) * 100) : 0

  const documents = Array.from(
    new Map(eligible.flatMap((s) => s.required_documents).map((d) => [d.id, d])).values(),
  )

  const stats = [
    { value: eligible.length, label: tr('statEligible'), accent: 'text-success' },
    { value: total, label: tr('statMatched'), accent: 'text-brand' },
    { value: documents.length, label: tr('statDocuments'), accent: 'text-accent' },
    { value: meta?.stats.total_categories ?? 7, label: tr('statCategories'), accent: 'text-ink' },
  ]

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="card-elevated relative overflow-hidden p-6 sm:p-9"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{tr('welcomeLabel')}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {tr('welcomeTitle')}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              {tr('overviewBody', { count: eligible.length, total })}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => setActiveTab('chat')} className="btn-primary">
                <Sparkles className="h-4 w-4" />
                {tr('askMitra')}
              </button>
              <button type="button" onClick={() => setActiveTab('schemes')} className="btn-outline">
                {tr('verifyEligibility')}
              </button>
            </div>
          </div>

          <MatchRing value={matchRate} caption={tr('statEligible')} />
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className={`font-display text-3xl font-semibold tracking-tight ${stat.accent}`}>{stat.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title={tr('eligibleTitle')}
          icon={<CheckCircle2 className="h-5 w-5 text-success" />}
          count={eligible.length}
        >
          {eligible.length === 0 ? (
            <EmptyState text={tr('eligibleEmpty')} cta={tr('setupProfile')} onClick={() => setActiveTab('profile')} />
          ) : (
            <ul className="space-y-2">
              {eligible.map((scheme) => (
                <li key={scheme.scheme_id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('schemes')}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-elevated px-3.5 py-3 text-left text-sm transition-colors hover:border-success/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{scheme.scheme_name}</span>
                      {scheme.category && <span className="mt-0.5 block text-[11px] text-muted">{scheme.category}</span>}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand">
                      {tr('viewDetails')}
                      <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={tr('ineligibleTitle')}
          icon={<HelpCircle className="h-5 w-5 text-muted" />}
          count={ineligible.length}
        >
          {ineligible.length === 0 ? (
            <p className="text-sm text-muted">{tr('ineligibleEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {ineligible.map((scheme) => (
                <li key={scheme.scheme_id} className="rounded-xl border border-line bg-elevated px-3.5 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{scheme.scheme_name}</span>
                  </div>
                  <p className="mt-1 text-xs text-danger">
                    {scheme.rules_checked.find((r) => !r.passed)?.description ?? tr('ineligible')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            <Radio className="h-5 w-5 text-success" />
            <div>
              <h2 className="font-display text-lg font-semibold">{tr('liveUpdates')}</h2>
              <p className="text-xs text-muted">{tr('liveUpdatesBody')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefreshLive}
            disabled={liveRefreshing}
            className="btn-outline py-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${liveRefreshing ? 'animate-spin' : ''}`} />
            {tr('refreshLive')}
          </button>
        </div>

        {liveUpdates.length === 0 ? (
          <p className="text-sm text-muted">{tr('liveEmpty')}</p>
        ) : (
          <ul className="space-y-3">
            {liveUpdates.map((update) => (
              <li
                key={update.scheme_code}
                className="rounded-xl border border-line bg-elevated p-4"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="badge bg-success/12 text-success">{tr('liveBadge')}</span>
                  <span className="text-xs font-semibold text-muted">{update.source_label}</span>
                  <span className="text-[11px] text-muted">{timeAgo(update.fetched_at, lang)}</span>
                </div>
                <p className="text-sm leading-relaxed">{update.headline}</p>
                {update.amounts && update.amounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {update.amounts.slice(0, 5).map((amount) => (
                      <span key={amount} className="rounded-lg bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent">
                        ₹{amount}
                      </span>
                    ))}
                  </div>
                )}
                <a
                  href={update.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                >
                  {tr('viewSource')} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {documents.length > 0 && (
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            <div>
              <h2 className="font-display text-lg font-semibold">{tr('nextSteps')}</h2>
              <p className="text-xs text-muted">{tr('nextStepsBody')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
              <span key={doc.id} className="chip" title={doc.description}>
                {doc.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MatchRing({ value, caption }: { value: number; caption: string }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-line" />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="stroke-brand"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold">{value}%</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">{caption}</span>
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  icon,
  count,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        {icon}
        {title}
        <span className="badge ml-auto bg-elevated text-muted">{count}</span>
      </h2>
      {children}
    </section>
  )
}

function EmptyState({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{text}</p>
      <button type="button" onClick={onClick} className="btn-outline text-xs">
        {cta}
      </button>
    </div>
  )
}
