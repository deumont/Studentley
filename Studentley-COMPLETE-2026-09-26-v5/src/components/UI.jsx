import React, { useEffect, useState } from 'react'
import { AlertCircle, Crown, LoaderCircle, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { profilePictureUrl } from '../lib/data'

export function Button({ variant = 'primary', className = '', loading, children, ...props }) {
  return <button className={`button ${variant} ${className}`} disabled={loading || props.disabled} {...props}>{loading && <LoaderCircle className="spin" size={17} />}{children}</button>
}

export function SkeletonGrid({ count = 6, className = '' }) {
  return <div className={`skeleton-card-grid ${className}`} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <article className="skeleton-card" key={index}>
      <span className="skeleton-block skeleton-icon" />
      <span className="skeleton-block skeleton-line short" />
      <span className="skeleton-block skeleton-line title" />
      <span className="skeleton-block skeleton-line" />
      <span className="skeleton-block skeleton-line medium" />
      <span className="skeleton-block skeleton-button" />
    </article>)}
  </div>
}

export function PageHeading({ eyebrow, title, text, actions }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

export function EmptyState({ icon: Icon = Sparkles, title, text, children, compact = false }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}><span className="icon-bubble blue"><Icon /></span><h3>{title}</h3><p>{text}</p>{children}</div>
}

export function ProfileAvatar({ user, name = 'Student', className = '', path: explicitPath, bucket: explicitBucket }) {
  const path = explicitPath ?? user?.user_metadata?.avatar_path ?? ''
  const bucket = explicitBucket || user?.user_metadata?.avatar_bucket || 'documents'
  const [url, setUrl] = useState('')
  useEffect(() => {
    let current = true
    setUrl('')
    if (path?.startsWith('/') || /^https?:\/\//i.test(path)) setUrl(path)
    else if (path) profilePictureUrl(path, bucket).then(value => current && setUrl(value)).catch(() => {})
    return () => { current = false }
  }, [path, bucket])
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

export function Loader({ full = false, label = 'Loading…', shell = false }) {
  const content = <>
    <span className="skeleton-status-label">{label}</span>
    <div className="skeleton-page" aria-hidden="true">
      <div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div><span className="skeleton-block skeleton-heading-action" /></div>
      <div className="skeleton-stat-row">{Array.from({ length: 3 }, (_, index) => <span className="skeleton-block skeleton-stat" key={index} />)}</div>
      <div className="skeleton-panel-row"><div className="skeleton-panel"><span className="skeleton-block skeleton-panel-title" />{Array.from({ length: 5 }, (_, index) => <span className="skeleton-block skeleton-panel-line" key={index} />)}</div><div className="skeleton-panel"><span className="skeleton-block skeleton-panel-title" />{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block skeleton-panel-line" key={index} />)}</div></div>
    </div>
  </>
  if (shell) return <div className="skeleton-shell-loader full-page" role="status" aria-live="polite"><aside className="skeleton-shell-sidebar" aria-hidden="true"><span className="skeleton-block skeleton-brand" />{Array.from({ length: 7 }, (_, index) => <span className="skeleton-block skeleton-nav-item" key={index} />)}<span className="skeleton-block skeleton-sidebar-note" /></aside><main className="skeleton-shell-main"><header aria-hidden="true"><span className="skeleton-block skeleton-topbar-pill" /><span className="skeleton-block skeleton-topbar-avatar" /></header>{content}</main></div>
  return <div className={`skeleton-loader ${full ? 'full-page' : ''}`} role="status" aria-live="polite">{content}</div>
}
export function ErrorState({ text }) { return <div className="error-state"><AlertCircle /><span>{text}</span></div> }
export function Field({ label, hint, children, className = '' }) { return <label className={`field ${className}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label> }
export function formatDate(value, options = {}) { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...options }).format(new Date(value)) }
export function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening' }
