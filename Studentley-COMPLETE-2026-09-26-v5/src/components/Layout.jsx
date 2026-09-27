import React, { useEffect, useRef, useState } from 'react'
import { Bell, Bot, BrainCircuit, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Crown, FileUp, GraduationCap, Home, Menu, Settings, Sparkles, Trophy, X } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { markNotificationsRead } from '../lib/data'
import { supabase } from '../lib/supabase'
import { Button, formatDate, Modal, ProfileAvatar } from './UI'
import BrandWordmark from './BrandWordmark'

const links = [
  ['/app', Home, 'home'], ['/upload', FileUp, 'upload'], ['/study-plan', CalendarDays, 'studyPlan'],
  ['/practice', GraduationCap, 'practice'], ['/leaderboard', Trophy, 'leaderboard'], ['/personalization', BrainCircuit, 'studio', true], ['/settings', Settings, 'settings'],
]

const shellCopy = { home: 'Home', upload: 'Upload Document', studyPlan: 'Study Plan', practice: 'Practice & Exams', leaderboard: 'Leaderboard', studio: 'Studio', settings: 'Settings', quote: 'Small steps every day lead to big results.', notifications: 'Notifications', caughtUp: 'You’re all caught up.', profile: 'Profile & settings', plans: 'Plans & billing', signOut: 'Sign out', proRequired: 'Requires Pro' }

