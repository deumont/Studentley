import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

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
