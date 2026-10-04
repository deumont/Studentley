import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, CreditCard, FileCheck2, Gauge, Rocket, ShieldCheck, Sparkles, Sprout, Trophy, UploadCloud, Zap } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { useApp } from '../context/AppContext'
import { Button } from '../components/UI'
import usePublicPageMotion from '../lib/usePublicPageMotion'

const plans = [
  { id: 'free', name: 'Free', price: '€0', icon: Sprout, text: 'Start with the essentials and build a study rhythm around your real week.', features: ['3 document uploads per week', '1 personalized mock exam per week', '5 AI quizzes per week', 'Basic study plan', 'Flashcards', 'Basic progress', 'Basic practice'], note: 'No study reminders' },
  { id: 'plus', name: 'Plus', price: '€3.99', icon: Sparkles, text: 'More practice and a plan shaped around your priorities.', popular: true, features: ['7 document uploads per week', '5 personalized mock exams per week', '30 AI quizzes per week', 'Personalized study plan', 'Flashcards and progress tracking', 'Advanced practice', 'Higher AI generation allowance'], note: 'A larger workspace for consistent study' },
  { id: 'pro', name: 'Pro', price: '€6.99', icon: Rocket, text: 'Maximum room for ambitious students with fair-use protection.', features: ['Unlimited document uploads', 'Unlimited mock exams', 'Unlimited quizzes', 'Personalized study plan', 'AI marking for completed mock exams', 'Study reminders', 'Highest AI generation allowance'], note: 'The complete personalized experience' },
]

