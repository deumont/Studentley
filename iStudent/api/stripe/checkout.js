import Stripe from 'stripe'
import { requireUser } from '../_auth.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) return response.status(503).json({ error: 'Stripe test mode is not configured yet.' })
    const price = request.body?.plan === 'plus' ? process.env.STRIPE_PLUS_PRICE_ID : request.body?.plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : null
    if (!price) return response.status(400).json({ error: 'Choose a valid paid plan.' })
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin = process.env.APP_URL || `https://${request.headers.host}`
    const metadata = { user_id: user.id, plan: request.body.plan }
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', customer_email: user.email, client_reference_id: user.id, line_items: [{ price, quantity: 1 }], success_url: `${origin}/plans?checkout=success`, cancel_url: `${origin}/plans?checkout=cancelled`, metadata, subscription_data: { metadata } })
    return response.status(200).json({ url: session.url })
  } catch (error) { return response.status(error.status || 500).json({ error: error.message }) }
}
