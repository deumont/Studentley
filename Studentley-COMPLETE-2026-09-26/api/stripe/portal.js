import { requireUser } from '../_auth.js'
import { adminClient, appOrigin, findSubscriptionForUser, portalConfiguration, stripeClient } from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const stripe = stripeClient()
    const subscription = await findSubscriptionForUser(adminClient(), user.id)
    if (!subscription?.stripe_customer_id) return response.status(404).json({ error: 'No paid subscription is connected to this account.' })
    const origin = appOrigin(request)
    const configuration = await portalConfiguration(stripe, origin)
    const portal = await stripe.billingPortal.sessions.create({ customer: subscription.stripe_customer_id, configuration, return_url: `${origin}/settings` })
    return response.status(200).json({ url: portal.url })
  } catch (error) { return response.status(error.status || 500).json({ error: error.message }) }
}
