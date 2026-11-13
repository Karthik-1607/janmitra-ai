import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch, clearAuthToken, getAuthToken, setAuthToken } from './api/client'
import { GuestEntry } from './components/GuestEntry'
import { Shell } from './components/layout/Shell'
import { ChatPage } from './components/pages/ChatPage'
import { DashboardPage } from './components/pages/DashboardPage'
import { ProfileFormState, ProfilePage } from './components/pages/ProfilePage'
import { SavedPage } from './components/pages/SavedPage'
import { SchemesPage } from './components/pages/SchemesPage'
import { DEMO_TOKEN, SAVED_SCHEMES_KEY } from './constants'
import { AppProvider, useApp } from './context/AppContext'
import type {
  CatalogueMeta,
  ChatMessage,
  EligibilityResult,
  FontSize,
  HealthStatus,
  Lang,
  Profile,
  ProfileUpdatePayload,
  SchemeUpdate,
  TabId,
} from './types'

const PREFERENCES_KEY = 'janmitra_preferences'

interface UserPreferences {
  lang?: Lang
  isDark?: boolean
  fontSize?: FontSize
}

function readPreferences(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}') as UserPreferences
  } catch {
    return {}
  }
}

function AppInner() {
  const { activeTab, lang, tr, setActiveTab } = useApp()
  const [token, setTokenState] = useState<string | null>(() => getAuthToken())
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [meta, setMeta] = useState<CatalogueMeta | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [results, setResults] = useState<EligibilityResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [liveUpdates, setLiveUpdates] = useState<SchemeUpdate[]>([])
  const [liveRefreshing, setLiveRefreshing] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(SAVED_SCHEMES_KEY) || '[]'),
  )
  const [toast, setToast] = useState<string | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const [form, setForm] = useState<ProfileFormState>({
    fullName: '',
    phoneNumber: '',
    age: 18,
    gender: 'Male',
    casteCategory: 'General',
    occupation: 'Other',
    annualIncome: 0,
    isDisabled: false,
    disabilityPercentage: 0,
    isFarmer: false,
    maritalStatus: 'Single',
    district: 'Visakhapatnam',
  })

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => {
    localStorage.setItem(SAVED_SCHEMES_KEY, JSON.stringify(savedIds))
  }, [savedIds])

  useEffect(() => {
    apiFetch<HealthStatus>('/api/v1/health')
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false))
    apiFetch<CatalogueMeta>('/api/v1/schemes/meta')
      .then((data) => setMeta(data))
      .catch(() => setMeta(null))
    apiFetch<SchemeUpdate[]>('/api/v1/live/updates')
      .then((data) => setLiveUpdates(Array.isArray(data) ? data : []))
      .catch(() => setLiveUpdates([]))
  }, [])

  const refreshLive = useCallback(async () => {
    setLiveRefreshing(true)
    try {
      const data = await apiFetch<SchemeUpdate[]>('/api/v1/live/sync', { method: 'POST' })
      setLiveUpdates(Array.isArray(data) ? data : [])
    } catch {
      // Keep the previously loaded snapshots if the refresh fails.
    } finally {
      setLiveRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: tr('chatWelcome'),
        created_at: new Date().toISOString(),
      },
    ])
  }, [token, lang, tr])

  const loadProfile = useCallback(async (authToken: string) => {
    setResultsLoading(true)
    try {
      const data = await apiFetch<Profile>('/api/v1/profiles/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setProfile(data)
      setForm({
        fullName: data.full_name || '',
        phoneNumber: data.phone_number || '',
        age: data.age || 18,
        gender: data.gender || 'Male',
        casteCategory: data.caste_category || 'General',
        occupation: data.occupation || 'Other',
        annualIncome: Number(data.annual_income) || 0,
        isDisabled: data.is_disabled || false,
        disabilityPercentage: data.disability_percentage || 0,
        isFarmer: data.is_farmer || false,
        maritalStatus: data.marital_status || 'Single',
        district: data.district || 'Visakhapatnam',
      })

      const matches = await apiFetch<EligibilityResult[]>('/api/v1/schemes/match/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setResults(Array.isArray(matches) ? matches : [])
      setApiOnline(true)
    } catch {
      setApiOnline(false)
      if (!getAuthToken()) {
        setTokenState(null)
      }
    } finally {
      setResultsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) loadProfile(token)
  }, [token, loadProfile])

  const enterDemo = () => {
    setAuthToken(DEMO_TOKEN)
    setTokenState(DEMO_TOKEN)
  }

  const logout = () => {
    clearAuthToken()
    setTokenState(null)
    setProfile(null)
    setResults([])
    setActiveTab('dashboard')
  }

  const updateForm = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setProfileSaving(true)
    const payload: ProfileUpdatePayload = {
      full_name: form.fullName,
      phone_number: form.phoneNumber,
      age: form.age,
      gender: form.gender,
      caste_category: form.casteCategory,
      occupation: form.occupation,
      annual_income: form.annualIncome,
      is_disabled: form.isDisabled,
      disability_percentage: form.isDisabled ? form.disabilityPercentage : 0,
      is_farmer: form.isFarmer,
      marital_status: form.maritalStatus,
      district: form.district,
      state: 'Andhra Pradesh',
    }

    try {
      const updated = await apiFetch<Profile>('/api/v1/profiles/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      setProfile(updated)
      const matches = await apiFetch<EligibilityResult[]>('/api/v1/schemes/match/me')
      setResults(matches)
      showToast(tr('profileSaved'))
    } catch {
      showToast(tr('profileError'))
    } finally {
      setProfileSaving(false)
    }
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || !token) return

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      setChatMessages((prev) => [...prev, userMsg])
      setChatInput('')
      setChatLoading(true)

      try {
        const reply = await apiFetch<ChatMessage>('/api/v1/chat', {
          method: 'POST',
          body: JSON.stringify({ content }),
        })
        setChatMessages((prev) => [...prev, reply])
      } catch {
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              lang === 'en'
                ? 'I could not reach the assistant. Please ensure the backend is running on port 8000.'
                : 'సహాయకుడిని సంప్రదించలేకపోయాం. backend port 8000 లో నడుస్తోందో చూడండి.',
            created_at: new Date().toISOString(),
          },
        ])
      } finally {
        setChatLoading(false)
      }
    },
    [token, lang],
  )

  const askAboutScheme = (name: string) => {
    setActiveTab('chat')
    void sendMessage(`Tell me about ${name}: its benefits, eligibility criteria and required documents.`)
  }

  const toggleSave = (schemeId: string) => {
    setSavedIds((prev) => (prev.includes(schemeId) ? prev.filter((id) => id !== schemeId) : [...prev, schemeId]))
  }

  if (!token) {
    return <GuestEntry onEnter={enterDemo} apiOnline={apiOnline} meta={meta} />
  }

  const displayName = profile?.full_name?.trim() || tr('guestName')

  return (
    <>
      <Shell district={form.district} displayName={displayName} apiOnline={apiOnline} onLogout={logout}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'dashboard' && (
              <DashboardPage
                results={results}
                meta={meta}
                apiOnline={apiOnline}
                liveUpdates={liveUpdates}
                liveRefreshing={liveRefreshing}
                onRefreshLive={refreshLive}
              />
            )}
            {activeTab === 'chat' && (
              <ChatPage
                messages={chatMessages}
                input={chatInput}
                loading={chatLoading}
                onInputChange={setChatInput}
                onSend={sendMessage}
              />
            )}
            {activeTab === 'schemes' && (
              <SchemesPage
                results={results}
                loading={resultsLoading}
                savedIds={savedIds}
                meta={meta}
                liveUpdates={liveUpdates}
                onToggleSave={toggleSave}
                onAskScheme={askAboutScheme}
              />
            )}
            {activeTab === 'saved' && <SavedPage results={results} savedIds={savedIds} onToggleSave={toggleSave} />}
            {activeTab === 'profile' && (
              <ProfilePage form={form} saving={profileSaving} onChange={updateForm} onSubmit={saveProfile} />
            )}
          </motion.div>
        </AnimatePresence>
      </Shell>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-elevated px-5 py-2.5 text-sm text-ink shadow-lift lg:bottom-8"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const TAB_IDS: TabId[] = ['dashboard', 'chat', 'schemes', 'saved', 'profile']

function tabFromHash(): TabId {
  const hash = window.location.hash.replace('#', '') as TabId
  return TAB_IDS.includes(hash) ? hash : 'dashboard'
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => readPreferences().lang ?? 'en')
  const [isDark, setIsDark] = useState<boolean>(() => readPreferences().isDark ?? true)
  const [fontSize, setFontSize] = useState<FontSize>(() => readPreferences().fontSize ?? 'normal')
  const [activeTab, setActiveTab] = useState<TabId>(() => tabFromHash())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ lang, isDark, fontSize }))
  }, [lang, isDark, fontSize])

  // Keep the URL hash in sync so tabs are shareable and back/forward works.
  const navigate = useCallback((tab: TabId) => {
    setActiveTab(tab)
    if (tabFromHash() !== tab) {
      window.history.replaceState(null, '', `#${tab}`)
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <AppProvider
      lang={lang}
      setLang={setLang}
      isDark={isDark}
      setIsDark={setIsDark}
      fontSize={fontSize}
      setFontSize={setFontSize}
      activeTab={activeTab}
      setActiveTab={navigate}
    >
      <AppInner />
    </AppProvider>
  )
}
