import React, { useEffect, useRef, useState } from 'react'

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
// OAuth web client IDs are public browser identifiers, not credentials. The
// environment value makes project changes easy; this fallback is Studentley's
// existing Google web client and contains no secret.
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  || '88249820561-ci6g0n9590rucprmin6cvk2mjc6kmagm.apps.googleusercontent.com'
let googleScriptPromise = null
let googleNoncePromise = null
let initializedClientId = null
let activeCredentialHandler = null

function createNoncePair() {
  if (googleNoncePromise) return googleNoncePromise
  googleNoncePromise = (async () => {
    const random = crypto.getRandomValues(new Uint8Array(32))
    const nonce = btoa(String.fromCharCode(...random))
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
    const hashedNonce = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    return { nonce, hashedNonce }
  })()
  return googleNoncePromise
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const finish = () => window.google?.accounts?.id
      ? resolve(window.google)
      : reject(new Error('Google Identity Services did not load correctly.'))
    const fail = () => reject(new Error('Google sign-in could not be loaded. Check your connection and try again.'))
    const existing = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`)

    if (existing) {
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', fail, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_IDENTITY_SCRIPT
    script.async = true
    script.defer = true
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', fail, { once: true })
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

export default function GoogleIdentityButton({ disabled = false, onCredential, onError }) {
  const buttonRef = useRef(null)
  const credentialRef = useRef(onCredential)
  const errorRef = useRef(onError)
  const [ready, setReady] = useState(false)
  const clientId = GOOGLE_WEB_CLIENT_ID

  useEffect(() => { credentialRef.current = onCredential }, [onCredential])
  useEffect(() => { errorRef.current = onError }, [onError])

  useEffect(() => {
    let cancelled = false
    let nonce = ''
    const target = buttonRef.current
    const receiveCredential = response => {
      if (!response?.credential) {
        errorRef.current?.(new Error('Google did not return a valid sign-in credential.'))
        return
      }
      credentialRef.current?.(response.credential, nonce)
    }
    activeCredentialHandler = receiveCredential

    Promise.all([loadGoogleIdentityServices(), createNoncePair()]).then(([google, noncePair]) => {
      if (cancelled || !target) return
      nonce = noncePair.nonce
      if (initializedClientId && initializedClientId !== clientId) {
        throw new Error('Google sign-in is configured with conflicting client IDs.')
      }
      if (!initializedClientId) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: response => activeCredentialHandler?.(response),
          nonce: noncePair.hashedNonce,
          ux_mode: 'popup',
          auto_select: false,
          itp_support: true,
          use_fedcm_for_button: true,
        })
        initializedClientId = clientId
      }

      target.replaceChildren()
      const width = Math.max(240, Math.min(400, Math.floor(target.getBoundingClientRect().width || 400)))
      google.accounts.id.renderButton(target, {
        type: 'standard',
        theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        width,
      })
      if (!cancelled) setReady(true)
    }).catch(error => {
      if (!cancelled) errorRef.current?.(error)
    })

    return () => {
      cancelled = true
      if (activeCredentialHandler === receiveCredential) activeCredentialHandler = null
      target?.replaceChildren()
    }
  }, [clientId])

  return <div className={`google-identity-wrap${ready ? ' ready' : ''}${disabled ? ' disabled' : ''}`} aria-busy={!ready || disabled}>
    {!ready && <div className="google-identity-placeholder"><span className="google-mark">G</span><span>Loading Google sign-in…</span></div>}
    <div ref={buttonRef} className="google-identity-button" />
  </div>
}
