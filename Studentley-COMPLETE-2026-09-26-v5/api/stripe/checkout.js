import { requireUser } from '../_auth.js'
import { adminClient, appOrigin, checkoutPrice, findSubscriptionForUser, stripeClient } from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const plan = request.body?.plan
    if (!['plus', 'pro'].includes(plan)) return response.status(400).json({ error: 'Choose a valid paid plan.' })
    const stripe = stripeClient()
    const price = await checkoutPrice(stripe, plan)
    const admin = adminClient()
    const existing = await findSubscriptionForUser(admin, user.id)
    let currentSubscription = null
    if (existing?.stripe_subscription_id) {
      try { currentSubscription = await stripe.subscriptions.retrieve(existing.stripe_subscription_id) }
      catch (error) { if (error.code !== 'resource_missing') throw error }
    }
    if (currentSubscription && ['active', 'trialing', 'past_due', 'unpaid', 'paused'].includes(currentSubscription.status)) {
      return response.status(409).json({ code: 'ACTIVE_SUBSCRIPTION', error: 'Use billing management to change your current subscription.' })
    }
    let customerId = null
    if (existing?.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(existing.stripe_customer_id)
        if (!customer.deleted && customer.livemode === price.livemode) customerId = customer.id
      } catch (error) { if (error.code !== 'resource_missing') throw error }
    }
    const origin = appOrigin(request)
    const metadata = { user_id: user.id, plan }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      client_reference_id: user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=cancelled`,
      metadata,
      subscription_data: { metadata },
    })
    if (!session.url) throw new Error('Stripe did not return a Checkout URL.')
    return response.status(200).json({ url: session.url, livemode: session.livemode })
  } catch (error) { return response.status(error.status || 500).json({ error: error.message }) }
}
