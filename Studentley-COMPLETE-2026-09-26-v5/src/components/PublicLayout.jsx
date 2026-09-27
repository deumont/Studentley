import React, { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import BrandWordmark from './BrandWordmark'

export default function PublicLayout({ children }) {
  const [open, setOpen] = useState(false)
  const { session } = useApp()
  const close = () => setOpen(false)
  return <div className="public-site">
    <header className="public-nav-wrap">
      <nav className="public-nav" aria-label="Public navigation">
        <Link className="public-brand" to="/" onClick={close}><BrandWordmark variant="light" /></Link>
        <div className={`public-links ${open ? 'open' : ''}`}>
          <NavLink end to="/" onClick={close}>Home</NavLink>
          <NavLink to="/features" onClick={close}>Features</NavLink>
          <NavLink to="/plans" onClick={close}>Plans</NavLink>
          <div className="public-mobile-actions">{session ? <Link className="public-cta public-dashboard-link" to="/app" onClick={close}>Dashboard <ArrowRight /></Link> : <><Link to="/login" onClick={close}>Sign in</Link><Link className="public-cta" to="/signup" onClick={close}>Create account <ArrowRight /></Link></>}</div>
        </div>
        <div className="public-actions">{session ? <Link className="public-cta" to="/app">Dashboard <ArrowRight /></Link> : <><Link to="/login">Sign in</Link><Link className="public-cta" to="/signup">Create account <ArrowRight /></Link></>}</div>
        <button className="public-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </nav>
    </header>
    {children}
    <footer className="public-footer"><div className="public-container footer-grid"><div><Link className="public-brand light-mark" to="/"><BrandWordmark variant="dark" /></Link><p>A study system designed around the student actually doing the studying.</p></div><div><b>Product</b><Link to="/features">Features</Link><Link to="/plans">Plans</Link></div><div><b>Account</b><Link to="/login">Sign in</Link><Link to="/signup">Create account</Link></div><div><b>Legal</b><Link to="/legal/privacy">Privacy Policy</Link><Link to="/legal/terms">Terms & Conditions</Link><Link to="/legal/imprint">Legal Notice</Link></div></div><div className="public-container footer-bottom"><span>© 2026 Studentley</span><span>Student-first. Personal by design.</span></div></footer>
  </div>
}
