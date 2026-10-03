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

const SkeletonLines = ({ count = 4 }) => <>{Array.from({ length: count }, (_, index) => <span className="skeleton-block skeleton-panel-line" key={index} />)}</>

function SkeletonContent({ variant }) {
  if (variant === 'dashboard') return <div className="skeleton-page skeleton-dashboard" aria-hidden="true"><div className="skeleton-dashboard-greeting"><span className="skeleton-block skeleton-greeting-copy" /></div><div className="skeleton-dashboard-metrics">{Array.from({ length: 3 }, (_, index) => <span className="skeleton-block" key={index} />)}</div><div className="skeleton-dashboard-cards">{Array.from({ length: 3 }, (_, index) => <div className="skeleton-panel" key={index}><span className="skeleton-block skeleton-panel-title" /><SkeletonLines count={index === 2 ? 4 : 5} /></div>)}</div></div>
  if (variant === 'leaderboard') return <div className="skeleton-page skeleton-leaderboard" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div></div><div className="skeleton-podium">{Array.from({ length: 3 }, (_, index) => <div className={`skeleton-podium-place place-${index + 1}`} key={index}><span className="skeleton-block skeleton-podium-avatar" /><span className="skeleton-block skeleton-line title" /><span className="skeleton-block skeleton-line short" /></div>)}</div><div className="skeleton-leader-list"><SkeletonLines count={7} /></div></div>
  if (variant === 'rivals') return <div className="skeleton-page skeleton-rivals" aria-hidden="true"><div className="skeleton-rivals-hero"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /><span className="skeleton-block skeleton-heading-action" /></div><span className="skeleton-block skeleton-rank-orb" /></div><div className="skeleton-rivals-stats">{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block" key={index} />)}</div><div className="skeleton-panel-row"><div className="skeleton-panel"><span className="skeleton-block skeleton-panel-title" /><SkeletonLines count={4} /></div><div className="skeleton-panel"><span className="skeleton-block skeleton-panel-title" /><SkeletonLines count={6} /></div></div></div>
  if (variant === 'ranked') return <div className="skeleton-page skeleton-ranked" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div><span className="skeleton-block skeleton-rules" /></div><div className="skeleton-ranked-form"><span className="skeleton-block skeleton-panel-title" /><div>{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block skeleton-field" key={index} />)}</div><span className="skeleton-block skeleton-wide-button" /></div><div className="skeleton-rank-road">{Array.from({ length: 6 }, (_, index) => <span className="skeleton-block" key={index} />)}</div></div>
  if (variant === 'friends') return <div className="skeleton-page skeleton-friends" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div></div><div className="skeleton-tabs"><span className="skeleton-block" /><span className="skeleton-block" /></div><div className="skeleton-ranked-form"><span className="skeleton-block skeleton-panel-title" /><div>{Array.from({ length: 6 }, (_, index) => <span className="skeleton-block skeleton-field" key={index} />)}</div><span className="skeleton-block skeleton-wide-button" /></div></div>
  if (variant === 'party') return <div className="skeleton-page skeleton-party-home" aria-hidden="true"><div className="skeleton-party-hero"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div><span className="skeleton-block skeleton-rank-orb" /></div><div className="skeleton-rivals-stats">{Array.from({ length: 3 }, (_, index) => <span className="skeleton-block" key={index} />)}</div><div className="skeleton-tabs"><span className="skeleton-block" /><span className="skeleton-block" /></div><div className="skeleton-ranked-form"><span className="skeleton-block skeleton-panel-title" /><div>{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block skeleton-field" key={index} />)}</div><span className="skeleton-block skeleton-wide-button" /></div></div>
  if (variant === 'library') return <div className="skeleton-page skeleton-library" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div><span className="skeleton-block skeleton-heading-action" /></div><span className="skeleton-block skeleton-searchbar" /><SkeletonGrid /></div>
  if (variant === 'arena') return <div className="skeleton-page skeleton-arena" aria-hidden="true"><div className="skeleton-arena-header"><span className="skeleton-block" /><span className="skeleton-block" /><span className="skeleton-block" /></div><span className="skeleton-block skeleton-progress" /><div className="skeleton-arena-body"><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-question" /><div>{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block skeleton-option" key={index} />)}</div></div></div>
  if (variant === 'quiz-show') return <div className="skeleton-page skeleton-quiz-show" aria-hidden="true"><div className="skeleton-quiz-top"><span className="skeleton-block" /><span className="skeleton-block" /><span className="skeleton-block" /></div><span className="skeleton-block skeleton-host-line" /><div className="skeleton-show-stage"><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-question" /><div>{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block skeleton-option" key={index} />)}</div></div></div>
  if (variant === 'documents') return <div className="skeleton-page skeleton-documents" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div><span className="skeleton-block skeleton-heading-action" /></div><div className="skeleton-upload-zone"><span className="skeleton-block skeleton-icon" /><span className="skeleton-block skeleton-line title" /><span className="skeleton-block skeleton-line medium" /></div><div className="skeleton-document-list"><SkeletonLines count={5} /></div></div>
  if (variant === 'planner') return <div className="skeleton-page skeleton-planner" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /></div><span className="skeleton-block skeleton-heading-action" /></div><div className="skeleton-week">{Array.from({ length: 7 }, (_, index) => <div key={index}><span className="skeleton-block skeleton-line short" /><span className="skeleton-block skeleton-session" /><span className="skeleton-block skeleton-session small" /></div>)}</div></div>
  if (variant === 'practice') return <div className="skeleton-page skeleton-practice" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div></div><div className="skeleton-tabs">{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block" key={index} />)}</div><SkeletonGrid count={3} /></div>
  if (variant === 'settings') return <div className="skeleton-page skeleton-settings" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /></div></div><div className="skeleton-settings-grid"><div className="skeleton-panel"><span className="skeleton-block skeleton-podium-avatar" /><SkeletonLines count={5} /></div><div className="skeleton-panel"><span className="skeleton-block skeleton-panel-title" /><SkeletonLines count={6} /></div></div></div>
  if (variant === 'ai') return <div className="skeleton-page skeleton-ai" aria-hidden="true"><div className="skeleton-ai-header"><span className="skeleton-block skeleton-icon" /><div><span className="skeleton-block skeleton-line title" /><span className="skeleton-block skeleton-line medium" /></div></div><div className="skeleton-chat"><span className="skeleton-block skeleton-message left" /><span className="skeleton-block skeleton-message right" /><span className="skeleton-block skeleton-message left short" /></div><span className="skeleton-block skeleton-chat-input" /></div>
  if (variant === 'onboarding' || variant === 'reset') return <div className={`skeleton-page skeleton-centered skeleton-${variant}`} aria-hidden="true"><span className="skeleton-block skeleton-brand" /><div className="skeleton-centered-card"><span className="skeleton-block skeleton-podium-avatar" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /><SkeletonLines count={4} /><span className="skeleton-block skeleton-wide-button" /></div></div>
  return <div className="skeleton-page" aria-hidden="true"><div className="skeleton-heading-row"><div><span className="skeleton-block skeleton-kicker" /><span className="skeleton-block skeleton-page-title" /><span className="skeleton-block skeleton-page-copy" /></div><span className="skeleton-block skeleton-heading-action" /></div><div className="skeleton-stat-row">{Array.from({ length: 3 }, (_, index) => <span className="skeleton-block skeleton-stat" key={index} />)}</div><div className="skeleton-panel-row"><div className="skeleton-panel"><span className="skeleton-block skeleton-panel-title" /><SkeletonLines count={5} /></div><div className="skeleton-panel"><span className="skeleton-block skeleton-panel-title" /><SkeletonLines count={4} /></div></div></div>
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

export function LeaderboardPodium({ entries = [], tone = 'league' }) {
  return <div className={`leaderboard-podium ${tone}`}>
    <span className="podium-orbit orbit-one" aria-hidden="true" /><span className="podium-orbit orbit-two" aria-hidden="true" />
    {entries.slice(0, 3).map((entry, index) => {
      const position = Number(entry.position || index + 1)
      const PlanIcon = entry.badge === 'pro' ? Crown : Sparkles
      return <article className={`podium-contender place-${position} ${entry.isCurrent ? 'current' : ''}`} key={entry.id || `${position}-${entry.name}`}>
        <div className="podium-person">
          {position === 1 && <span className="podium-winner-crown"><Crown /></span>}
          <ProfileAvatar name={entry.name} path={entry.path || ''} bucket={entry.bucket} className="podium-avatar" />
          <b>{entry.name}{entry.isCurrent && <em>You</em>}</b>
          {entry.badge && <span className={`podium-badge ${entry.badge}`} style={entry.badgeColor ? { '--podium-badge': entry.badgeColor } : undefined}>{tone === 'league' && ['plus', 'pro'].includes(entry.badge) && <PlanIcon />}{entry.badge}</span>}
          <span className="podium-score">{entry.score} <small>{entry.suffix}</small></span>
          {entry.detail && <small className="podium-detail">{entry.detail}</small>}
        </div>
        <div className="podium-step"><strong>{position}</strong></div>
      </article>
    })}
  </div>
}

export function Modal({ title, description, onClose, children, wide = false }) {
  useEffect(() => { const close = e => e.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close"><X /></button><h2 id="modal-title">{title}</h2>{description && <p className="muted">{description}</p>}{children}</section></div>
}

export function UpgradeModal({ feature, plan = 'Plus', onClose }) {
  return <Modal title={`${feature} is included with ${plan}`} description="Your free workspace stays fully usable. Upgrade only when the extra personalization is useful to you." onClose={onClose}><div className="upgrade-message"><span className="icon-bubble violet"><Crown /></span><div><strong>Unlock {feature.toLowerCase()}</strong><p>See exactly what each plan includes before making a decision.</p></div></div><Link className="button violet full" to="/plans">View plans</Link></Modal>
}

export function Loader({ full = false, label = 'Loading…', shell = false, variant = 'generic' }) {
  const content = <>
    <span className="skeleton-status-label">{label}</span>
    <SkeletonContent variant={variant} />
  </>
  if (shell) return <div className={`skeleton-shell-loader skeleton-variant-${variant} full-page`} role="status" aria-live="polite"><aside className="skeleton-shell-sidebar" aria-hidden="true"><span className="skeleton-block skeleton-brand" />{Array.from({ length: 7 }, (_, index) => <span className="skeleton-block skeleton-nav-item" key={index} />)}<span className="skeleton-block skeleton-sidebar-note" /></aside><main className="skeleton-shell-main"><header aria-hidden="true"><span className="skeleton-block skeleton-topbar-pill" /><span className="skeleton-block skeleton-topbar-avatar" /></header>{content}</main></div>
  return <div className={`skeleton-loader skeleton-variant-${variant} ${full ? 'full-page' : ''}`} role="status" aria-live="polite">{content}</div>
}
export function ErrorState({ text }) { return <div className="error-state"><AlertCircle /><span>{text}</span></div> }
export function Field({ label, hint, children, className = '' }) { return <label className={`field ${className}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label> }
export function formatDate(value, options = {}) { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...options }).format(new Date(value)) }
export function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening' }
