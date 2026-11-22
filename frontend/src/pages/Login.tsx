import { useState, type FormEvent } from 'react'
import { Icon } from '../components/ui.tsx'
import { ApiError, login, register } from '../lib/api.ts'

type Mode = 'login' | 'register'

export function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (isRegister) await register({ email, password, name })
      // Logging in stores the token, which swaps this screen for the app.
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t reach the server. Is the backend running?')
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <form className="card auth__card" onSubmit={submit}>
        <div className="brand auth__brand">
          <span className="brand__mark" aria-hidden="true">
            <Icon name="view_week" filled />
          </span>
          BrainDesk
        </div>
        <h1 className="auth__title">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth__lead">
          {isRegister
            ? 'Your notes, sessions and resources, saved in one calm place.'
            : 'Pick up exactly where you left off.'}
        </p>

        {isRegister && (
          <label className="field">
            <span className="label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </label>
        )}
        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            <Icon name="error" />
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={switchMode}>
          {isRegister ? 'Already have an account? Log in' : 'New here? Create an account'}
        </button>
      </form>
    </main>
  )
}
