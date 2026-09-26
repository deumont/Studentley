import { requireUser } from '../_auth.js'
import { adminClient, saveSubscription, stripeClient } from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const sessionId = request.query?.session_id
    if (!sessionId) return response.status(400).json({ error: 'Checkout session is required.' })
    const stripe = stripeClient()
    const checkout = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    if (checkout.client_reference_id !== user.id || checkout.payment_status === 'unpaid') return response.status(403).json({ error: 'This checkout is not complete for your account.' })
    const subscription = typeof checkout.subscription === 'string' ? await stripe.subscriptions.retrieve(checkout.subscription) : checkout.subscription
    const record = await saveSubscription(adminClient(), subscription, user.id, checkout.metadata?.plan)
    return response.status(200).json({ subscription: record })
  } catch (error) { return response.status(error.status || 500).json({ error: error.message }) }
}
