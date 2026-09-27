import React, { useEffect, useState } from 'react'
import { ArrowLeft, Gauge, Library, Menu, Settings, Shield, Swords, Trophy, Users, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import BrandWordmark from './BrandWordmark'
import { ProfileAvatar } from './UI'
import { useApp } from '../context/AppContext'

const links = [
  ['/rivals', Gauge, 'Overview', true],
  ['/rivals/ranked', Trophy, 'Ranked', false],
  ['/rivals/friends', Users, 'Friend Battles', false],
  ['/rivals/quizzes', Library, 'Quiz Library', false],
]

export default function RivalsLayout() {
  const { user, profile } = useApp()
  const location = useLocation()
  const [mobile, setMobile] = useState(false)
  useEffect(() => { document.title = 'Studentley Rivals' }, [])
  useEffect(() => { setMobile(false) }, [location.pathname])
  const name = profile?.display_name || 'Student'
  return <div className="rivals-shell">
    {mobile && <button className="rivals-scrim" onClick={() => setMobile(false)} aria-label="Close Rivals navigation" />}
    <aside className={`rivals-sidebar ${mobile ? 'open' : ''}`}>
      <div className="rivals-brand-row"><NavLink to="/rivals" className="rivals-brand"><BrandWordmark /><span><Swords /> Rivals</span></NavLink><button className="rivals-close" onClick={() => setMobile(false)} aria-label="Close navigation"><X /></button></div>
      <div className="rivals-season"><Shield /><span><small>Competitive study</small><b>Season One</b></span></div>
      <nav aria-label="Rivals navigation">{links.map(([to, Icon, label, end]) => <NavLink end={end} to={to} key={to}><Icon /><span>{label}</span></NavLink>)}</nav>
      <div className="rivals-sidebar-bottom"><NavLink to="/settings"><Settings /> Settings</NavLink><NavLink to="/app" className="rivals-return"><ArrowLeft /> Studentley dashboard</NavLink></div>
    </aside>
    <main className="rivals-main">
      <header className="rivals-topbar"><button className="rivals-mobile-menu" onClick={() => setMobile(true)} aria-label="Open Rivals navigation"><Menu /></button><div><span>Studentley</span><b>Rivals</b></div><div className="rivals-top-status"><span className="rivals-live-dot" /> Competitive mode</div><ProfileAvatar user={user} name={name} /></header>
      <div className="rivals-page"><Outlet /></div>
    </main>
  </div>
}
