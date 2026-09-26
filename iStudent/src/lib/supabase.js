import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key && !url.includes('your-project'))
export const supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

function isLocalUrl(value) {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(value).hostname)
  } catch {
    return false
  }
}

export function appUrl(path = '') {
  const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const configuredOrigin = import.meta.env.VITE_APP_URL?.trim()
  // Localhost is valid only while running Vite locally. In production, ignore
  // a stale localhost setting and use the live deployment origin instead.
  const base = import.meta.env.DEV
    ? runtimeOrigin || configuredOrigin
    : configuredOrigin && !isLocalUrl(configuredOrigin) ? configuredOrigin : runtimeOrigin
  if (!base) throw new Error('The application URL is not configured.')
  return `${base.replace(/\/$/, '')}${path}`
}
