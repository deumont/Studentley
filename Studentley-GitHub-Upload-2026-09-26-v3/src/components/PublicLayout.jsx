import React, { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

export default function PublicLayout({ children }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return <div className="public-site">
    <header className="public-nav-wrap">
      <nav className="public-nav" aria-label="Public navigation">
        <Link className="public-brand" to="/" onClick={close}><span>S</span><b>Studentley</b></Link>
        <div className={`public-links ${open ? 'open' : ''}`}>
          <NavLink end to="/" onClick={close}>Home</NavLink>
          <a href="/#features" onClick={close}>Features</a>
          <NavLink to="/plans" onClick={close}>Plans</NavLink>
          <div className="public-mobile-actions"><Link to="/login" onClick={close}>Sign in</Link><Link className="public-cta" to="/signup" onClick={close}>Create account <ArrowRight /></Link></div>
        </div>
        <div className="public-actions"><Link to="/login">Sign in</Link><Link className="public-cta" to="/signup">Create account <ArrowRight /></Link></div>
        <button className="public-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </nav>
    </header>
    {children}
    <footer className="public-footer"><div className="public-container footer-grid"><div><Link className="public-brand light-mark" to="/"><span>S</span><b>Studentley</b></Link><p>A study system designed around the student actually doing the studying.</p></div><div><b>Product</b><a href="/#features">Features</a><Link to="/plans">Plans</Link></div><div><b>Account</b><Link to="/login">Sign in</Link><Link to="/signup">Create account</Link></div><div><b>Legal</b><Link to="/legal/privacy">Privacy</Link><Link to="/legal/terms">Terms</Link></div></div><div className="public-container footer-bottom"><span>© 2026 Studentley</span><span>Student-first. Personal by design.</span></div></footer>
  </div>
}
