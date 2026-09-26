import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw Object.assign(new Error('Stripe is not configured.'), { status: 503 })
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' })
}

export function adminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw Object.assign(new Error('Server database access is not configured.'), { status: 503 })
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function appOrigin(request) {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  const protocol = request.headers['x-forwarded-proto'] || 'https'
  const host = request.headers['x-forwarded-host'] || request.headers.host
  if (!host) throw Object.assign(new Error('Application URL is not configured.'), { status: 503 })
  return `${protocol}://${host}`
}

export function planForPrice(priceId) {
  if (priceId === process.env.STRIPE_PLUS_PRICE_ID) return 'plus'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  return null
}

export async function findSubscriptionForUser(admin, userId) {
  const { data, error } = await admin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function resolveSubscriptionOwner(stripe, admin, subscription) {
  if (subscription.metadata?.user_id) return subscription.metadata.user_id
  const { data } = await admin.from('subscriptions').select('user_id').or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${String(subscription.customer)}`).maybeSingle()
  if (data?.user_id) return data.user_id
  const customer = typeof subscription.customer === 'string' ? await stripe.customers.retrieve(subscription.customer) : subscription.customer
  return customer && !customer.deleted ? customer.metadata?.user_id : null
}

export async function saveSubscription(admin, subscription, userId, explicitPlan, eventCreated = Math.floor(Date.now() / 1000)) {
  if (!userId) throw new Error('The Stripe subscription is not linked to a Studentley user.')
  const { data: existing, error: existingError } = await admin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
  if (existingError) throw existingError
  const eventTime = new Date(eventCreated * 1000)
  if (existing?.last_stripe_event_at && new Date(existing.last_stripe_event_at) > eventTime) return existing
  const item = subscription.items?.data?.[0]
  const priceId = item?.price?.id || null
  const plan = explicitPlan || planForPrice(priceId) || existing?.plan || 'free'
  const active = ['active', 'trialing'].includes(subscription.status)
  const periodEnd = subscription.current_period_end || item?.current_period_end
  const record = {
    user_id: userId,
    stripe_customer_id: String(subscription.customer),
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan,
    status: subscription.status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    last_stripe_event_at: eventTime.toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { error: subscriptionError } = await admin.from('subscriptions').upsert(record, { onConflict: 'user_id' })
  if (subscriptionError) throw subscriptionError
  const { error: profileError } = await admin.from('profiles').update({ subscription_plan: active ? plan : 'free' }).eq('id', userId)
  if (profileError) throw profileError
  return record
}

export async function portalConfiguration(stripe, origin) {
  if (process.env.STRIPE_PORTAL_CONFIGURATION_ID) return process.env.STRIPE_PORTAL_CONFIGURATION_ID
  const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 100 })
  const existing = configurations.data.find(item => item.business_profile?.headline === 'Manage your Studentley subscription')
  const plus = await stripe.prices.retrieve(process.env.STRIPE_PLUS_PRICE_ID)
  const pro = await stripe.prices.retrieve(process.env.STRIPE_PRO_PRICE_ID)
  const products = [plus, pro].reduce((items, price) => {
    const product = typeof price.product === 'string' ? price.product : price.product.id
    const existingProduct = items.find(item => item.product === product)
    if (existingProduct) existingProduct.prices.push(price.id)
    else items.push({ product, prices: [price.id] })
    return items
  }, [])
  const parameters = {
    business_profile: { headline: 'Manage your Studentley subscription' },
    default_return_url: `${origin}/settings`,
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: 'at_period_end', proration_behavior: 'none' },
      subscription_update: { enabled: true, default_allowed_updates: ['price'], proration_behavior: 'create_prorations', products },
    },
  }
  if (existing) {
    const updated = await stripe.billingPortal.configurations.update(existing.id, parameters)
    return updated.id
  }
  const created = await stripe.billingPortal.configurations.create(parameters)
  return created.id
}
