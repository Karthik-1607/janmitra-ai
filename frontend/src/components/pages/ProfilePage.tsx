import { FormEvent } from 'react'
import { Loader2, Save, UserRound } from 'lucide-react'
import { AP_DISTRICTS } from '../../constants'
import { useApp } from '../../context/AppContext'

export interface ProfileFormState {
  fullName: string
  phoneNumber: string
  age: number
  gender: string
  casteCategory: string
  occupation: string
  annualIncome: number
  isDisabled: boolean
  disabilityPercentage: number
  isFarmer: boolean
  maritalStatus: string
  district: string
}

interface ProfilePageProps {
  form: ProfileFormState
  saving: boolean
  onChange: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void
  onSubmit: (e: FormEvent) => void
}

export function ProfilePage({ form, saving, onChange, onSubmit }: ProfilePageProps) {
  const { tr } = useApp()

  const completeness = Math.round(
    ([form.fullName, form.phoneNumber, form.district, form.maritalStatus].filter(Boolean).length +
      [form.age, form.annualIncome].filter((n) => Number(n) > 0).length +
      [form.gender, form.casteCategory, form.occupation].filter(Boolean).length) /
      9 *
      100,
  )

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/12 text-brand">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{tr('profileTitle')}</h1>
            <p className="mt-1 max-w-lg text-sm text-muted">{tr('profileBody')}</p>
          </div>
        </div>
        <div className="w-full max-w-[10rem] shrink-0">
          <div className="mb-1.5 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span>{tr('profileCompleteness')}</span>
            <span className="text-ink">{completeness}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500 ease-emphasized"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="mb-5 font-display text-lg font-semibold">{tr('sectionPersonal')}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={tr('fullName')}>
            <input
              required
              className="input"
              value={form.fullName}
              onChange={(e) => onChange('fullName', e.target.value)}
            />
          </Field>
          <Field label={tr('phone')}>
            <input
              inputMode="tel"
              className="input"
              value={form.phoneNumber}
              onChange={(e) => onChange('phoneNumber', e.target.value)}
            />
          </Field>
          <Field label={tr('age')}>
            <input
              required
              type="number"
              min={1}
              max={120}
              className="input"
              value={form.age}
              onChange={(e) => onChange('age', Number(e.target.value))}
            />
          </Field>
          <Field label={tr('gender')}>
            <select className="input" value={form.gender} onChange={(e) => onChange('gender', e.target.value)}>
              <option value="Male">{tr('male')}</option>
              <option value="Female">{tr('female')}</option>
              <option value="Other">{tr('other')}</option>
            </select>
          </Field>
          <Field label={tr('maritalStatus')}>
            <select
              className="input"
              value={form.maritalStatus}
              onChange={(e) => onChange('maritalStatus', e.target.value)}
            >
              <option value="Single">{tr('maritalSingle')}</option>
              <option value="Married">{tr('maritalMarried')}</option>
              <option value="Widowed">{tr('maritalWidowed')}</option>
              <option value="Divorced">{tr('maritalDivorced')}</option>
            </select>
          </Field>
          <Field label={tr('district')}>
            <select className="input" value={form.district} onChange={(e) => onChange('district', e.target.value)}>
              {AP_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 font-display text-lg font-semibold">{tr('sectionSocio')}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={tr('caste')}>
            <select
              className="input"
              value={form.casteCategory}
              onChange={(e) => onChange('casteCategory', e.target.value)}
            >
              <option value="General">{tr('general')}</option>
              <option value="OBC">{tr('obc')}</option>
              <option value="SC">{tr('sc')}</option>
              <option value="ST">{tr('st')}</option>
              <option value="EBC">{tr('ebc')}</option>
            </select>
          </Field>
          <Field label={tr('occupation')}>
            <select className="input" value={form.occupation} onChange={(e) => onChange('occupation', e.target.value)}>
              <option value="Student">{tr('student')}</option>
              <option value="Farmer">{tr('farmerOcc')}</option>
              <option value="Job Seeker">{tr('jobSeeker')}</option>
              <option value="Women / Homemaker">{tr('homemaker')}</option>
              <option value="Senior Citizen">{tr('senior')}</option>
              <option value="Entrepreneur">{tr('entrepreneur')}</option>
              <option value="Other">{tr('otherOcc')}</option>
            </select>
          </Field>
          <Field label={tr('income')}>
            <input
              required
              type="number"
              min={0}
              step={1000}
              className="input"
              value={form.annualIncome}
              onChange={(e) => onChange('annualIncome', Number(e.target.value))}
            />
          </Field>
          <Field label={tr('disabilityPercent')}>
            <input
              type="number"
              min={0}
              max={100}
              disabled={!form.isDisabled}
              className="input disabled:opacity-50"
              value={form.disabilityPercentage}
              onChange={(e) => onChange('disabilityPercentage', Number(e.target.value))}
            />
          </Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">{tr('sectionFlags')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={form.isFarmer}
            onChange={(v) => onChange('isFarmer', v)}
            label={tr('farmer')}
          />
          <Toggle
            checked={form.isDisabled}
            onChange={(v) => {
              onChange('isDisabled', v)
              if (!v) onChange('disabilityPercentage', 0)
            }}
            label={tr('disabled')}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary px-6 py-3">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {tr('saveProfile')}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3 text-sm font-medium transition-colors hover:border-brand/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-brand"
      />
      {label}
    </label>
  )
}
