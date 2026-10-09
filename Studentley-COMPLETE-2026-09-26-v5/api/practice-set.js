import { createClient } from '@supabase/supabase-js'
import { requireUser } from './_auth.js'

function serviceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw Object.assign(new Error('Supabase server settings are missing.'), { status: 503 })
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export default async function handler(request, response) {
  if (request.method !== 'DELETE') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const practiceSetId = request.body?.practiceSetId
    if (!practiceSetId) return response.status(400).json({ error: 'Choose a generated study set to delete.' })

    const db = serviceClient()
    const { data: practiceSet, error: findError } = await db.from('practice_sets').select('id,kind').eq('id', practiceSetId).eq('user_id', user.id).maybeSingle()
    if (findError) throw findError
    if (!practiceSet) return response.status(404).json({ error: 'This study set no longer exists.' })
    if (!['quiz', 'flashcards', 'mock_exam', 'visual_explanation'].includes(practiceSet.kind)) return response.status(400).json({ error: 'This item cannot be deleted here.' })

    const { error } = await db.from('practice_sets').delete().eq('id', practiceSet.id).eq('user_id', user.id)
    if (error) throw error
    return response.status(200).json({ deleted: true })
  } catch (error) {
    console.error('Practice-set deletion failed:', error)
    return response.status(error.status || 500).json({ error: error.message || 'The study set could not be deleted.' })
  }
}
