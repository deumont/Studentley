import React, { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, CalendarCheck, CheckCircle2, Eye, EyeOff, FileText, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { appUrl, supabase } from '../lib/supabase'
import { Button, ErrorState, Field } from '../components/UI'

const benefits = [
  [CalendarCheck, 'Plan around your real week'], [FileText, 'Keep school material organised'], [BookOpen, 'Practice from your own notes'],
]

export default function Auth() {
  const { configured, session, profile, notify, authLoading } = useApp()
  const path = useLocation().pathname
  const navigate = useNavigate()
  const [mode, setMode] = useState(path === '/signup' || path.includes('create') ? 'signup' : path.includes('forgot') ? 'forgot' : path.includes('reset') ? 'reset' : path.includes('verify') ? 'verify' : 'signin')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', dob: '', school: '', terms: false })
  const [show, setShow] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState('')
  useEffect(() => { if (path === '/signup' || path.includes('create')) setMode('signup'); else if (path.includes('forgot')) setMode('forgot'); else if (path.includes('reset')) setMode('reset'); else if (path.includes('verify')) setMode('verify'); else setMode('signin') }, [path])
  useEffect(() => { document.title = `${mode === 'signup' ? 'Create account' : mode === 'signin' ? 'Sign in' : mode === 'forgot' || mode === 'recovery-sent' ? 'Reset password' : mode === 'reset' ? 'Choose a new password' : 'Verify your email'} — Studentley` }, [mode])
  if (session && mode !== 'reset') {
    const onboardingRequired = profile?.onboarding_complete !== true
    return <Navigate to={onboardingRequired ? '/onboarding' : '/app'} replace />
  }

  const changeMode = next => { setMode(next); setError(''); navigate(next === 'signin' ? '/login' : next === 'signup' ? '/signup' : `/auth/${next}`) }
  const submit = async event => {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      if (!configured) throw new Error('Connect Supabase to enable secure account creation and sign-in.')
      if (mode === 'signup') {
        if (form.password.length < 8) throw new Error('Use at least 8 characters for your password.')
        if (form.password !== form.confirm) throw new Error('The passwords do not match.')
        if (!form.terms) throw new Error('Please accept the Terms and Privacy Policy.')
        const { error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { emailRedirectTo: appUrl('/onboarding'), data: { display_name: form.email.split('@')[0], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, onboarding_required: true } } })
        if (authError) throw authError
        setMode('verify'); navigate('/auth/verify')
      } else if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (authError) throw authError
      } else if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: appUrl('/reset-password') })
        if (authError) throw authError
        notify('Password reset email sent.'); setMode('recovery-sent')
      } else if (mode === 'reset') {
        if (form.password.length < 8 || form.password !== form.confirm) throw new Error('Use matching passwords with at least 8 characters.')
        const { data: current, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !current.session) throw new Error('This password reset link is invalid or has expired. Request a new link and try again.')
        const { error: authError } = await supabase.auth.updateUser({ password: form.password })
        if (authError) throw authError
        notify('Password updated.'); navigate('/app')
      }
    } catch (value) { setError(value.message || 'Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  const signInWithGoogle = async () => {
    setLoading(true); setError('')
    try {
      if (!configured) throw new Error('Connect Supabase to enable Google sign-in.')
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: appUrl('/onboarding'), queryParams: { prompt: 'select_account' } } })
      if (authError) throw authError
    } catch (value) { setError(value.message || 'Google sign-in could not be started.'); setLoading(false) }
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Welcome back'
  const subtitle = mode === 'signup' ? 'Start with a clean workspace shaped around your school life.' : mode === 'forgot' ? 'We’ll email you a secure reset link.' : mode === 'reset' ? 'Use at least eight characters.' : 'Sign in to continue where you left off.'
  return <main className="auth-page"><section className="auth-story"><Link to="/" className="brand light"><span>S</span><b>Studentley</b></Link><div className="auth-story-content"><span className="eyebrow light">Your school life, in one calm place</span><h1>Make every study session count.</h1><p>Build a personal system from your subjects, schedule, exams and material—never from made-up data.</p><div className="benefits">{benefits.map(([Icon, text]) => <div key={text}><span><Icon /></span>{text}</div>)}</div></div><p className="privacy-note"><ShieldCheck /> Private by design. Your school data belongs to you.</p></section>
    <section className="auth-panel"><div className="auth-card">
      {mode === 'verify' ? <Verification email={form.email} configured={configured} back={() => changeMode('signin')} /> : mode === 'recovery-sent' ? <RecoverySent email={form.email} back={() => changeMode('signin')} /> : <>
        {(mode === 'forgot' || mode === 'reset') && <button className="back-link" onClick={() => changeMode('signin')}><ArrowLeft /> Back to sign in</button>}
        <Link to="/" className="mobile-brand"><span>S</span>Studentley</Link><h2>{title}</h2><p className="muted">{subtitle}</p>
        {error && <ErrorState text={error} />}
        {mode === 'reset' && !authLoading && !session && <ErrorState text="This password reset link is invalid or has expired. Request a new reset link." />}
        {(mode === 'signin' || mode === 'signup') && <><button type="button" className="google-auth-button" disabled={loading} onClick={signInWithGoogle}><span>G</span> Continue with Google</button><div className="auth-divider"><span>or continue with email</span></div></>}
        <form onSubmit={submit}>
          {mode !== 'reset' && <Field label="Email"><input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></Field>}
          {mode !== 'forgot' && <Field label={mode === 'reset' ? 'New password' : 'Password'}><div className="password-input"><input required type={show ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff /> : <Eye />}</button></div></Field>}
          {(mode === 'signup' || mode === 'reset') && <Field label="Confirm password"><input required type="password" autoComplete="new-password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} /></Field>}
          {mode === 'signin' && <button type="button" className="forgot-link" onClick={() => changeMode('forgot')}>Forgot password?</button>}
          {mode === 'signup' && <label className="check-row"><input type="checkbox" checked={form.terms} onChange={e => setForm({ ...form, terms: e.target.checked })} /><span>I agree to the <a href="/legal/terms">Terms</a> and <a href="/legal/privacy">Privacy Policy</a>.</span></label>}
          <Button type="submit" className="full auth-submit" loading={loading}>{mode === 'signup' ? 'Create account' : mode === 'signin' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</Button>
        </form>
        {(mode === 'signin' || mode === 'signup') && <p className="auth-switch">{mode === 'signin' ? 'New to Studentley?' : 'Already have an account?'} <button onClick={() => changeMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create account' : 'Sign in'}</button></p>}
      </>}
    </div></section>
  </main>
}

function Verification({ email, configured, back }) {
  const [sent, setSent] = useState(false), [error, setError] = useState('')
  const resend = async () => { if (!email) { setError('Return to create account and enter your email again.'); return } const { error: value } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: appUrl('/auth/verify') } }); if (value) setError(value.message); else setSent(true) }
  return <div className="verification"><span className="verify-icon"><CheckCircle2 /></span><span className="eyebrow">Check your inbox</span><h2>Verify your email</h2><p>We sent a secure verification link{email ? <> to <b>{email}</b></> : ''}. Open it to continue to your personal setup.</p>{!configured && <ErrorState text="Supabase must be configured before verification emails can be sent." />}{error && <ErrorState text={error} />}{sent && <p className="success-note">A new verification email is on its way.</p>}<Button className="full" onClick={back}>Return to sign in</Button><button className="text-button" onClick={resend}>Resend verification email</button></div>
}

function RecoverySent({ email, back }) {
  const [sent, setSent] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const resend = async () => {
    setLoading(true); setError('')
    try {
      const { error: value } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl('/reset-password') })
      if (value) setError(value.message); else setSent(true)
    } catch (value) { setError(value.message || 'Unable to resend the reset email.') }
    finally { setLoading(false) }
  }
  return <div className="verification"><span className="verify-icon"><CheckCircle2 /></span><span className="eyebrow">Check your inbox</span><h2>Open your reset link</h2><p>We sent a password reset link to <b>{email}</b>. Open it to choose a new password.</p>{error && <ErrorState text={error} />}{sent && <p className="success-note">A new password reset email is on its way.</p>}<Button className="full" loading={loading} onClick={resend}>Resend reset email</Button><button className="text-button" onClick={back}>Return to sign in</button></div>
}
