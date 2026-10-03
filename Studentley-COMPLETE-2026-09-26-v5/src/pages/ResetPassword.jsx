import React, { useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Button, ErrorState, Loader } from '../components/UI'

export default function ResetPassword() {
  const { session, authLoading, recoveryMode } = useApp()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  const callbackError = useMemo(() => {
    const search = new URLSearchParams(location.search)
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
    return search.get('error_description') || hash.get('error_description') || ''
  }, [location.search, location.hash])
  const recoveryStored = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('studentley-password-recovery') === '1'
  const recoveryReady = Boolean(session && (recoveryMode || recoveryStored))

  useEffect(() => { document.title = 'Choose a new password — Studentley' }, [])

  const submit = async event => {
    event.preventDefault(); setError('')
    if (password.length < 8) return setError('Use at least 8 characters for your new password.')
    if (password !== confirm) return setError('The passwords do not match.')
    setLoading(true)
    try {
      const { data: current, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !current.session || !recoveryReady) throw new Error('This password reset link is invalid or has expired. Request a new link.')
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      sessionStorage.removeItem('studentley-password-recovery')
      await supabase.auth.signOut()
      setComplete(true)
    } catch (value) { setError(value.message || 'We could not update your password.') }
    finally { setLoading(false) }
  }

  if (authLoading) return <main className="reset-page"><Loader full variant="reset" label="Checking your reset link…" /></main>

  return <main className="reset-page"><Link to="/" className="public-brand reset-brand"><span>S</span><b>Studentley</b></Link><section className="reset-card">
    {complete ? <div className="reset-complete"><span><CheckCircle2 /></span><small>Password updated</small><h1>Your new password is ready.</h1><p>Sign in again using the password you just created.</p><Link className="button full" to="/login">Continue to sign in</Link></div> : <>
      <div className="reset-icon"><KeyRound /></div><small className="reset-kicker">Secure password reset</small><h1>Choose a new password</h1><p className="reset-intro">Create a password you have not used for this account before.</p>
      {callbackError && <ErrorState text={callbackError.replace(/\+/g, ' ')} />}
      {!callbackError && !recoveryReady && <ErrorState text="This password reset link is invalid or has expired. Request a new reset email." />}
      {error && <ErrorState text={error} />}
      {recoveryReady && <form onSubmit={submit} className="reset-form"><label><span>New password</span><div className="password-input"><input required autoFocus type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff /> : <Eye />}</button></div></label><label><span>Confirm new password</span><input required type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Repeat your new password" /></label><div className="password-rules"><span className={password.length >= 8 ? 'valid' : ''}><Check /> At least 8 characters</span><span className={confirm && password === confirm ? 'valid' : ''}><Check /> Passwords match</span></div><Button className="full" loading={loading}>Update password</Button></form>}
      {!recoveryReady && <Link className="button full" to="/auth/forgot">Request a new reset link</Link>}
      <Link className="reset-back" to="/login">Back to sign in</Link>
    </>}
    <footer><ShieldCheck /> Your recovery session is used only to change your password.</footer>
  </section></main>
}
