import React, { useEffect } from 'react'
import { AlertCircle, LoaderCircle, Sparkles, X } from 'lucide-react'

export function Button({ variant = 'primary', className = '', loading, children, ...props }) {
  return <button className={`button ${variant} ${className}`} disabled={loading || props.disabled} {...props}>{loading && <LoaderCircle className="spin" size={17} />}{children}</button>
}

export function PageHeading({ eyebrow, title, text, actions }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

export function EmptyState({ icon: Icon = Sparkles, title, text, children, compact = false }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}><span className="icon-bubble blue"><Icon /></span><h3>{title}</h3><p>{text}</p>{children}</div>
}

export function Modal({ title, description, onClose, children, wide = false }) {
  useEffect(() => { const close = e => e.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close"><X /></button><h2 id="modal-title">{title}</h2>{description && <p className="muted">{description}</p>}{children}</section></div>
}

export function AiUnavailable({ onClose }) {
  return <Modal title="Ready for the next step" description="The experience is built, but AI integration is not enabled yet." onClose={onClose}><div className="ai-message"><span className="icon-bubble violet"><Sparkles /></span><div><strong>Your data stays untouched</strong><p>No result has been invented or generated. This action will become available when the secure server-side AI service is connected.</p></div></div><Button className="full" onClick={onClose}>Got it</Button></Modal>
}

export function Loader({ full = false, label = 'Loading…' }) { return <div className={`loader ${full ? 'full-page' : ''}`}><LoaderCircle className="spin" /><span>{label}</span></div> }
export function ErrorState({ text }) { return <div className="error-state"><AlertCircle /><span>{text}</span></div> }
export function Field({ label, hint, children, className = '' }) { return <label className={`field ${className}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label> }
export function formatDate(value, options = {}) { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...options }).format(new Date(value)) }
export function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening' }
