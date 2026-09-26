import { adminClient, planForPrice, resolveSubscriptionOwner, saveSubscription, stripeClient } from './_shared.js'

export const config = { api: { bodyParser: false } }

async function rawBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method not allowed')
  let admin
  let eventId
  try {
    const stripe = stripeClient()
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('Stripe webhook signing is not configured.')
    const event = stripe.webhooks.constructEvent(await rawBody(request), request.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
    eventId = event.id
    admin = adminClient()
    const { error: eventError } = await admin.from('stripe_webhook_events').insert({ id: event.id, event_type: event.type, processed_at: null })
    if (eventError?.code === '23505') {
      const { data: existing } = await admin.from('stripe_webhook_events').select('processed_at').eq('id', event.id).maybeSingle()
      return response.status(existing?.processed_at ? 200 : 409).json({ received: Boolean(existing?.processed_at), duplicate: true })
    }
    if (eventError) throw eventError
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const checkout = event.data.object
      const subscription = await stripe.subscriptions.retrieve(checkout.subscription)
      await saveSubscription(admin, subscription, checkout.metadata?.user_id || checkout.client_reference_id, checkout.metadata?.plan, event.created)
    }
    if (event.type.startsWith('customer.subscription.')) {
      const subscription = event.data.object
      const userId = await resolveSubscriptionOwner(stripe, admin, subscription)
      const priceId = subscription.items.data[0]?.price?.id
      if (userId) await saveSubscription(admin, subscription, userId, planForPrice(priceId), event.created)
    }
    const { error: processedError } = await admin.from('stripe_webhook_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id)
    if (processedError) throw processedError
    return response.status(200).json({ received: true })
  } catch (error) {
    if (admin && eventId) await admin.from('stripe_webhook_events').delete().eq('id', eventId)
    return response.status(400).send(`Webhook error: ${error.message}`)
  }
}
