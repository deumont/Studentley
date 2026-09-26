import React, { useEffect, useRef, useState } from 'react'
import { Bell, Bot, CalendarDays, ChevronDown, FileUp, GraduationCap, Home, Menu, Settings, Sparkles, Trophy, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { markNotificationsRead } from '../lib/data'
import { supabase } from '../lib/supabase'
import { formatDate } from './UI'

const links = [
  ['/app', Home, 'Home'], ['/upload', FileUp, 'Upload Document'], ['/study-plan', CalendarDays, 'Study Plan'],
  ['/practice', GraduationCap, 'Practice & Exams'], ['/ai-tutor', Bot, 'AI Tutor'], ['/leaderboard', Trophy, 'Leaderboard'], ['/settings', Settings, 'Settings'],
]

export default function Layout() {
  const { profile, data, refresh, notify } = useApp()
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
      <nav aria-label="Primary">{links.map(([to, Icon, label]) => <NavLink end={to === '/app'} to={to} key={to} onClick={() => setMobile(false)}><Icon />{label}</NavLink>)}</nav>
      <div className="sidebar-quote"><Sparkles /><p>Small steps every day lead to big results.</p></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu /></button><div className="topbar-space" />
        <div className="notification-wrap"><button className="icon-button" onClick={openNotifications} aria-label={`${unread.length} unread notifications`}><Bell />{unread.length > 0 && <em>{unread.length}</em>}</button>{notifications && <div className="popover notifications"><h3>Notifications</h3>{data?.notifications?.length ? data.notifications.slice(0, 6).map(item => <div className="notification-item" key={item.id}><span className={`notice-dot ${item.kind || 'info'}`} /><div><b>{item.title}</b><p>{item.body}</p><small>{formatDate(item.created_at, { hour: 'numeric', minute: '2-digit' })}</small></div></div>) : <p className="popover-empty">You’re all caught up.</p>}</div>}</div>
        <div className="account-wrap" ref={menuRef}><button className="account-button" onClick={() => setAccount(value => !value)}><span className="avatar">{name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><span><b>{name}</b><small>{profile?.grade_year || 'Student'}</small></span><ChevronDown /></button>{account && <div className="popover account-menu"><button onClick={() => navigate('/settings')}>Profile & settings</button><button onClick={() => navigate('/plans')}>Plans & billing</button><button className="danger-text" onClick={() => supabase.auth.signOut()}>Sign out</button></div>}</div>
      </header>
      <div className="page"><Outlet /></div>
    </main>
  </div>
}
