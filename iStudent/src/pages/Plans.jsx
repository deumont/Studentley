import React, { useState } from 'react'
import { Bell, Check, Crown, FileText, Rocket, ShieldCheck, Sparkles, Sprout } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, PageHeading } from '../components/UI'

const plans = [
  { id: 'free', name: 'Free', price: '€0', icon: Sprout, text: 'Explore the essentials and build a simple study rhythm.', features: [['Document uploads', '3 per week'], ['Mock exams', '1 per week'], ['AI quizzes', '5 per week'], ['Study reminders', false], ['Study plan', 'Basic']] },
  { id: 'plus', name: 'Plus', price: '€3.99', icon: Sparkles, text: 'More practice, reminders and a personalised plan.', popular: true, features: [['Document uploads', '7 per week'], ['Mock exams', '5 per week'], ['AI quizzes', '30 per week'], ['Study reminders', true], ['Study plan', 'Personalised']] },
  { id: 'pro', name: 'Pro', price: '€6.99', icon: Rocket, text: 'The complete iStudent experience without plan limits.', features: [['Document uploads', 'Unlimited'], ['Mock exams', 'Unlimited'], ['AI quizzes', 'Unlimited'], ['Study reminders', true], ['Study plan', 'Personalised']] },
]

export default function Plans() {
  const { profile, session, notify } = useApp()
  const [loading, setLoading] = useState(null)
  const current = (profile?.subscription_plan || 'free').toLowerCase()
  const checkout = async plan => { if (plan === 'free' || plan === current) return; setLoading(plan); try { const response = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); location.assign(result.url) } catch (error) { notify(error.message || 'Checkout is not configured yet.', 'error') } finally { setLoading(null) } }
  return <><PageHeading eyebrow="Plans" title="Choose the plan that fits your goals" text="More room to practise when you need it. Upgrade or cancel anytime." />
    <div className="plans-grid">{plans.map(plan => { const Icon = plan.icon; return <article className={`pricing-card ${plan.id} ${plan.popular ? 'popular' : ''}`} key={plan.id}>{plan.popular && <span className="popular-badge">Most popular</span>}<span className="plan-icon"><Icon /></span><h2>{plan.name}</h2><p>{plan.text}</p><h3>{plan.price}<small>/month</small></h3><Button className="full" variant={plan.id === 'pro' ? 'violet' : 'primary'} disabled={current === plan.id || plan.id === 'free'} loading={loading === plan.id} onClick={() => checkout(plan.id)}>{current === plan.id ? 'Current plan' : plan.id === 'free' ? 'Included' : `Get ${plan.name}`}</Button><ul>{plan.features.map(([name, value]) => <li key={name}>{name}<b>{value === true ? <Check /> : value === false ? 'Not included' : value}</b></li>)}</ul><div className="plan-note">{plan.id === 'free' ? <><ShieldCheck /> A calm way to get started.</> : plan.id === 'plus' ? <><Crown /> Everything you need to stay on track.</> : <><Rocket /> For students who want the full experience.</>}</div></article>})}</div>
    <div className="plan-benefits"><div><Sparkles /><span><b>Study smarter</b><small>Focus on what matters.</small></span></div><div><Crown /><span><b>Better results</b><small>Build good habits.</small></span></div><div><Bell /><span><b>Made for students</b><small>Simple, clear and private.</small></span></div></div>
  </>
}
