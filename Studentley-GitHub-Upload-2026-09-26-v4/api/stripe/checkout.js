import { requireUser } from '../_auth.js'
import { adminClient, appOrigin, findSubscriptionForUser, stripeClient } from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const price = request.body?.plan === 'plus' ? process.env.STRIPE_PLUS_PRICE_ID : request.body?.plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : null
    if (!price) return response.status(400).json({ error: 'Choose a valid paid plan.' })
    const stripe = stripeClient()
    const admin = adminClient()
    const existing = await findSubscriptionForUser(admin, user.id)
    if (existing?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(existing.status)) {
      return response.status(409).json({ code: 'ACTIVE_SUBSCRIPTION', error: 'Use billing management to change your current subscription.' })
    }
    const origin = appOrigin(request)
    const metadata = { user_id: user.id, plan: request.body.plan }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(existing?.stripe_customer_id ? { customer: existing.stripe_customer_id } : { customer_email: user.email }),
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=cancelled`,
      metadata,
      subscription_data: { metadata },
    })
    return response.status(200).json({ url: session.url })
  } catch (error) { return response.status(error.status || 500).json({ error: error.message }) }
}