export default function Plans() {
  const pageRef = useRef(null)
  usePublicPageMotion(pageRef, 'studentley-plans-page')
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
        if (active) { await refresh(); notify('Your Studentley plan is active.'); navigate(`/app?welcome_plan=${result.subscription.plan}`, { replace: true }) }
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
    if (plan === 'free') return hasManagedSubscription ? manageBilling() : undefined
    if (plan === current && !hasManagedSubscription) return
    setLoading(plan)
    try {
      const response = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan }) })
      const result = await response.json()
      if (!response.ok) {
        if (result.code === 'ACTIVE_SUBSCRIPTION') return manageBilling()
        throw new Error(result.error)
      }
      location.assign(result.url)
    } catch (error) { notify(error.message || 'Checkout is not configured yet.', 'error') }
    finally { setLoading(null) }
  }
  const buttonText = plan => {
    if (!session) return plan.id === 'free' ? 'Start free' : `Choose ${plan.name}`
    if (hasManagedSubscription) return plan.id === current ? 'Manage billing' : plan.id === 'free' ? 'Manage or cancel plan' : `Switch to ${plan.name}`
    return plan.id === current ? 'Current plan' : plan.id === 'free' ? 'Included free plan' : `Choose ${plan.name}`
  }
  return <PublicLayout><main className="editorial-page plans-editorial" ref={pageRef}>
    <section className="editorial-hero plans-editorial-hero">
      <div className="editorial-contours" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="editorial-hero-copy">
        <span className="sl-kicker"><Sparkles /> Simple plans. Serious studying.</span>
        <h1><span>START FREE.</span><span>MOVE UP</span><span className="outline">WHEN READY.</span></h1>
        <p>Every plan includes the core Studentley experience. Upgrade for more exams, more uploads and more room to keep momentum going.</p>
        <a className="sl-text-link" href="#choose-plan">Compare the plans <ArrowRight /></a>
      </div>
      <PlanHeroVisual />
    </section>

    <div className="editorial-page-marquee plans-marquee" aria-hidden="true"><div><span>FREE TO START <i>✦</i> CANCEL ANYTIME <i>✦</i> PRICES INCLUDE TAX <i>✦</i> SECURE STRIPE CHECKOUT <i>✦</i> FREE TO START <i>✦</i> CANCEL ANYTIME <i>✦</i> PRICES INCLUDE TAX <i>✦</i> SECURE STRIPE CHECKOUT <i>✦</i></span><span>FREE TO START <i>✦</i> CANCEL ANYTIME <i>✦</i> PRICES INCLUDE TAX <i>✦</i> SECURE STRIPE CHECKOUT <i>✦</i> FREE TO START <i>✦</i> CANCEL ANYTIME <i>✦</i> PRICES INCLUDE TAX <i>✦</i> SECURE STRIPE CHECKOUT <i>✦</i></span></div></div>

    <section className="plans-choice-section" id="choose-plan">
      <div className="editorial-wrap">
        <header className="editorial-section-heading plans-heading" data-reveal>
          <span className="sl-kicker dark"><Gauge /> Choose your level</span>
          <h2>Pick the amount of momentum you need.</h2>
          <p>Start with Free. Plus is built for a consistent weekly rhythm. Pro removes the limits for students who want the complete experience.</p>
        </header>
        <div className="editorial-pricing-grid">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            return <article className={`pricing-card editorial-plan-card ${plan.id} ${plan.popular ? 'popular' : ''}`} data-reveal key={plan.id} style={{ '--plan-delay': `${index * 90}ms` }}>
              <header><small>0{index + 1}</small>{plan.popular && <span className="popular-badge">Most popular</span>}<i><Icon /></i></header>
              <div className="editorial-plan-name"><h2>{plan.name}</h2><p>{plan.text}</p></div>
              <div className="editorial-price"><strong>{plan.price}</strong><span>{plan.id === 'free' ? 'forever' : 'per month'}<small>{plan.id === 'free' ? 'No card required' : 'Taxes included'}</small></span></div>
              <Button className="full" variant={plan.id === 'pro' ? 'violet' : 'primary'} disabled={Boolean(session) && current === 'free' && !hasManagedSubscription && plan.id === 'free'} loading={loading === plan.id || (loading === 'billing' && (current !== 'free' || hasManagedSubscription))} onClick={() => choose(plan.id)}>{buttonText(plan)} <ArrowRight /></Button>
              <div className="plan-includes"><small>WHAT&apos;S INCLUDED</small><ul>{plan.features.map(feature => <li key={feature}><Check /><span>{feature}</span></li>)}</ul></div>
              <div className="plan-note"><ShieldCheck /> {plan.note}</div>
            </article>
          })}
        </div>
      </div>
    </section>

    <section className="plans-comparison-section">
      <div className="editorial-wrap">
        <header className="editorial-section-heading split" data-reveal><div><span className="sl-kicker"><FileCheck2 /> Compare every limit</span><h2>Know exactly what changes.</h2></div><p>No hidden bundles. Choose based on how often you want to upload, generate and practise.</p></header>
        <div className="plans-comparison-table" data-reveal>
          <div className="comparison-head"><b>FEATURE</b><b>FREE</b><b>PLUS</b><b>PRO</b></div>
          <ComparisonRow icon={UploadCloud} label="Document uploads" free="3 / week" plus="7 / week" pro="Unlimited" />
          <ComparisonRow icon={FileCheck2} label="Mock exams" free="1 / week" plus="5 / week" pro="Unlimited" />
          <ComparisonRow icon={Zap} label="AI quizzes" free="5 / week" plus="30 / week" pro="Unlimited" />
          <ComparisonRow icon={Trophy} label="Study plan" free="Basic" plus="Personalized" pro="Personalized" />
          <ComparisonRow icon={Sparkles} label="AI marking" free="—" plus="—" pro="Included" />
        </div>
      </div>
    </section>

    <section className="billing-trust-section">
      <div className="editorial-wrap billing-trust-grid">
        <div data-reveal="left"><span className="sl-kicker"><ShieldCheck /> Secure and straightforward</span><h2>Upgrade without the awkward part.</h2><p>Stripe handles checkout, invoices, payment methods, plan changes and cancellation. Your AI requests remain authenticated through Studentley&apos;s secure server endpoint.</p><div className="billing-trust-points"><span><Check /> Prices include applicable tax</span><span><Check /> Cancel or switch from billing settings</span><span><Check /> No payment details stored by Studentley</span></div></div>
        <div className="billing-card-visual" data-reveal="right"><header><CreditCard /><span><small>PAYMENT</small><b>Secured by Stripe</b></span></header><div><small>STUDENTLEY PLAN</small><strong>PLUS</strong><span>€3.99 / month</span></div><footer><ShieldCheck /> Encrypted checkout</footer></div>
      </div>
    </section>

    <section className="editorial-final plans-final">
      <div className="editorial-final-rings" aria-hidden="true"><i /><i /><i /></div>
      <div data-reveal="scale"><span><Rocket /></span><small>START WHERE YOU ARE</small><h2>YOUR FIRST PLAN<br />CAN BE FREE.</h2><p>Create your account now. Upgrade only when the extra room becomes useful.</p><div><button className="sl-primary white" type="button" onClick={() => choose('free')}>Start free <ArrowRight /></button><Link className="sl-text-link white" to="/features">Explore the features</Link></div></div>
    </section>
  </main></PublicLayout>
}

function ComparisonRow({ icon: Icon, label, free, plus, pro }) {
  return <div className="comparison-row"><span><Icon />{label}</span><b>{free}</b><b>{plus}</b><b>{pro}</b></div>
}

function PlanHeroVisual() {
  return <div className="plan-hero-visual" aria-label="Studentley plan levels">
    <div className="plan-hero-rings"><i /><i /><i /></div>
    <article className="free"><small>01</small><Sprout /><b>FREE</b><strong>€0</strong></article>
    <article className="plus"><small>02</small><Sparkles /><b>PLUS</b><strong>€3.99</strong><em>MOST POPULAR</em></article>
    <article className="pro"><small>03</small><Rocket /><b>PRO</b><strong>€6.99</strong></article>
  </div>
}
