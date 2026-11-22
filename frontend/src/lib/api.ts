/**
 * Shared client for the FastAPI backend (guide §8.1–8.2).
 *
 * By default every call goes to `/api/...`, which Vite proxies to FastAPI in
 * development (see vite.config.ts), so the browser never makes a cross-origin
 * request. Set VITE_API_URL (e.g. in frontend/.env) to call the backend directly
 * instead; the backend's CORS settings must then allow this site's origin (§8.3).
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'braindesk.access_token'

/** A failed response, carrying FastAPI's `detail` as the message. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Token storage. sessionStorage (not localStorage) so the login ends with the
// browser session, as the guide recommends. Access is guarded because storage
// can throw (private mode, blocked site data).

const listeners = new Set<() => void>()

export function getToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setToken(token: string | null) {
  try {
    if (token === null) window.sessionStorage.removeItem(TOKEN_KEY)
    else window.sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Without storage the user stays logged in only until the page reloads.
  }
  listeners.forEach((notify) => notify())
}

export function clearToken() {
  setToken(null)
}

/** Lets React re-render when the user logs in or out (see useAuth). */
export function subscribeToAuth(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// ---------------------------------------------------------------------------
// Requests

/** FastAPI sends `detail` as a string, or as a list of field errors on 422. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg
  } catch {
    // Not JSON (e.g. the proxy's own error page when the backend is down).
  }
  return res.status >= 500 ? 'The server had a problem. Is the backend running?' : `Request failed (${res.status})`
}

/** JSON request to a protected endpoint, e.g. `apiRequest<ApiTopic[]>('/topics')`. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (res.status === 401) {
    // Every route behind apiRequest is protected, so a 401 here can only mean the token
    // is missing, expired or invalid. Clearing it makes <App> show the login screen;
    // the URL hash is untouched, so the user lands back on the same page after logging in.
    clearToken()
    throw new ApiError(401, 'Your session expired. Please log in again.')
  }

  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  return (res.status === 204 ? undefined : await res.json()) as T
}

// ---------------------------------------------------------------------------
// Auth endpoints

export interface RegisterInput {
  email: string
  password: string
  name: string
  track?: string
}

/** POST /auth/login takes OAuth2 *form* fields, with the email sent as `username`. */
export async function login(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password })
  const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', body })
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))

  const data: { access_token: string } = await res.json()
  setToken(data.access_token)
}

export async function register(input: RegisterInput) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
}

export function logout() {
  clearToken()
}

// ---------------------------------------------------------------------------
// The signed-in user ("who am I?", guide §6.7 — this backend serves it at /users/me)

export interface CurrentUser {
  id: number
  email: string
  name: string
  track: string
  first_name: string
  initials: string
}

export function getMe(signal?: AbortSignal) {
  return apiRequest<CurrentUser>('/users/me', { signal })
}

export function updateMe(patch: { name?: string; track?: string }) {
  return apiRequest<CurrentUser>('/users/me', { method: 'PATCH', body: JSON.stringify(patch) })
}
