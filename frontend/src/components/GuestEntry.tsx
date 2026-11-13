import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, FileText, Languages, ShieldCheck, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { CatalogueMeta } from '../types'

interface GuestEntryProps {
  onEnter: () => void
  apiOnline: boolean | null
  meta: CatalogueMeta | null
}

export function GuestEntry({ onEnter, apiOnline, meta }: GuestEntryProps) {
  const { tr, lang, setLang } = useApp()

  const stats = [
    { value: meta?.stats.total_schemes ?? 10, label: tr('statSchemes') },
    { value: meta?.stats.districts ?? 26, label: tr('statDistricts') },
    { value: meta?.stats.total_categories ?? 7, label: tr('statCategories') },
    { value: meta?.stats.total_departments ?? 7, label: tr('statDepartments') },
  ]

  const points = [
    { icon: BadgeCheck, text: tr('heroPoint1') },
    { icon: FileText, text: tr('heroPoint2') },
    { icon: Languages, text: tr('heroPoint3') },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand/12 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent/12 blur-3xl" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(var(--muted) / 0.18) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative shell-container flex min-h-screen flex-col py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-ink shadow-soft">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">{tr('brand')}</p>
              <p className="text-xs text-muted">{tr('brandSubtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`badge hidden bg-elevated sm:inline-flex ${
                apiOnline === false ? 'text-danger' : apiOnline === null ? 'text-muted' : 'text-success'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  apiOnline === false ? 'bg-danger' : apiOnline === null ? 'bg-muted' : 'animate-pulse-subtle bg-success'
                }`}
              />
              {apiOnline === false ? tr('apiOffline') : apiOnline === null ? tr('apiChecking') : tr('apiOnline')}
            </span>
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
              className="icon-btn"
              aria-label="Toggle language"
            >
              <Languages className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1.5 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              {tr('heroEyebrow')}
            </div>

            <h1 className="font-display font-semibold leading-[1.05] tracking-tight text-display-sm sm:text-display lg:text-display-lg">
              {tr('heroTitle')}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{tr('heroBody')}</p>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button type="button" onClick={onEnter} className="btn-primary group px-7 py-3.5 text-base">
                {tr('enterDemo')}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <p className="text-sm text-muted">{tr('enterDemoHint')}</p>
            </div>

            <ul className="mt-10 grid gap-3 sm:grid-cols-3">
              {points.map((point) => (
                <li key={point.text} className="flex items-start gap-2.5 text-sm text-muted">
                  <point.icon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {point.text}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
          >
            {stats.map((item) => (
              <div key={item.label} className="card-elevated p-5">
                <p className="font-display text-3xl font-semibold tracking-tight text-brand">{item.value}</p>
                <p className="mt-1 text-sm text-muted">{item.label}</p>
              </div>
            ))}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
