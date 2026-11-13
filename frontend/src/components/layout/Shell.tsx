import {
  Bookmark,
  LayoutDashboard,
  Languages,
  LogOut,
  MessageSquare,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Type,
  User,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { TabId } from '../../types'
import type { TranslationKey } from '../../i18n'

interface ShellProps {
  children: React.ReactNode
  district: string
  displayName: string
  apiOnline: boolean | null
  onLogout: () => void
}

const tabs: { id: TabId; icon: typeof LayoutDashboard; labelKey: TranslationKey }[] = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navDashboard' },
  { id: 'chat', icon: MessageSquare, labelKey: 'navChat' },
  { id: 'schemes', icon: Search, labelKey: 'navSchemes' },
  { id: 'saved', icon: Bookmark, labelKey: 'navSaved' },
  { id: 'profile', icon: User, labelKey: 'navProfile' },
]

export function Shell({ children, district, displayName, apiOnline, onLogout }: ShellProps) {
  const { tr, lang, setLang, isDark, setIsDark, fontSize, setFontSize, activeTab, setActiveTab } = useApp()

  const cycleFont = () => {
    setFontSize(fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'extra-large' : 'normal')
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-ink"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="shell-container flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand font-display font-bold text-brand-ink shadow-soft">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-lg font-semibold tracking-tight">{tr('brand')}</span>
                <span className="badge hidden bg-accent/12 text-accent sm:inline-flex">{tr('demoBadge')}</span>
              </div>
              <p className="truncate text-[11px] text-muted">{district} · {tr('brandTag')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusPill
              online={apiOnline}
              label={apiOnline === null ? tr('apiChecking') : apiOnline ? tr('apiOnline') : tr('apiOffline')}
            />
            <button type="button" onClick={cycleFont} className="icon-btn" title="Text size" aria-label="Change text size">
              <Type className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
              className="icon-btn"
              title="Language"
              aria-label="Toggle language"
            >
              <Languages className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className="icon-btn"
              title="Theme"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="ml-1 hidden items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-ink">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[9rem] truncate text-xs font-medium">{displayName}</span>
            </div>

            <button type="button" onClick={onLogout} className="icon-btn" title={tr('logout')} aria-label={tr('logout')}>
              <LogOut className="h-4 w-4 text-danger" />
            </button>
          </div>
        </div>
      </header>

      <div className="shell-container flex gap-8 py-6 lg:py-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1" aria-label="Primary">
            {tabs.map((tab) => (
              <SideNavButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                icon={tab.icon}
                label={tr(tab.labelKey)}
              />
            ))}
          </nav>
        </aside>

        <main id="main" className="min-w-0 flex-1 pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      <footer className="border-t border-line py-10">
        <div className="shell-container flex flex-col items-center gap-1 text-center text-xs text-muted">
          <p>{tr('footer')}</p>
          <p className="opacity-80">{tr('footerNote')}</p>
        </div>
      </footer>

      {/* Mobile bottom navigation — large, thumb-reachable targets (Fitts's Law). */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/92 backdrop-blur-xl lg:hidden" aria-label="Primary">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
                aria-current={active ? 'page' : undefined}
              >
                <span className={`flex h-9 w-12 items-center justify-center rounded-xl transition-colors ${active ? 'bg-brand/12 text-brand' : 'text-muted'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={active ? 'text-brand' : 'text-muted'}>{tr(tab.labelKey)}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function SideNavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof LayoutDashboard
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
        active ? 'bg-brand text-brand-ink shadow-soft' : 'text-muted hover:bg-elevated hover:text-ink'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  )
}

function StatusPill({ online, label }: { online: boolean | null; label: string }) {
  const tone = online ? 'text-success' : 'text-muted'
  return (
    <span className={`badge hidden md:inline-flex bg-elevated ${tone}`} title={label}>
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'animate-pulse-subtle bg-success' : 'bg-muted'}`} />
      {label}
    </span>
  )
}
