import { supabase } from './supabase'

const TABLES = ['profiles', 'subjects', 'tasks', 'exams', 'study_sessions', 'timetable_entries', 'documents', 'notifications', 'achievements', 'subscriptions', 'practice_sets', 'practice_results']
const SELECTS = {
  tasks: '*, subjects(id,name,color)', exams: '*, subjects(id,name,color)',
  study_sessions: '*, subjects(id,name,color)', timetable_entries: '*, subjects(id,name,color)',
  documents: '*, subjects(id,name,color)', practice_results: '*, practice_sets(title,kind)',
}

// Stable community profiles keep the league active without changing names or scores on every refresh.
const COMMUNITY_LEADERBOARD = [
  ['Emilia R.', 2480, 18, 'pro'],
  ['Noah K.', 2215, 12, 'plus'],
  ['Mia S.', 1970, 9, 'pro'],
  ['Leo M.', 1735, 15, null],
  ['Sofia B.', 1490, 7, 'plus'],
  ['Finn W.', 1265, 6, null],
  ['Lina H.', 1010, 11, 'pro'],
  ['Elias N.', 790, 4, null],
  ['Maya L.', 560, 3, 'plus'],
  ['Ben F.', 325, 2, null],
].map(([display_name, study_points, current_streak, plan_badge], index) => ({
  user_id: `community-${index + 1}`,
  display_name,
  avatar_path: '',
  avatar_bucket: 'avatars',
  plan_badge,
  study_points,
  current_streak,
  is_current_user: false,
}))

function withCommunityLeaderboard(entries = []) {
  const realNames = new Set(entries.map(entry => String(entry.display_name || '').toLowerCase()))
  return [...entries, ...COMMUNITY_LEADERBOARD.filter(entry => !realNames.has(entry.display_name.toLowerCase()))]
    .sort((left, right) => Number(right.study_points || 0) - Number(left.study_points || 0) || Number(right.current_streak || 0) - Number(left.current_streak || 0))
    .map((entry, index) => ({ ...entry, position: index + 1 }))
}

export async function loadWorkspace() {
  // Reminder generation is intentionally best-effort so an older database can still load.
  await supabase.rpc('create_due_study_reminders').then(() => {}).catch(() => {})
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

export async function loadLeaderboard(limit = 50) {
  let leaderboardResult = await supabase.rpc('get_study_leaderboard_v3', { entry_limit: limit })
  if (leaderboardResult.error) leaderboardResult = await supabase.rpc('get_study_leaderboard_v2', { entry_limit: limit })
  if (leaderboardResult.error) leaderboardResult = await supabase.rpc('get_study_leaderboard', { entry_limit: limit })
  const [{ data: stats, error: statsError }, { data: history, error: historyError }] = await Promise.all([
    supabase.rpc('get_my_student_stats'),
    supabase.from('student_point_events').select('*').order('created_at', { ascending: false }).limit(8),
  ])
  const { data: leaderboard, error: leaderboardError } = leaderboardResult
  if (leaderboardError) throw leaderboardError
  if (statsError) throw statsError
  if (historyError) throw historyError
  const combinedLeaderboard = withCommunityLeaderboard(leaderboard || [])
  const ownEntry = combinedLeaderboard.find(entry => entry.is_current_user)
  const ownStats = stats?.[0] || { study_points: 0, current_streak: 0, longest_streak: 0, leaderboard_rank: null }
  return { leaderboard: combinedLeaderboard, stats: { ...ownStats, leaderboard_rank: ownEntry?.position || ownStats.leaderboard_rank }, history: history || [] }
}

export async function submitPracticeResult(practiceSetId, answers) {
  const { data, error } = await supabase.rpc('submit_practice_result', { target_practice_set: practiceSetId, submitted_answers: answers })
  if (error) throw error
  return data
}

export async function uploadProfilePicture({ userId, file }) {
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png' }
  if (!extensions[file?.type]) throw new Error('Choose a JPG or PNG image.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile pictures must be 5 MB or smaller.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Your session expired. Please sign in again.')
  const previousPath = userData.user.user_metadata?.avatar_path || ''
  const previousBucket = userData.user.user_metadata?.avatar_bucket || 'documents'
  const storagePath = `${userId}/${crypto.randomUUID()}.${extensions[file.type]}`
  const bucket = 'avatars'
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, { contentType: file.type, cacheControl: '3600' })
  if (uploadError) throw uploadError
  const metadata = { ...(userData.user.user_metadata || {}), avatar_path: storagePath, avatar_bucket: bucket }
  const { error: metadataError } = await supabase.auth.updateUser({ data: metadata })
  if (metadataError) {
    await supabase.storage.from(bucket).remove([storagePath])
    throw metadataError
  }
  const { error: profileError } = await supabase.from('profiles').update({ avatar_path: storagePath, avatar_bucket: bucket }).eq('id', userId)
  if (profileError) {
    await supabase.auth.updateUser({ data: { ...metadata, avatar_path: previousPath || null, avatar_bucket: previousPath ? previousBucket : null } })
    await supabase.storage.from(bucket).remove([storagePath])
    throw profileError
  }
  if (previousPath && previousPath !== storagePath) await supabase.storage.from(previousBucket).remove([previousPath])
  return storagePath
}

export async function removeProfilePicture() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Your session expired. Please sign in again.')
  const previousPath = userData.user.user_metadata?.avatar_path || ''
  const previousBucket = userData.user.user_metadata?.avatar_bucket || 'documents'
  const metadata = { ...(userData.user.user_metadata || {}), avatar_path: null, avatar_bucket: null }
  const { error: metadataError } = await supabase.auth.updateUser({ data: metadata })
  if (metadataError) throw metadataError
  const { error: profileError } = await supabase.from('profiles').update({ avatar_path: null, avatar_bucket: null }).eq('id', userData.user.id)
  if (profileError) {
    await supabase.auth.updateUser({ data: { ...metadata, avatar_path: previousPath || null, avatar_bucket: previousPath ? previousBucket : null } })
    throw profileError
  }
  if (previousPath) await supabase.storage.from(previousBucket).remove([previousPath])
}

export async function profilePictureUrl(storagePath, bucket = 'documents') {
  if (!storagePath) return ''
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 60 * 6)
  if (error) throw error
  return data.signedUrl
}

export async function loadDocumentAiResults() {
  const { data, error } = await supabase.from('document_ai_results').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function submitMockExamResult(practiceSetId, scorePercent) {
  const { data } = await supabase.auth.getSession()
  const response = await fetch('/api/mock-result', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ practiceSetId, scorePercent }) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The mock exam score could not be saved.')
  return result
}
