import { supabase } from './supabase'

const TABLES = ['profiles', 'subjects', 'tasks', 'exams', 'study_sessions', 'timetable_entries', 'documents', 'notifications', 'achievements', 'subscriptions', 'practice_sets', 'practice_results']
const SELECTS = {
  tasks: '*, subjects(id,name,color)', exams: '*, subjects(id,name,color)',
  study_sessions: '*, subjects(id,name,color)', timetable_entries: '*, subjects(id,name,color)',
  documents: '*, subjects(id,name,color)', practice_results: '*, practice_sets(title,kind)',
}

export async function loadWorkspace() {
  const results = await Promise.all(TABLES.map(table => supabase.from(table).select(SELECTS[table] || '*').order('created_at', { ascending: false })))
  const failed = results.find(result => result.error)
  if (failed) throw failed.error
  return Object.fromEntries(TABLES.map((table, index) => [table, results[index].data || []]))
}

export async function createRecord(table, record) {
  const { data, error } = await supabase.from(table).insert(record).select().single()
  if (error) throw error
  return data
}

export async function updateRecord(table, id, changes) {
  const { data, error } = await supabase.from(table).update(changes).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removeRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function saveProfile(userId, changes) {
  const { data, error } = await supabase.from('profiles').upsert({ id: userId, ...changes }).select().single()
  if (error) throw error
  return data
}

export async function uploadDocument({ userId, file, subjectId, category = 'study_material', onProgress }) {
  const allowed = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']
  if (!allowed.includes(file.type)) throw new Error('This file type is not supported.')
  if (file.size > 25 * 1024 * 1024) throw new Error('Files must be 25 MB or smaller.')

  const extension = file.name.split('.').pop()?.toLowerCase() || 'file'
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Your session expired. Please sign in again.')

  await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/documents/${storagePath}`)
    request.setRequestHeader('Authorization', `Bearer ${token}`)
    request.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY)
    request.setRequestHeader('Content-Type', file.type)
    request.upload.onprogress = event => event.lengthComputable && onProgress?.(Math.round((event.loaded / event.total) * 100))
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error('Upload failed. Please try again.'))
    request.onerror = () => reject(new Error('Upload failed. Please check your connection.'))
    request.send(file)
  })

  try {
    return await createRecord('documents', {
      user_id: userId, name: file.name, storage_path: storagePath, mime_type: file.type,
      size_bytes: file.size, subject_id: subjectId || null, category, status: 'uploaded',
    })
  } catch (error) {
    await supabase.storage.from('documents').remove([storagePath])
    throw error
  }
}

export async function openDocument(document) {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(document.storage_path, 60)
  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

export async function deleteDocument(document) {
  const { error: storageError } = await supabase.storage.from('documents').remove([document.storage_path])
  if (storageError) throw storageError
  await removeRecord('documents', document.id)
}

export async function markNotificationsRead() {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (error) throw error
}
