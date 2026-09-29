import { requireUser } from '../_auth.js'
import { adminClient, planForPrice, saveSubscription, stripeClient, stripeKeyIsLive } from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const sessionId = request.query?.session_id
    if (!sessionId) return response.status(400).json({ error: 'Checkout session is required.' })
    const stripe = stripeClient()
    const checkout = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    if (checkout.client_reference_id !== user.id || checkout.mode !== 'subscription' || checkout.status !== 'complete' || checkout.payment_status === 'unpaid') return response.status(403).json({ error: 'This checkout is not complete for your account.' })
    if (checkout.livemode !== stripeKeyIsLive()) return response.status(409).json({ error: 'This checkout belongs to a different Stripe mode.' })
    const subscription = typeof checkout.subscription === 'string' ? await stripe.subscriptions.retrieve(checkout.subscription) : checkout.subscription
    if (!subscription) throw Object.assign(new Error('Stripe did not create a subscription for this checkout.'), { status: 409 })
    const priceId = subscription.items?.data?.[0]?.price?.id
    const plan = planForPrice(priceId)
    if (!plan || plan !== checkout.metadata?.plan) throw Object.assign(new Error('The completed Stripe price is not linked to a Studentley plan.'), { status: 409 })
    const record = await saveSubscription(adminClient(), subscription, user.id, plan)
    return response.status(200).json({ subscription: record })
  } catch (error) { return response.status(error.status || 500).json({ error: error.message }) }
}
