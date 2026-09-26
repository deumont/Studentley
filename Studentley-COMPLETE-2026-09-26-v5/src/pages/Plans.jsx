import React, { useEffect, useState } from 'react'
import { Check, Crown, Rocket, ShieldCheck, Sparkles, Sprout } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { useApp } from '../context/AppContext'
import { Button } from '../components/UI'

const plans = [
  { id: 'free', name: 'Free', price: '€0', icon: Sprout, text: 'Start with the essentials and build a study rhythm around your real week.', features: ['3 document uploads per week', '1 personalized mock exam per week', '5 AI quizzes per week', 'Basic study plan', 'Flashcards', 'Basic progress', 'Basic practice'], note: 'No study reminders' },
  { id: 'plus', name: 'Plus', price: '€3.99', icon: Sparkles, text: 'More practice, useful reminders and a plan shaped around your priorities.', popular: true, features: ['7 document uploads per week', '5 personalized mock exams per week', '30 AI quizzes per week', 'Personalized study plan', 'Study reminders', 'Flashcards and progress tracking', 'Advanced practice', 'Higher AI Tutor allowance'], note: 'AI analysis activates when integration is enabled' },
  { id: 'pro', name: 'Pro', price: '€6.99', icon: Rocket, text: 'Maximum room for ambitious students with fair-use protection.', features: ['Unlimited document uploads', 'Unlimited mock exams', 'Unlimited quizzes', 'Personalized study plan', 'Study reminders', 'Advanced progress and practice', 'AI document analysis', 'Highest AI Tutor allowance'], note: 'AI features require the secure integration' },
]

export default function Plans() {
  const { profile, session, notify, refresh, data } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(null)
  const current = (profile?.subscription_plan || 'free').toLowerCase()
  const billingSubscription = data?.subscriptions?.[0]
  const hasManagedSubscription = Boolean(billingSubscription?.stripe_customer_id && !['canceled', 'cancelled', 'expired', 'incomplete_expired'].includes(billingSubscription.status))
  useEffect(() => { document.title = 'Plans — Studentley' }, [])
  useEffect(() => {
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')
    if (!session?.access_token || !checkout) return
    if (checkout === 'cancelled') { notify('Checkout was cancelled. Your plan was not changed.', 'error'); navigate('/plans', { replace: true }); return }
    if (checkout !== 'success' || !sessionId) return
    let active = true
    const sync = async () => {
      try {
        const response = await fetch(`/api/stripe/status?session_id=${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        if (active) { await refresh(); notify('Your Studentley plan is active.'); navigate('/plans', { replace: true }) }
      } catch (error) { if (active) notify(error.message || 'Payment succeeded, but the plan is still syncing.', 'error') }
    }
    sync()
    return () => { active = false }
  }, [searchParams, session?.access_token])

  const manageBilling = async () => {
    setLoading('billing')
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      location.assign(result.url)
    } catch (error) { notify(error.message || 'Unable to open billing management.', 'error'); setLoading(null) }
  }
  const choose = async plan => {
    if (!session) return navigate('/signup')
    if (current !== 'free' || hasManagedSubscription) return manageBilling()
    if (plan === 'free' || plan === current) return
    setLoading(plan)
    try {
      const response = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      location.assign(result.url)
    } catch (error) { notify(error.message || 'Checkout is not configured yet.', 'error') }
    finally { setLoading(null) }
  }
  const buttonText = plan => {
    if (!session) return plan.id === 'free' ? 'Start free' : `Choose ${plan.name}`
    if (current !== 'free' || hasManagedSubscription) return plan.id === current ? 'Manage billing' : plan.id === 'free' ? 'Manage or cancel plan' : `Switch to ${plan.name}`
    return plan.id === 'free' ? 'Current plan' : `Choose ${plan.name}`
  }
  return <PublicLayout><main className="public-plans"><section className="plans-hero public-container"><span className="public-pill"><Crown /> Simple, transparent plans</span><h1>Choose the space you need to study your way.</h1><p>Start free. Upgrade when you need more uploads, practice and personalization.</p></section><section className="public-container"><div className="plans-grid public-pricing">{plans.map(plan => { const Icon = plan.icon; return <article className={`pricing-card ${plan.id} ${plan.popular ? 'popular' : ''}`} key={plan.id}>{plan.popular && <span className="popular-badge">Most popular</span>}<span className="plan-icon"><Icon /></span><h2>{plan.name}</h2><p>{plan.text}</p><h3>{plan.price}<small>{plan.id === 'free' ? '' : '/month'}</small></h3><Button className="full" variant={plan.id === 'pro' ? 'violet' : 'primary'} disabled={Boolean(session) && current === 'free' && !hasManagedSubscription && plan.id === 'free'} loading={loading === plan.id || (loading === 'billing' && (current !== 'free' || hasManagedSubscription))} onClick={() => choose(plan.id)}>{buttonText(plan)}</Button><ul>{plan.features.map(feature => <li key={feature}><Check /><span>{feature}</span></li>)}</ul><div className="plan-note"><ShieldCheck /> {plan.note}</div></article>})}</div><div className="pricing-honesty"><Sparkles /><div><b>Secure billing, clear limits.</b><p>Stripe handles checkout, invoices, payment methods, plan changes, and cancellation. AI requests are authenticated and processed through the secure server endpoint.</p></div></div></section></main></PublicLayout>
}
