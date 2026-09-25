import Stripe from 'stripe'

export const config = { api: { bodyParser: false } }

async function rawBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

async function saveSubscription(subscription, userId, plan) {
  const body = {
    user_id: userId, stripe_customer_id: String(subscription.customer), stripe_subscription_id: subscription.id,
    plan, status: subscription.status, current_period_end: new Date(subscription.current_period_end * 1000).toISOString(), updated_at: new Date().toISOString(),
  }
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscriptions?on_conflict=user_id`, { method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error('Unable to persist subscription state.')
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, { method: 'PATCH', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription_plan: ['active','trialing'].includes(subscription.status) ? plan : 'free' }) })
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method not allowed')
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const event = stripe.webhooks.constructEvent(await rawBody(request), request.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
    if (event.type === 'checkout.session.completed') {
      const checkout = event.data.object
      const subscription = await stripe.subscriptions.retrieve(checkout.subscription)
      await saveSubscription(subscription, checkout.metadata.user_id, checkout.metadata.plan)
    }
    if (event.type.startsWith('customer.subscription.')) {
      const subscription = event.data.object
      const userId = subscription.metadata.user_id
      const priceId = subscription.items.data[0]?.price?.id
      const plan = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'plus'
      if (userId) await saveSubscription(subscription, userId, plan)
    }
    return response.status(200).json({ received: true })
  } catch (error) { return response.status(400).send(`Webhook error: ${error.message}`) }
}
