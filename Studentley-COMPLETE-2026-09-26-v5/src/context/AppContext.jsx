import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWorkspace, createRecord, updateRecord, removeRecord } from '../lib/data'
import { isConfigured, isPasswordRecoveryCallback, supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)
  const [theme, setTheme] = useState(localStorage.getItem('istudent-theme') || 'system')
  const profile = data?.profiles?.[0]

  useEffect(() => {
    if (!isConfigured) { setAuthLoading(false); return }
    supabase.auth.getSession().then(({ data: value }) => {
      setSession(value.session); setAuthLoading(false)
      if (isPasswordRecoveryCallback) { setRecoveryMode(true); navigate('/reset-password', { replace: true }) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next); setAuthLoading(false)
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('studentley-password-recovery', '1')
        setRecoveryMode(true); navigate('/reset-password', { replace: true })
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [navigate])

  const refresh = useCallback(async () => {
    if (!session) { setData(null); return }
    setLoading(true)
    try { setData(await loadWorkspace()) }
    catch (error) { setNotice({ type: 'error', text: error.message || 'Unable to load your workspace.' }) }
    finally { setLoading(false) }
  }, [session])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    localStorage.setItem('istudent-theme', theme)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.dataset.theme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  }, [theme])
  useEffect(() => { if (profile?.theme_preference && profile.theme_preference !== theme) setTheme(profile.theme_preference) }, [profile?.theme_preference])
  useEffect(() => { document.documentElement.lang = profile?.preferred_language === 'de' ? 'de' : 'en' }, [profile?.preferred_language])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4200)
    return () => clearTimeout(timer)
  }, [notice])

  const mutate = useCallback(async (action, table, payload, changes) => {
    try {
      const result = action === 'create' ? await createRecord(table, payload) : action === 'update' ? await updateRecord(table, payload, changes) : await removeRecord(table, payload)
      await refresh()
      return result
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Unable to save changes.' })
      throw error
    }
  }, [refresh])

  const value = useMemo(() => ({
    configured: isConfigured, session, user: session?.user, authLoading, recoveryMode, data, profile, loading,
    refresh, create: (table, payload) => mutate('create', table, payload),
    update: (table, id, changes) => mutate('update', table, id, changes),
    remove: (table, id) => mutate('remove', table, id),
    notice, notify: (text, type = 'success') => setNotice({ text, type }), theme, setTheme,
  }), [session, authLoading, recoveryMode, data, profile, loading, refresh, mutate, notice, theme])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() { return useContext(AppContext) }
