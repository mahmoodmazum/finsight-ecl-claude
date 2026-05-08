import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { login } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import { COLORS, STYLES } from '../../styles/design-system'

export function Login() {
  const navigate   = useNavigate()
  const setTokens  = useAuthStore((s) => s.setTokens)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token, data.user)
      navigate('/dashboard')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg || 'Login failed. Check your credentials.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Email and password are required.'); return }
    mutate()
  }

  return (
    <div style={{
      minHeight:       '100vh',
      background:      COLORS.bg,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         16,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <img src="/finsight-logo.svg" alt="FinSight ECL" style={{ height: 40, width: 'auto' }} />
        </div>

        <div style={{
          background:   '#FFFFFF',
          borderRadius: 12,
          boxShadow:    '0 4px 24px rgba(79,123,232,0.12)',
          padding:      40,
        }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>
              Sign in to FinSight ECL
            </h1>
            <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
              IFRS 9 Expected Credit Loss Platform
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ificbank.com.bd"
                style={STYLES.input}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={STYLES.input}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{
                ...STYLES.btnPrimary,
                width:   '100%',
                padding: '12px',
                marginTop: 4,
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg style={{ animation: 'spin 1s linear infinite', height: 16, width: 16 }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: COLORS.textMuted }}>
            IFIC Bank Bangladesh · IFRS 9 Compliant
          </p>
        </div>

        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: COLORS.textMuted }}>
          FinSight ECL v1.0.0 · Secure Authentication
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
