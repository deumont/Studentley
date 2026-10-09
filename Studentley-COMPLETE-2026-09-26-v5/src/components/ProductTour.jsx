import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Flag, Gauge, Lightbulb, PartyPopper, Swords, Trophy, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const tourSteps = [
  { route: '/app', selector: '.sidebar nav a[href="/app"]', icon: Gauge, eyebrow: 'Your command centre', title: 'Meet your dashboard', text: 'This is your personalized starting point: upcoming work, progress, quick actions and recommendations all meet here.' },
  { route: '/practice', selector: '.practice-tabs button:nth-child(4)', icon: Flag, eyebrow: 'Real exam practice', title: 'Generate complete mock exams', text: 'Create age-appropriate papers and mark schemes from a topic or your own uploaded material.' },
  { route: '/practice', selector: '.practice-tabs button:nth-child(3)', icon: Lightbulb, eyebrow: 'See difficult ideas', title: 'Build visual guides', text: 'Turn a difficult topic into a checked, illustrated explanation with diagrams, graphs and worked examples.' },
  { route: '/rivals', selector: '.rivals-sidebar nav a[href="/rivals"]', icon: Swords, eyebrow: 'Competitive studying', title: 'Enter Studentley Rivals', text: 'Challenge students fairly, play friend battles and turn progress into rank.' },
  { route: '/rivals/party', selector: '.rivals-sidebar nav a[href="/rivals/party"]', icon: PartyPopper, eyebrow: 'AI-hosted game show', title: 'Start a Quiz Show', text: 'Invite friends, hear the AI host, race for buzzers and survive the comeback rounds.' },
  { route: '/leaderboard', selector: '.sidebar nav a[href="/leaderboard"]', icon: Trophy, eyebrow: 'Track the climb', title: 'Explore the leaderboard', text: 'See your Studentley Points, streaks and position while keeping control of your visibility in Settings.' },
]

export default function ProductTour() {
  const { user, profile } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const activeKey = user?.id ? `studentley-product-tour-${user.id}` : ''
  const stepKey = user?.id ? `studentley-product-tour-step-${user.id}` : ''
  const [active, setActive] = useState(() => Boolean(activeKey && localStorage.getItem(activeKey) === 'active'))
  const [index, setIndex] = useState(() => Math.max(0, Math.min(tourSteps.length - 1, Number(stepKey && localStorage.getItem(stepKey)) || 0)))
  const [spotlight, setSpotlight] = useState(null)
  const dialogRef = useRef(null)
  const current = tourSteps[index]

  useEffect(() => {
    const start = () => { setIndex(0); setActive(true); if (activeKey) localStorage.setItem(activeKey, 'active'); if (stepKey) localStorage.setItem(stepKey, '0') }
    window.addEventListener('studentley:start-tutorial', start)
    return () => window.removeEventListener('studentley:start-tutorial', start)
  }, [activeKey, stepKey])

  useEffect(() => {
    if (!active || profile?.onboarding_complete !== true) return undefined
    if (location.pathname !== current.route) navigate(current.route)
    const update = () => {
      const target = document.querySelector(current.selector)
      if (!target) return setSpotlight(null)
      const rect = target.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1 || rect.right < 0 || rect.left > window.innerWidth) return setSpotlight(null)
      setSpotlight({ left: Math.max(8, rect.left - 7), top: Math.max(8, rect.top - 7), width: Math.min(window.innerWidth - 16, rect.width + 14), height: rect.height + 14 })
    }
    const timer = window.setTimeout(update, location.pathname === current.route ? 180 : 1550)
    window.addEventListener('resize', update)
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', update) }
  }, [active, current.route, current.selector, location.pathname, navigate, profile?.onboarding_complete])

  useEffect(() => {
    if (!active || profile?.onboarding_complete !== true) return undefined

    const root = document.getElementById('root')
    const lockedElements = new Map()
    const lockBackground = () => {
      if (!root) return
      Array.from(root.children).forEach(element => {
        if (element.classList.contains('product-tour') || lockedElements.has(element)) return
        lockedElements.set(element, {
          inert: element.hasAttribute('inert'),
          ariaHidden: element.getAttribute('aria-hidden'),
        })
        element.setAttribute('inert', '')
        element.setAttribute('aria-hidden', 'true')
      })
    }

    lockBackground()
    const observer = root ? new MutationObserver(lockBackground) : null
    observer?.observe(root, { childList: true })

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const blockPageMovement = event => event.preventDefault()
    const containKeyboard = event => {
      const dialog = dialogRef.current
      if (!dialog) return
      const controls = Array.from(dialog.querySelectorAll('button:not([disabled])'))

      if (event.key === 'Tab') {
        event.preventDefault()
        if (!controls.length) return
        const currentControl = controls.indexOf(document.activeElement)
        const nextControl = event.shiftKey
          ? (currentControl <= 0 ? controls.length - 1 : currentControl - 1)
          : (currentControl < 0 || currentControl === controls.length - 1 ? 0 : currentControl + 1)
        controls[nextControl].focus()
        return
      }

      if (!dialog.contains(event.target)) {
        event.preventDefault()
        event.stopPropagation()
        controls[0]?.focus()
      }
    }

    window.addEventListener('wheel', blockPageMovement, { capture: true, passive: false })
    window.addEventListener('touchmove', blockPageMovement, { capture: true, passive: false })
    document.addEventListener('keydown', containKeyboard, true)
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector('.product-tour-close')?.focus(), 0)

    return () => {
      observer?.disconnect()
      window.clearTimeout(focusTimer)
      window.removeEventListener('wheel', blockPageMovement, true)
      window.removeEventListener('touchmove', blockPageMovement, true)
      document.removeEventListener('keydown', containKeyboard, true)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      lockedElements.forEach((previous, element) => {
        if (!previous.inert) element.removeAttribute('inert')
        if (previous.ariaHidden === null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', previous.ariaHidden)
      })
    }
  }, [active, profile?.onboarding_complete])

  if (!active || profile?.onboarding_complete !== true) return null
  const Icon = current.icon
  const finish = () => {
    setActive(false); setSpotlight(null)
    if (activeKey) localStorage.setItem(activeKey, 'complete')
    if (stepKey) localStorage.removeItem(stepKey)
  }
  const select = next => {
    const value = Math.max(0, Math.min(tourSteps.length - 1, next))
    setSpotlight(null); setIndex(value)
    if (stepKey) localStorage.setItem(stepKey, String(value))
  }

  return <div className="product-tour">
    {spotlight && <span className="product-tour-spotlight" style={spotlight} />}
    <section ref={dialogRef} className="product-tour-card" role="dialog" aria-modal="true" aria-label="Studentley tutorial">
      <button className="product-tour-close" onClick={finish} aria-label="Close tutorial"><X /></button>
      <span className="product-tour-icon"><Icon /></span>
      <div><small>{current.eyebrow} · {index + 1}/{tourSteps.length}</small><h2>{current.title}</h2><p>{current.text}</p></div>
      <div className="product-tour-dots">{tourSteps.map((_, dot) => <i className={dot <= index ? 'active' : ''} key={dot} />)}</div>
      <footer><button disabled={index === 0} onClick={() => select(index - 1)}><ArrowLeft /> Back</button><button onClick={() => index === tourSteps.length - 1 ? finish() : select(index + 1)}>{index === tourSteps.length - 1 ? 'Finish tour' : 'Next'} <ArrowRight /></button></footer>
    </section>
  </div>
}
