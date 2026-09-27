import React, { useEffect, useState } from 'react'
import { AlertCircle, Crown, LoaderCircle, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { profilePictureUrl } from '../lib/data'

export function Button({ variant = 'primary', className = '', loading, children, ...props }) {
  return <button className={`button ${variant} ${className}`} disabled={loading || props.disabled} {...props}>{loading && <LoaderCircle className="spin" size={17} />}{children}</button>
}

export function PageHeading({ eyebrow, title, text, actions }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

export function EmptyState({ icon: Icon = Sparkles, title, text, children, compact = false }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}><span className="icon-bubble blue"><Icon /></span><h3>{title}</h3><p>{text}</p>{children}</div>
}

export function ProfileAvatar({ user, name = 'Student', className = '' }) {
  const path = user?.user_metadata?.avatar_path || ''
  const [url, setUrl] = useState('')
  useEffect(() => {
    let current = true
    setUrl('')
    if (path) profilePictureUrl(path).then(value => current && setUrl(value)).catch(() => {})
    return () => { current = false }
  }, [path])
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S'
  return <span className={`avatar ${url ? 'has-image' : ''} ${className}`}>{url ? <img src={url} alt={`${name}'s profile`} /> : initials}</span>
}

export function Modal({ title, description, onClose, children, wide = false }) {
  useEffect(() => { const close = e => e.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close"><X /></button><h2 id="modal-title">{title}</h2>{description && <p className="muted">{description}</p>}{children}</section></div>
}

export function UpgradeModal({ feature, plan = 'Plus', onClose }) {
  return <Modal title={`${feature} is included with ${plan}`} description="Your free workspace stays fully usable. Upgrade only when the extra personalization is useful to you." onClose={onClose}><div className="upgrade-message"><span className="icon-bubble violet"><Crown /></span><div><strong>Unlock {feature.toLowerCase()}</strong><p>See exactly what each plan includes before making a decision.</p></div></div><Link className="button violet full" to="/plans">View plans</Link></Modal>
}

export function Loader({ full = false, label = 'Loading…' }) { return <div className={`loader ${full ? 'full-page' : ''}`}><LoaderCircle className="spin" /><span>{label}</span></div> }
export function ErrorState({ text }) { return <div className="error-state"><AlertCircle /><span>{text}</span></div> }
export function Field({ label, hint, children, className = '' }) { return <label className={`field ${className}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label> }
export function formatDate(value, options = {}) { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...options }).format(new Date(value)) }
export function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening' }
