import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Capture recovery callbacks before Supabase consumes and removes the URL hash.
// Supabase can fall back to the configured Site URL (`/`) when a redirect URL
// is not allowlisted, so the pathname alone is not enough to detect recovery.
const callbackUrl = typeof window !== 'undefined' ? new URL(window.location.href) : null
const callbackHash = callbackUrl ? new URLSearchParams(callbackUrl.hash.replace(/^#/, '')) : null
export const isPasswordRecoveryCallback = Boolean(
  callbackUrl && (callbackUrl.searchParams.get('type') === 'recovery' || callbackHash?.get('type') === 'recovery')
)
if (isPasswordRecoveryCallback && typeof sessionStorage !== 'undefined') {
  sessionStorage.setItem('studentley-password-recovery', '1')
}

export const isConfigured = Boolean(url && key && !url.includes('your-project'))
export const supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export function appUrl(path = '') {
  const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const configuredOrigin = import.meta.env.VITE_APP_URL?.trim()
  // Browser auth callbacks always return to the deployment that initiated the
  // request: localhost in development and the live Vercel origin in production.
  const base = runtimeOrigin || configuredOrigin
  if (!base) throw new Error('The application URL is not configured.')
  return `${base.replace(/\/$/, '')}${path}`
}
