import { createClient } from '@supabase/supabase-js'
import { requireUser } from './_auth.js'

export default async function handler(request, response) {
  if (request.method !== 'DELETE') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data: files, error: listError } = await admin.storage.from('documents').list(user.id, { limit: 1000 })
    if (listError) throw listError
    if (files?.length) { const { error } = await admin.storage.from('documents').remove(files.map(file => `${user.id}/${file.name}`)); if (error) throw error }
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error
    return response.status(204).end()
  } catch (error) { return response.status(error.status || 500).json({ error: error.message }) }
}