export default function Layout() {
  const { user, profile, data, refresh, notify } = useApp()
  const [mobile, setMobile] = useState(false), [account, setAccount] = useState(false), [notifications, setNotifications] = useState(false)
  const navigate = useNavigate(), menuRef = useRef()
  const name = profile?.display_name || 'Student'
  const copy = shellCopy
  const unread = data?.notifications?.filter(item => !item.read_at) || []
  useEffect(() => { const click = event => !menuRef.current?.contains(event.target) && setAccount(false); document.addEventListener('mousedown', click); return () => document.removeEventListener('mousedown', click) }, [])
  useEffect(() => { document.title = 'Studentley' }, [])
  const openNotifications = async () => { setNotifications(value => !value); if (unread.length) { try { await markNotificationsRead(); await refresh() } catch { notify('Unable to update notifications.', 'error') } } }
  return <div className="app-shell">
    {mobile && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'open' : ''}`}>
      <div className="sidebar-top"><NavLink to="/app" className="brand dashboard-brand" onClick={() => setMobile(false)}><BrandWordmark /></NavLink><button className="close-nav" onClick={() => setMobile(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Primary">{links.map(([to, Icon, label, proOnly]) => <NavLink end={to === '/app'} to={to} key={to} onClick={() => setMobile(false)}><Icon /><span>{copy[label]}</span>{proOnly && profile?.subscription_plan !== 'pro' && <Crown className="nav-plan-crown" aria-label={copy.proRequired} />}</NavLink>)}</nav>
      <div className="sidebar-quote"><Sparkles /><p>{copy.quote}</p></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu /></button><div className="topbar-space" />
        <div className="notification-wrap"><button className="icon-button" onClick={openNotifications} aria-label={`${unread.length} ${copy.notifications}`}><Bell />{unread.length > 0 && <em>{unread.length}</em>}</button>{notifications && <div className="popover notifications"><h3>{copy.notifications}</h3>{data?.notifications?.length ? data.notifications.slice(0, 6).map(item => <div className="notification-item" key={item.id}><span className={`notice-dot ${item.kind || 'info'}`} /><div><b>{item.title}</b><p>{item.body}</p><small>{formatDate(item.created_at, { hour: 'numeric', minute: '2-digit' })}</small></div></div>) : <p className="popover-empty">{copy.caughtUp}</p>}</div>}</div>
        <div className="account-wrap" ref={menuRef}><button className="account-button" onClick={() => setAccount(value => !value)}><ProfileAvatar user={user} name={name} /><span><b>{name}</b><small>{profile?.grade_year || 'Student'}</small></span><ChevronDown /></button>{account && <div className="popover account-menu"><button onClick={() => navigate('/settings')}>{copy.profile}</button><button onClick={() => navigate('/plans')}>{copy.plans}</button><button className="danger-text" onClick={() => supabase.auth.signOut()}>{copy.signOut}</button></div>}</div>
      </header>
      <div className="page"><Outlet /></div>
    </main>
    <FloatingPersonalAIButton />
    <PlanWelcomeTour user={user} profile={profile} />
  </div>
}

function FloatingPersonalAIButton() {
  const navigate = useNavigate(), location = useLocation(), buttonRef = useRef(), drag = useRef(null), ignoreClick = useRef(false)
  const [position, setPosition] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem('studentley-personal-ai-position') || localStorage.getItem('studentley-tutor-position')); return Number.isFinite(value?.x) && Number.isFinite(value?.y) ? value : null } catch { return null }
  })
  const clamp = value => ({ x: Math.max(10, Math.min(value.x, window.innerWidth - 68)), y: Math.max(76, Math.min(value.y, window.innerHeight - 68)) })
  useEffect(() => {
    const resize = () => setPosition(value => value ? clamp(value) : value)
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  if (location.pathname === '/personal-ai') return null
  const pointerDown = event => {
    if (event.button !== 0) return
    const rect = buttonRef.current.getBoundingClientRect()
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, startX: event.clientX, startY: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerMove = event => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) > 4) drag.current.moved = true
    if (drag.current.moved) setPosition(clamp({ x: event.clientX - drag.current.offsetX, y: event.clientY - drag.current.offsetY }))
  }
  const pointerUp = event => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const moved = drag.current.moved
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    ignoreClick.current = moved
    if (moved) {
      setPosition(value => { if (value) localStorage.setItem('studentley-personal-ai-position', JSON.stringify(value)); return value })
      setTimeout(() => { ignoreClick.current = false }, 0)
    }
  }
  const open = () => { if (ignoreClick.current) { ignoreClick.current = false; return } navigate('/personal-ai') }
  return <button ref={buttonRef} className="floating-personal-ai" style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined} onClick={open} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null }} aria-label="Open your personal AI. Drag to reposition." title="Personal AI — drag to move, click to open"><Bot /><span><Sparkles /></span></button>
}

const planTours = {
    plus: [
      { icon: Sparkles, title: 'Welcome to Studentley Plus', text: 'You now have more room to upload, practise and generate learning material each week.' },
      { icon: CalendarDays, title: 'Build a personalized study plan', text: 'Choose up to five documents and Studentley will create an editable week grounded in your material.', route: '/study-plan' },
      { icon: GraduationCap, title: 'Create more practice', text: 'Generate more quizzes, flashcards and full mock-exam PDFs, with a higher personal AI allowance.', route: '/practice' },
    ],
    pro: [
      { icon: Crown, title: 'Welcome to Studentley Pro', text: 'Your highest allowances and the complete personalized Studentley experience are now active.' },
      { icon: BrainCircuit, title: 'Your Studio is unlocked', text: 'Add your learning preferences, goals, school hours, sleep and activities so AI can adapt around your real life.', route: '/personalization' },
      { icon: Bell, title: 'Turn on study reminders', text: 'Pro reminders notify you before planned sessions, while unlimited uploads and practice keep you moving.', route: '/settings' },
    ],
    previous: 'Previous', next: 'Next', explore: 'Explore feature', done: 'Finish tour', step: 'Quick plan tour', close: 'Skip tutorial',
}

function PlanWelcomeTour({ user, profile }) {
  const navigate = useNavigate(), location = useLocation()
  const plan = profile?.subscription_plan
  const copy = planTours
  const slides = copy?.[plan] || []
  const [open, setOpen] = useState(false), [step, setStep] = useState(0)
  const storageKey = user?.id && plan ? `studentley-plan-tour-${user.id}-${plan}` : ''
  useEffect(() => {
    if (!storageKey || !['plus', 'pro'].includes(plan)) { setOpen(false); return }
    const requestedPlan = new URLSearchParams(location.search).get('welcome_plan')
    if (requestedPlan === plan || localStorage.getItem(storageKey) !== 'seen') { setStep(0); setOpen(true) }
  }, [storageKey, plan, location.search])
  if (!open || !slides.length) return null
  const current = slides[step], Icon = current.icon, last = step === slides.length - 1
  const finish = route => {
    localStorage.setItem(storageKey, 'seen')
    setOpen(false)
    const requestedPlan = new URLSearchParams(location.search).get('welcome_plan')
    navigate(route || (requestedPlan ? location.pathname : `${location.pathname}${location.search}`), { replace: Boolean(requestedPlan) })
  }
  return <Modal title={current.title} description={current.text} onClose={() => finish()} wide><div className={`plan-welcome-tour ${plan}`}><span className="plan-tour-icon"><Icon /></span><div className="plan-tour-progress"><small>{copy.step} · {step + 1}/{slides.length}</small><span>{slides.map((_, index) => <i className={index <= step ? 'active' : ''} key={index} />)}</span></div><div className="plan-tour-actions"><Button variant="ghost" disabled={step === 0} onClick={() => setStep(value => value - 1)}><ChevronLeft /> {copy.previous}</Button>{current.route && <Button variant="secondary" onClick={() => finish(current.route)}>{copy.explore}</Button>}<Button variant={plan === 'pro' ? 'violet' : 'primary'} onClick={() => last ? finish('/app') : setStep(value => value + 1)}>{last ? copy.done : copy.next} {!last && <ChevronRight />}</Button></div></div></Modal>
}
