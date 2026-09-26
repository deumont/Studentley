import React, { useEffect, useState } from 'react'
import { Check, Crown, Rocket, ShieldCheck, Sparkles, Sprout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { useApp } from '../context/AppContext'
import { Button } from '../components/UI'

const plans = [
  { id: 'free', name: 'Free', price: '€0', icon: Sprout, text: 'Start with the essentials and build a study rhythm around your real week.', features: ['3 document uploads per week', '1 personalized mock exam per week', '5 AI quizzes per week', 'Basic study plan', 'Flashcards', 'Basic progress', 'Basic practice'], note: 'No study reminders' },
  { id: 'plus', name: 'Plus', price: '€3.99', icon: Sparkles, text: 'More practice, useful reminders and a plan shaped around your priorities.', popular: true, features: ['7 document uploads per week', '5 personalized mock exams per week', '30 AI quizzes per week', 'Personalized study plan', 'Study reminders', 'Flashcards and progress tracking', 'Advanced practice', 'Higher AI Tutor allowance'], note: 'AI analysis activates when integration is enabled' },
  { id: 'pro', name: 'Pro', price: '€6.99', icon: Rocket, text: 'Maximum room for ambitious students with fair-use protection.', features: ['Unlimited document uploads', 'Unlimited mock exams', 'Unlimited quizzes', 'Personalized study plan', 'Study reminders', 'Advanced progress and practice', 'AI document analysis', 'Highest AI Tutor allowance'], note: 'AI features require the secure integration' },
]

export default function Plans() {
  const { profile, session, notify } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const current = (profile?.subscription_plan || 'free').toLowerCase()
  useEffect(() => { document.title = 'Plans — Studentley' }, [])
  const choose = async plan => {
    if (!session) return navigate('/signup')
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
  return <PublicLayout><main className="public-plans"><section className="plans-hero public-container"><span className="public-pill"><Crown /> Simple, transparent plans</span><h1>Choose the space you need to study your way.</h1><p>Start free. Upgrade when you need more uploads, practice and personalization.</p></section><section className="public-container"><div className="plans-grid public-pricing">{plans.map(plan => { const Icon = plan.icon; return <article className={`pricing-card ${plan.id} ${plan.popular ? 'popular' : ''}`} key={plan.id}>{plan.popular && <span className="popular-badge">Most popular</span>}<span className="plan-icon"><Icon /></span><h2>{plan.name}</h2><p>{plan.text}</p><h3>{plan.price}<small>{plan.id === 'free' ? '' : '/month'}</small></h3><Button className="full" variant={plan.id === 'pro' ? 'violet' : 'primary'} disabled={Boolean(session) && current === plan.id} loading={loading === plan.id} onClick={() => choose(plan.id)}>{session && current === plan.id ? 'Current plan' : plan.id === 'free' ? 'Start free' : `Choose ${plan.name}`}</Button><ul>{plan.features.map(feature => <li key={feature}><Check /><span>{feature}</span></li>)}</ul><div className="plan-note"><ShieldCheck /> {plan.note}</div></article>})}</div><div className="pricing-honesty"><Sparkles /><div><b>No pretend AI and no fake payments.</b><p>Features that depend on AI stay unavailable until the secure integration is connected. Checkout only proceeds when the existing Stripe infrastructure is configured.</p></div></div></section></main></PublicLayout>
}
