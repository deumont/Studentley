import React, { useEffect, useRef, useState } from 'react'
import { Bell, Bot, BrainCircuit, CalendarDays, ChevronDown, Crown, FileUp, GraduationCap, Home, Menu, Settings, Sparkles, Trophy, X } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { markNotificationsRead } from '../lib/data'
import { supabase } from '../lib/supabase'
import { formatDate, ProfileAvatar } from './UI'

const links = [
  ['/app', Home, 'Home'], ['/upload', FileUp, 'Upload Document'], ['/study-plan', CalendarDays, 'Study Plan'],
  ['/practice', GraduationCap, 'Practice & Exams'], ['/leaderboard', Trophy, 'Leaderboard'], ['/personalization', BrainCircuit, 'Studio', true], ['/settings', Settings, 'Settings'],
]

export default function Layout() {
  const { user, profile, data, refresh, notify } = useApp()
  const [mobile, setMobile] = useState(false), [account, setAccount] = useState(false), [notifications, setNotifications] = useState(false)
  const navigate = useNavigate(), menuRef = useRef()
  const name = profile?.display_name || 'Student'
  const unread = data?.notifications?.filter(item => !item.read_at) || []
  useEffect(() => { const click = event => !menuRef.current?.contains(event.target) && setAccount(false); document.addEventListener('mousedown', click); return () => document.removeEventListener('mousedown', click) }, [])
  useEffect(() => { document.title = 'Studentley' }, [])
  const openNotifications = async () => { setNotifications(value => !value); if (unread.length) { try { await markNotificationsRead(); await refresh() } catch { notify('Unable to update notifications.', 'error') } } }
  return <div className="app-shell">
    {mobile && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'open' : ''}`}>
      <div className="sidebar-top"><NavLink to="/app" className="brand" onClick={() => setMobile(false)}><span>S</span><b>Studentley</b></NavLink><button className="close-nav" onClick={() => setMobile(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Primary">{links.map(([to, Icon, label, proOnly]) => <NavLink end={to === '/app'} to={to} key={to} onClick={() => setMobile(false)}><Icon /><span>{label}</span>{proOnly && profile?.subscription_plan !== 'pro' && <Crown className="nav-plan-crown" aria-label="Requires Pro" />}</NavLink>)}</nav>
      <div className="sidebar-quote"><Sparkles /><p>Small steps every day lead to big results.</p></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu /></button><div className="topbar-space" />
        <div className="notification-wrap"><button className="icon-button" onClick={openNotifications} aria-label={`${unread.length} unread notifications`}><Bell />{unread.length > 0 && <em>{unread.length}</em>}</button>{notifications && <div className="popover notifications"><h3>Notifications</h3>{data?.notifications?.length ? data.notifications.slice(0, 6).map(item => <div className="notification-item" key={item.id}><span className={`notice-dot ${item.kind || 'info'}`} /><div><b>{item.title}</b><p>{item.body}</p><small>{formatDate(item.created_at, { hour: 'numeric', minute: '2-digit' })}</small></div></div>) : <p className="popover-empty">You’re all caught up.</p>}</div>}</div>
        <div className="account-wrap" ref={menuRef}><button className="account-button" onClick={() => setAccount(value => !value)}><ProfileAvatar user={user} name={name} /><span><b>{name}</b><small>{profile?.grade_year || 'Student'}</small></span><ChevronDown /></button>{account && <div className="popover account-menu"><button onClick={() => navigate('/settings')}>Profile & settings</button><button onClick={() => navigate('/plans')}>Plans & billing</button><button className="danger-text" onClick={() => supabase.auth.signOut()}>Sign out</button></div>}</div>
      </header>
      <div className="page"><Outlet /></div>
    </main>
    <FloatingTutorButton />
  </div>
}

function FloatingTutorButton() {
  const navigate = useNavigate(), location = useLocation(), buttonRef = useRef(), drag = useRef(null), ignoreClick = useRef(false)
  const [position, setPosition] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem('studentley-tutor-position')); return Number.isFinite(value?.x) && Number.isFinite(value?.y) ? value : null } catch { return null }
  })
  const clamp = value => ({ x: Math.max(10, Math.min(value.x, window.innerWidth - 68)), y: Math.max(76, Math.min(value.y, window.innerHeight - 68)) })
  useEffect(() => {
    const resize = () => setPosition(value => value ? clamp(value) : value)
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  if (location.pathname === '/ai-tutor') return null
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
      setPosition(value => { if (value) localStorage.setItem('studentley-tutor-position', JSON.stringify(value)); return value })
      setTimeout(() => { ignoreClick.current = false }, 0)
    }
  }
  const open = () => { if (ignoreClick.current) { ignoreClick.current = false; return } navigate('/ai-tutor') }
  return <button ref={buttonRef} className="floating-tutor" style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined} onClick={open} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null }} aria-label="Open AI Tutor. Drag to reposition." title="AI Tutor — drag to move, click to open"><Bot /><span><Sparkles /></span></button>
}
