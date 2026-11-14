const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const GUEST_ID_KEY = 'janmitra_guest_id'
const GUEST_TOKEN_PREFIX = 'janmitra-guest-'

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalized}`
}

export function getAuthToken(): string | null {
  return localStorage.getItem('janmitra_token')
}

export function setAuthToken(token: string): void {
  localStorage.setItem('janmitra_token', token)
}

export function getOrCreateGuestToken(): string {
  let guestId = localStorage.getItem(GUEST_ID_KEY)
  if (!guestId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guestId)) {
    guestId = crypto.randomUUID()
    localStorage.setItem(GUEST_ID_KEY, guestId)
  }
  return `${GUEST_TOKEN_PREFIX}${guestId}`
}

export function clearAuthToken(): void {
  localStorage.removeItem('janmitra_token')
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(path), { ...options, headers })

  if (response.status === 401) {
    clearAuthToken()
    throw new Error('UNAUTHORIZED')
  }

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}
