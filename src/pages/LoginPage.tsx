import type { FormEvent } from 'react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export const LoginPage = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      console.error(err)
      setError('Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div>
          <h1>Welcome to OpsDash</h1>
          <p className="auth-subtitle">Sign in to access your operations dashboard.</p>
        </div>
        {error && <div className="alert error">{error}</div>}

        <div>
          <p>
            <strong>Demo credentials (for demonstration only):</strong>
          </p>
          <p>
            Email: <code>user0001@opsdash.local</code>
            <br />
            Password: <code>Password123!</code>
          </p>
        </div>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p className="auth-meta">Use your OpsDash account credentials to continue.</p>
      </form>
    </div>
  )
}

