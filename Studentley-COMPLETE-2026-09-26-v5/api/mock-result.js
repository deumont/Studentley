import { createClient } from '@supabase/supabase-js'
import { requireUser } from './_auth.js'

function serviceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw Object.assign(new Error('Supabase server settings are missing.'), { status: 503 })
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const practiceSetId = request.body?.practiceSetId
    const scorePercent = Number(request.body?.scorePercent)
    if (!practiceSetId || !Number.isFinite(scorePercent) || scorePercent < 0 || scorePercent > 100) return response.status(400).json({ error: 'Enter a score between 0 and 100.' })
    const db = serviceClient()
    const { data: practiceSet, error: setError } = await db.from('practice_sets').select('id,kind').eq('id', practiceSetId).eq('user_id', user.id).maybeSingle()
    if (setError) throw setError
    if (!practiceSet || practiceSet.kind !== 'mock_exam') return response.status(404).json({ error: 'Mock exam not found.' })
    const { data: existing, error: existingError } = await db.from('practice_results').select('id').eq('practice_set_id', practiceSetId).eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).maybeSingle()
    if (existingError) throw existingError
    const payload = { score_percent: scorePercent, answers: { self_reported_written_exam: true }, completed_at: new Date().toISOString() }
    const query = existing
      ? db.from('practice_results').update(payload).eq('id', existing.id).eq('user_id', user.id)
      : db.from('practice_results').insert({ user_id: user.id, practice_set_id: practiceSetId, ...payload })
    const { data, error } = await query.select().single()
    if (error) throw error
    return response.status(200).json({ result: data, created: !existing })
  } catch (error) {
    console.error('Mock exam result failed:', error)
    return response.status(error.status || 500).json({ error: error.message || 'The mock exam score could not be saved.' })
  }
}
