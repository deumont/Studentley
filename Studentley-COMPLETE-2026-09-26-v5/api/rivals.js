import { createClient } from '@supabase/supabase-js'
import { requireUser } from './_auth.js'

export const config = { maxDuration: 60 }

const ACTIVE_STATUSES = ['waiting', 'generating', 'active', 'finishing']
const FINISH_WINDOW_MS = 20000
const SUBMISSION_GRACE_MS = 5000

function serviceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw Object.assign(new Error('Supabase server settings are missing.'), { status: 503 })
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

const rankFor = rating => rating >= 1800 ? 'Master' : rating >= 1600 ? 'Diamond' : rating >= 1400 ? 'Platinum' : rating >= 1200 ? 'Gold' : rating >= 1000 ? 'Silver' : 'Bronze'
const safeText = (value, length = 120) => String(value || '').trim().slice(0, length)
const roomCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
const practiceNames = ['Alex', 'Amelia', 'Ben', 'Chloe', 'Daniel', 'Elena', 'Felix', 'Hannah', 'Isla', 'Jonas', 'Leo', 'Maya', 'Noah', 'Sofia', 'Theo', 'Zara']
const practiceInitials = ['B.', 'C.', 'F.', 'H.', 'K.', 'L.', 'M.', 'R.', 'S.', 'T.', 'W.']
const randomBetween = (minimum, maximum) => Math.floor(minimum + Math.random() * (maximum - minimum + 1))

async function ensureRivalProfile(db, userId) {
  const { data: existing, error: readError } = await db.from('rival_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (readError) throw readError
  if (existing) return existing
  const { data: inserted, error } = await db.from('rival_profiles').insert({ user_id: userId }).select().maybeSingle()
  if (error && error.code !== '23505') throw error
  if (inserted) return inserted
  const { data: racedProfile, error: racedError } = await db.from('rival_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (racedError) throw racedError
  if (racedProfile) return racedProfile
  throw Object.assign(new Error('Your Rivals profile could not be prepared. Please try matchmaking again.'), { status: 409 })
}

async function profileMap(db, userIds) {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (!unique.length) return new Map()
  const { data, error } = await db.from('profiles').select('id,display_name,avatar_path,avatar_bucket,leaderboard_visible,subscription_plan').in('id', unique)
  if (error) throw error
  return new Map((data || []).map(profile => [profile.id, profile]))
}

function publicPlayer(player, profile, currentUserId) {
  const visible = profile?.leaderboard_visible !== false || player.user_id === currentUserId
  const displayName = safeText(profile?.display_name || 'Student', 80).split(' ')[0] || 'Student'
  return {
    player_key: player.user_id,
    user_id: player.user_id,
    bot_id: null,
    display_name: displayName,
    avatar_path: visible ? profile?.avatar_path || '' : '',
    avatar_bucket: visible ? profile?.avatar_bucket || 'avatars' : 'avatars',
    plan_badge: ['plus', 'pro'].includes(profile?.subscription_plan) ? profile.subscription_plan : null,
    correct_answers: player.correct_answers,
    elapsed_ms: player.elapsed_ms,
    submitted_at: player.submitted_at,
    rating_before: player.rating_before,
    rating_after: player.rating_after,
    is_current_user: player.user_id === currentUserId,
    is_practice_rival: false,
    forfeited: player.answers?.__forfeited === true,
  }
}

function publicPracticeRival(bot) {
  return {
    player_key: `practice:${bot.id}`,
    user_id: null,
    bot_id: bot.id,
    display_name: bot.display_name,
    avatar_path: '',
    avatar_bucket: 'avatars',
    plan_badge: null,
    correct_answers: bot.correct_answers,
    elapsed_ms: bot.elapsed_ms,
    submitted_at: bot.submitted_at,
    rating_before: bot.rating_before,
    rating_after: bot.rating_before,
    is_current_user: false,
    is_practice_rival: true,
    forfeited: false,
  }
}

const playableItems = items => (Array.isArray(items) ? items : []).map((item, index) => ({
  number: index + 1,
  prompt: safeText(item.prompt, 1200),
  options: Array.isArray(item.options) ? item.options.slice(0, 4).map(option => safeText(option, 500)) : [],
}))

async function getMatchRecord(db, matchId) {
  const { data, error } = await db.from('rival_matches').select('*').eq('id', matchId).maybeSingle()
  if (error) throw error
  if (!data) throw Object.assign(new Error('Battle not found.'), { status: 404 })
  return data
}

async function activateRankedMatch(db, matchId, generated) {
  const startedAt = new Date().toISOString()
  const { data, error } = await db.from('rival_matches').update({
    title: generated.title,
    quiz: generated.items,
    question_count: generated.items.length,
    status: 'active',
    started_at: startedAt,
  }).eq('id', matchId).eq('status', 'generating').select().maybeSingle()
  if (error) throw error
  if (data) return data

  // Another request may have completed this transition while quiz generation was running.
  // Read the current state instead of asking PostgREST to coerce an empty result to one object.
  const current = await getMatchRecord(db, matchId)
  if (current.status === 'active') return current
  throw Object.assign(new Error('This matchmaking request ended before the arena was ready. Please search again.'), { status: 409 })
}

async function getPlayers(db, matchId) {
  const { data, error } = await db.from('rival_match_players').select('*').eq('match_id', matchId).order('joined_at')
  if (error) throw error
  return data || []
}

async function getPracticeRivals(db, matchId) {
  const { data, error } = await db.from('rival_match_bots').select('*').eq('match_id', matchId)
  if (error) throw error
  return data || []
}

async function awardPoints(db, userId, match, points) {
  const sourceKind = match.mode === 'ranked' ? 'rival_ranked' : 'rival_friend'
  const { data: inserted, error } = await db.from('student_point_events').insert({ user_id: userId, source_kind: sourceKind, source_id: match.id, points, description: match.mode === 'ranked' ? 'Won a ranked Rivals battle' : 'Won a friend battle' }).select('id').maybeSingle()
  if (error?.code === '23505') return
  if (error) throw error
  if (!inserted) return
  const { data: stats, error: statsError } = await db.from('student_stats').select('study_points').eq('user_id', userId).maybeSingle()
  if (statsError) throw statsError
  const next = Number(stats?.study_points || 0) + points
  const { error: updateError } = await db.from('student_stats').upsert({ user_id: userId, study_points: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (updateError) throw updateError
}

async function deductForfeitPoints(db, userId) {
  const { data: stats, error } = await db.from('student_stats').select('study_points').eq('user_id', userId).maybeSingle()
  if (error) throw error
  const current = Number(stats?.study_points || 0)
  const deducted = Math.min(15, current)
  const { error: updateError } = await db.from('student_stats').upsert({ user_id: userId, study_points: Math.max(0, current - 15), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (updateError) throw updateError
  return deducted
}

async function finalizeMatch(db, match, forcedWinnerKey = null) {
  if (!['active', 'finishing'].includes(match.status)) return match
  const players = await getPlayers(db, match.id)
  const bots = await getPracticeRivals(db, match.id)
  const contestants = [
    ...players.map(player => ({ ...player, player_key: player.user_id, is_bot: false })),
    ...bots.map(bot => ({ ...bot, player_key: `practice:${bot.id}`, is_bot: true })),
  ]
  const submitted = contestants.filter(player => player.submitted_at)
  const expired = match.finish_deadline && new Date(match.finish_deadline) <= new Date()
  if (!forcedWinnerKey && (!submitted.length || (!expired && submitted.length < contestants.length))) return match

  const forfeited = contestant => !contestant.is_bot && contestant.answers?.__forfeited === true
  const standings = [...contestants].sort((a, b) => (Number(forfeited(a)) - Number(forfeited(b))) || (Number(b.correct_answers || 0) - Number(a.correct_answers || 0)) || (Number(a.elapsed_ms ?? Number.MAX_SAFE_INTEGER) - Number(b.elapsed_ms ?? Number.MAX_SAFE_INTEGER)))
  const best = forcedWinnerKey ? contestants.find(player => player.player_key === forcedWinnerKey) : standings[0]
  const tied = !forcedWinnerKey && standings[1] && !forfeited(best) && !forfeited(standings[1]) && Number(standings[1].correct_answers || 0) === Number(best.correct_answers || 0) && Number(standings[1].elapsed_ms || 0) === Number(best.elapsed_ms || 0)
  const winnerId = tied || best?.is_bot ? null : best?.user_id || null
  const winnerBotId = tied || !best?.is_bot ? null : best?.id || null
  const completedAt = new Date().toISOString()
  const { data: claimed, error: claimError } = await db.from('rival_matches').update({ status: 'completed', winner_user_id: winnerId, winner_bot_id: winnerBotId, completed_at: completedAt }).eq('id', match.id).in('status', ['active', 'finishing']).select().maybeSingle()
  if (claimError) throw claimError
  if (!claimed) return getMatchRecord(db, match.id)

  const ratings = new Map()
  if (match.mode === 'ranked' && contestants.length === 2) {
    for (const player of players) ratings.set(player.user_id, Number((await ensureRivalProfile(db, player.user_id)).rating || 900))
    for (const bot of bots) ratings.set(`practice:${bot.id}`, Number(bot.rating_before || 900))
  }
  for (const player of players) {
    const profile = await ensureRivalProfile(db, player.user_id)
    const won = winnerId === player.user_id
    const draw = !winnerId && !winnerBotId
    let rating = Number(profile.rating || 900)
    if (match.mode === 'ranked' && contestants.length === 2) {
      const opponent = contestants.find(item => item.player_key !== player.user_id)
      const expected = 1 / (1 + 10 ** ((ratings.get(opponent.player_key) - rating) / 400))
      rating = Math.max(0, Math.round(rating + 32 * ((draw ? 0.5 : won ? 1 : 0) - expected)))
    }
    const streak = won ? Number(profile.current_win_streak || 0) + 1 : 0
    const changes = {
      rating,
      total_battles: Number(profile.total_battles || 0) + 1,
      ranked_wins: Number(profile.ranked_wins || 0) + (match.mode === 'ranked' && won ? 1 : 0),
      ranked_losses: Number(profile.ranked_losses || 0) + (match.mode === 'ranked' && !won && !draw ? 1 : 0),
      friend_wins: Number(profile.friend_wins || 0) + (match.mode === 'friend' && won ? 1 : 0),
      current_win_streak: streak,
      best_win_streak: Math.max(Number(profile.best_win_streak || 0), streak),
    }
    const { error } = await db.from('rival_profiles').update(changes).eq('user_id', player.user_id)
    if (error) throw error
    const { error: playerError } = await db.from('rival_match_players').update({ rating_after: rating }).eq('match_id', match.id).eq('user_id', player.user_id)
    if (playerError) throw playerError
  }
  if (winnerId) await awardPoints(db, winnerId, match, match.mode === 'ranked' ? 100 : 35)
  return claimed
}

async function advancePracticeRival(db, match) {
  if (!['active', 'finishing'].includes(match.status) || !match.started_at) return match
  const bots = await getPracticeRivals(db, match.id)
  const bot = bots[0]
  if (!bot || bot.submitted_at) return match
  const dueAt = new Date(match.started_at).getTime() + Number(bot.planned_elapsed_ms)
  if (Date.now() < dueAt) return match
  const submittedAt = new Date(dueAt).toISOString()
  const { error } = await db.from('rival_match_bots').update({ correct_answers: bot.target_correct, elapsed_ms: bot.planned_elapsed_ms, submitted_at: submittedAt }).eq('id', bot.id).is('submitted_at', null)
  if (error) throw error
  if (match.status === 'active') {
    const deadline = new Date(dueAt + FINISH_WINDOW_MS).toISOString()
    const { data, error: matchError } = await db.from('rival_matches').update({ status: 'finishing', finish_deadline: deadline }).eq('id', match.id).eq('status', 'active').select().maybeSingle()
    if (matchError) throw matchError
    if (data) match = data
  }
  return match
}

async function serializeMatch(db, match, userId) {
  match = await advancePracticeRival(db, match)
  if (match.status === 'finishing' && match.finish_deadline && Date.now() > new Date(match.finish_deadline).getTime() + SUBMISSION_GRACE_MS) match = await finalizeMatch(db, match)
  let [players, bots] = await Promise.all([getPlayers(db, match.id), getPracticeRivals(db, match.id)])
  if (!players.some(player => player.user_id === userId)) throw Object.assign(new Error('You are not part of this battle.'), { status: 403 })
  if (['active', 'finishing'].includes(match.status) && [...players, ...bots].every(player => player.submitted_at)) {
    match = await finalizeMatch(db, match)
    ;[players, bots] = await Promise.all([getPlayers(db, match.id), getPracticeRivals(db, match.id)])
  }
  const profiles = await profileMap(db, players.map(player => player.user_id))
  const publicPlayers = [...players.map(player => publicPlayer(player, profiles.get(player.user_id), userId)), ...bots.map(publicPracticeRival)]
  return {
    id: match.id,
    mode: match.mode,
    title: match.title,
    subject: match.subject,
    topic: match.topic,
    level: match.level,
    difficulty: match.difficulty,
    status: match.status,
    created_at: match.created_at,
    room_code: match.room_code,
    question_count: match.question_count,
    max_players: match.max_players,
    started_at: match.started_at,
    finish_deadline: match.finish_deadline,
    winner_user_id: match.winner_user_id,
    winner_bot_id: match.winner_bot_id,
    winner_key: match.winner_user_id || (match.winner_bot_id ? `practice:${match.winner_bot_id}` : null),
    completed_at: match.completed_at,
    is_host: match.host_user_id === userId,
    quiz: playableItems(match.quiz),
    players: publicPlayers,
  }
}

async function generateRankedQuiz(topic, level, difficulty, count = 10) {
  const key = process.env.OPENAI_API_KEY || process.env.iStudent_Key_OpenAi || process.env.ISTUDENT_KEY_OPENAI
  if (!key) throw Object.assign(new Error('The OpenAI key is not configured on the server.'), { status: 503 })
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string' },
      items: { type: 'array', minItems: count, maxItems: count, items: { type: 'object', additionalProperties: false, properties: { prompt: { type: 'string' }, options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } }, correct_index: { type: 'integer', minimum: 0, maximum: 3 }, explanation: { type: 'string' } }, required: ['prompt', 'options', 'correct_index', 'explanation'] } },
    },
    required: ['title', 'items'],
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini', store: false,
        input: [{ role: 'system', content: [{ type: 'input_text', text: `Create a fair competitive Studentley Rivals quiz. Use only standardized, widely taught ${level} curriculum knowledge for ${topic.subject}: ${topic.topic}. Do not use or assume any student's uploaded documents. Difficulty: ${difficulty}. Produce exactly ${count} distinct multiple-choice questions with four plausible options. Both players receive this exact saved quiz, so avoid ambiguous wording, school-specific conventions, trick questions, disputed facts and time-sensitive facts. Correctness matters more than speed. Keep reading load balanced and explanations concise.` }] }, { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ subject: topic.subject, topic: topic.topic, level, difficulty, questions: count }) }] }],
        text: { format: { type: 'json_schema', name: 'rivals_quiz', strict: true, schema } },
        max_output_tokens: 5000,
      }),
    })
  } finally { clearTimeout(timeout) }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.message || 'The ranked quiz could not be generated.')
  const text = body.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text
  if (!text) throw new Error('The ranked quiz response was empty.')
  return JSON.parse(text)
}

async function activeMatchForUser(db, userId) {
  const { data: memberships, error } = await db.from('rival_match_players').select('match_id').eq('user_id', userId).order('joined_at', { ascending: false }).limit(20)
  if (error) throw error
  const ids = (memberships || []).map(item => item.match_id)
  if (!ids.length) return null
  const { data, error: matchError } = await db.from('rival_matches').select('*').in('id', ids).in('status', ACTIVE_STATUSES).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (matchError) throw matchError
  return data
}

async function dashboard(db, userId) {
  const [profile, membershipResult, leaderResult] = await Promise.all([
    ensureRivalProfile(db, userId),
    db.from('rival_match_players').select('match_id').eq('user_id', userId).order('joined_at', { ascending: false }).limit(8),
    db.from('rival_profiles').select('user_id,rating,ranked_wins,ranked_losses').order('rating', { ascending: false }).limit(20),
  ])
  const { data: memberships, error } = membershipResult
  if (error) throw error
  const { data: leaders, error: leaderError } = leaderResult
  if (leaderError) throw leaderError
  const ids = (memberships || []).map(item => item.match_id)
  const [matchResult, positionResult, profiles] = await Promise.all([
    ids.length ? db.from('rival_matches').select('*').in('id', ids).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    db.from('rival_profiles').select('user_id', { count: 'exact', head: true }).gt('rating', profile.rating),
    profileMap(db, (leaders || []).map(item => item.user_id)),
  ])
  const { data: matches, error: matchesError } = matchResult
  if (matchesError) throw matchesError
  const { count: playersAbove, error: positionError } = positionResult
  if (positionError) throw positionError
  const history = await Promise.all((matches || []).map(match => serializeMatch(db, match, userId)))
  const leaderboard = (leaders || []).map((item, index) => ({ position: index + 1, user_id: item.user_id, display_name: safeText(profiles.get(item.user_id)?.display_name || 'Student', 80).split(' ')[0], avatar_path: profiles.get(item.user_id)?.leaderboard_visible === false ? '' : profiles.get(item.user_id)?.avatar_path || '', avatar_bucket: profiles.get(item.user_id)?.avatar_bucket || 'avatars', rating: item.rating, rank: rankFor(item.rating), wins: item.ranked_wins, losses: item.ranked_losses, is_current_user: item.user_id === userId }))
  return { profile: { ...profile, rank: rankFor(profile.rating), position: Number(playersAbove || 0) + 1 }, history, active_match: history.find(item => ACTIVE_STATUSES.includes(item.status)) || null, leaderboard }
}

async function queueRanked(db, userId, input) {
  const existing = await activeMatchForUser(db, userId)
  if (existing) return { match: await serializeMatch(db, existing, userId) }
  const rivalProfile = await ensureRivalProfile(db, userId)
  const { data: topic, error: topicError } = await db.from('rival_topics').select('*').eq('id', safeText(input.topicId, 80)).eq('active', true).maybeSingle()
  if (topicError) throw topicError
  if (!topic) throw Object.assign(new Error('Choose a curated topic.'), { status: 400 })
  const level = safeText(input.level, 40)
  if (!topic.levels.includes(level)) throw Object.assign(new Error('That level is not available for this topic.'), { status: 400 })
  const difficulty = ['Accessible', 'Exam standard', 'Challenging'].includes(input.difficulty) ? input.difficulty : 'Exam standard'
  const minimum = Number(rivalProfile.rating) - 250, maximum = Number(rivalProfile.rating) + 250
  const { data: candidates, error: candidateError } = await db.from('rival_matches').select('*').eq('mode', 'ranked').eq('status', 'waiting').eq('topic_id', topic.id).eq('level', level).eq('difficulty', difficulty).neq('host_user_id', userId).gte('rating_band', minimum).lte('rating_band', maximum).order('created_at').limit(5)
  if (candidateError) throw candidateError
  for (const candidate of candidates || []) {
    const { data: claimed, error } = await db.from('rival_matches').update({ status: 'generating' }).eq('id', candidate.id).eq('status', 'waiting').select().maybeSingle()
    if (error) throw error
    if (!claimed) continue
    const { error: joinError } = await db.from('rival_match_players').insert({ match_id: claimed.id, user_id: userId, rating_before: rivalProfile.rating })
    if (joinError) throw joinError
    try {
      const generated = await generateRankedQuiz(topic, level, difficulty, 10)
      const active = await activateRankedMatch(db, claimed.id, generated)
      return { match: await serializeMatch(db, active, userId) }
    } catch (generationError) {
      await db.from('rival_matches').update({ status: 'cancelled' }).eq('id', claimed.id)
      throw generationError
    }
  }
  const { data: match, error: createError } = await db.from('rival_matches').insert({ mode: 'ranked', host_user_id: userId, topic_id: topic.id, subject: topic.subject, topic: topic.topic, level, difficulty, title: `${topic.topic} ranked battle`, rating_band: rivalProfile.rating, question_count: 10 }).select().maybeSingle()
  if (createError) throw createError
  if (!match) throw Object.assign(new Error('Matchmaking could not create a queue entry. Please try again.'), { status: 409 })
  const { error: playerError } = await db.from('rival_match_players').insert({ match_id: match.id, user_id: userId, rating_before: rivalProfile.rating })
  if (playerError) throw playerError
  return { match: await serializeMatch(db, match, userId) }
}

async function addPracticeRival(db, userId, input) {
  const match = await getMatchRecord(db, input.matchId)
  if (match.mode !== 'ranked' || match.host_user_id !== userId) throw Object.assign(new Error('This matchmaking request is unavailable.'), { status: 403 })
  if (match.status !== 'waiting') return { match: await serializeMatch(db, match, userId) }
  const players = await getPlayers(db, match.id)
  if (players.length !== 1 || players[0].user_id !== userId) return { match: await serializeMatch(db, match, userId) }
  const { data: claimed, error: claimError } = await db.from('rival_matches').update({ status: 'generating' }).eq('id', match.id).eq('status', 'waiting').select().maybeSingle()
  if (claimError) throw claimError
  if (!claimed) return { match: await serializeMatch(db, await getMatchRecord(db, match.id), userId) }

  try {
    const generated = await generateRankedQuiz({ subject: claimed.subject, topic: claimed.topic }, claimed.level, claimed.difficulty, claimed.question_count)
    const humanRating = Number(players[0].rating_before || claimed.rating_band || 900)
    const botRating = Math.max(100, Math.min(2500, humanRating + randomBetween(-180, 180)))
    const baseAccuracy = Math.max(.3, Math.min(.92, .38 + botRating / 3000 + (Math.random() - .5) * .32))
    const outcomeRoll = Math.random()
    const targetCorrect = outcomeRoll < .18
      ? randomBetween(1, Math.max(2, Math.floor(generated.items.length * .45)))
      : outcomeRoll > .82
        ? randomBetween(Math.ceil(generated.items.length * .8), generated.items.length)
        : Math.max(1, Math.min(generated.items.length, Math.round(generated.items.length * baseAccuracy)))
    const correctSlots = new Set(generated.items.map((_, index) => index).sort(() => Math.random() - .5).slice(0, targetCorrect))
    const answers = Object.fromEntries(generated.items.map((item, index) => [index, correctSlots.has(index) ? Number(item.correct_index) : (Number(item.correct_index) + randomBetween(1, 3)) % 4]))
    const plannedElapsed = randomBetween(32000, 115000)
    const { error: botError } = await db.from('rival_match_bots').insert({
      match_id: claimed.id,
      display_name: `${practiceNames[randomBetween(0, practiceNames.length - 1)]} ${practiceInitials[randomBetween(0, practiceInitials.length - 1)]}`,
      rating_before: botRating,
      target_correct: targetCorrect,
      planned_elapsed_ms: plannedElapsed,
      answers,
    })
    if (botError) throw botError
    const active = await activateRankedMatch(db, claimed.id, generated)
    return { match: await serializeMatch(db, active, userId) }
  } catch (error) {
    await db.from('rival_matches').update({ status: 'cancelled' }).eq('id', claimed.id).eq('status', 'generating')
    throw error
  }
}

async function createFriendRoom(db, userId, input) {
  const practiceSetId = safeText(input.practiceSetId, 60)
  const { data: practiceSet, error } = await db.from('practice_sets').select('id,title,kind,items,config').eq('id', practiceSetId).eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!practiceSet || practiceSet.kind !== 'quiz' || !Array.isArray(practiceSet.items) || practiceSet.items.length < 3) throw Object.assign(new Error('Generate a quiz from your selected material first.'), { status: 400 })
  const rivalProfile = await ensureRivalProfile(db, userId)
  let match
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = roomCode()
    const created = await db.from('rival_matches').insert({ mode: 'friend', host_user_id: userId, subject: safeText(input.subject || practiceSet.config?.subjectName || 'Study material', 80), topic: safeText(input.topic || practiceSet.config?.topic || 'Custom material', 120), level: safeText(input.level || 'Mixed', 40), difficulty: safeText(input.difficulty || practiceSet.config?.difficulty || 'Mixed', 40), title: safeText(input.title || practiceSet.title, 120), quiz: practiceSet.items, question_count: practiceSet.items.length, max_players: Math.max(2, Math.min(Number(input.maxPlayers) || 8, 8)), room_code: code }).select().single()
    if (!created.error) { match = created.data; break }
    if (created.error.code !== '23505') throw created.error
  }
  if (!match) throw new Error('Could not create a unique room code. Please try again.')
  const { error: playerError } = await db.from('rival_match_players').insert({ match_id: match.id, user_id: userId, rating_before: rivalProfile.rating })
  if (playerError) throw playerError
  return { match: await serializeMatch(db, match, userId) }
}

async function joinFriendRoom(db, userId, input) {
  const code = safeText(input.code, 10).toUpperCase()
  const { data: match, error } = await db.from('rival_matches').select('*').eq('room_code', code).eq('mode', 'friend').maybeSingle()
  if (error) throw error
  if (!match || match.status !== 'waiting') throw Object.assign(new Error('That room is unavailable or has already started.'), { status: 404 })
  const players = await getPlayers(db, match.id)
  if (players.length >= match.max_players) throw Object.assign(new Error('That room is full.'), { status: 409 })
  const rivalProfile = await ensureRivalProfile(db, userId)
  const { error: joinError } = await db.from('rival_match_players').upsert({ match_id: match.id, user_id: userId, rating_before: rivalProfile.rating }, { onConflict: 'match_id,user_id', ignoreDuplicates: true })
  if (joinError) throw joinError
  return { match: await serializeMatch(db, match, userId) }
}

async function startFriendRoom(db, userId, input) {
  const match = await getMatchRecord(db, input.matchId)
  if (match.mode !== 'friend' || match.host_user_id !== userId || match.status !== 'waiting') throw Object.assign(new Error('Only the room host can start this battle.'), { status: 403 })
  const players = await getPlayers(db, match.id)
  if (players.length < 2) throw Object.assign(new Error('At least two students are needed.'), { status: 400 })
  const { data, error } = await db.from('rival_matches').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', match.id).eq('status', 'waiting').select().single()
  if (error) throw error
  return { match: await serializeMatch(db, data, userId) }
}

async function submitMatch(db, userId, input) {
  let match = await getMatchRecord(db, input.matchId)
  if (!['active', 'finishing'].includes(match.status)) throw Object.assign(new Error('This battle is not accepting answers.'), { status: 409 })
  const deadlineTime = match.finish_deadline ? new Date(match.finish_deadline).getTime() : null
  if (deadlineTime && Date.now() > deadlineTime + SUBMISSION_GRACE_MS) {
    match = await finalizeMatch(db, match)
    return { match: await serializeMatch(db, match, userId) }
  }
  const players = await getPlayers(db, match.id)
  const player = players.find(item => item.user_id === userId)
  if (!player) throw Object.assign(new Error('You are not part of this battle.'), { status: 403 })
  if (player.submitted_at) return { match: await serializeMatch(db, match, userId) }
  const answers = input.answers && typeof input.answers === 'object' ? input.answers : {}
  const items = Array.isArray(match.quiz) ? match.quiz : []
  const correct = items.reduce((total, item, index) => total + (Number(answers[index]) === Number(item.correct_index) ? 1 : 0), 0)
  const submittedAt = new Date(deadlineTime && Date.now() > deadlineTime ? deadlineTime : Date.now())
  const elapsed = Math.max(0, Math.min(24 * 60 * 60 * 1000, submittedAt - new Date(match.started_at || match.created_at)))
  const { error: submitError } = await db.from('rival_match_players').update({ answers, correct_answers: correct, elapsed_ms: elapsed, submitted_at: submittedAt.toISOString() }).eq('match_id', match.id).eq('user_id', userId).is('submitted_at', null)
  if (submitError) throw submitError
  const bots = await getPracticeRivals(db, match.id)
  if (bots[0] && !bots[0].submitted_at) {
    const revisedFinish = Math.min(Number(bots[0].planned_elapsed_ms), elapsed + randomBetween(6000, 17000))
    const { error: botTimingError } = await db.from('rival_match_bots').update({ planned_elapsed_ms: Math.max(5000, revisedFinish) }).eq('id', bots[0].id).is('submitted_at', null)
    if (botTimingError) throw botTimingError
  }
  if (match.status === 'active') {
    const deadline = new Date(submittedAt.getTime() + FINISH_WINDOW_MS).toISOString()
    const { data, error } = await db.from('rival_matches').update({ status: 'finishing', finish_deadline: deadline }).eq('id', match.id).eq('status', 'active').select().maybeSingle()
    if (error) throw error
    if (data) match = data
  }
  const refreshedPlayers = await getPlayers(db, match.id)
  const refreshedBots = await getPracticeRivals(db, match.id)
  if ([...refreshedPlayers, ...refreshedBots].every(item => item.submitted_at)) match = await finalizeMatch(db, match)
  return { match: await serializeMatch(db, match, userId), correct_answers: correct, total_questions: items.length }
}

async function forfeitMatch(db, userId, input) {
  let match = await getMatchRecord(db, input.matchId)
  if (!['active', 'finishing'].includes(match.status)) throw Object.assign(new Error('This battle can no longer be forfeited.'), { status: 409 })
  const players = await getPlayers(db, match.id)
  const player = players.find(item => item.user_id === userId)
  if (!player) throw Object.assign(new Error('You are not part of this battle.'), { status: 403 })
  if (player.submitted_at) return { match: await serializeMatch(db, match, userId), points_lost: 0 }

  const submittedAt = new Date()
  const elapsed = Math.max(0, Math.min(24 * 60 * 60 * 1000, submittedAt - new Date(match.started_at || match.created_at)))
  const { data: forfeited, error: forfeitError } = await db.from('rival_match_players').update({
    answers: { __forfeited: true },
    correct_answers: 0,
    elapsed_ms: elapsed,
    submitted_at: submittedAt.toISOString(),
  }).eq('match_id', match.id).eq('user_id', userId).is('submitted_at', null).select().maybeSingle()
  if (forfeitError) throw forfeitError
  if (!forfeited) return { match: await serializeMatch(db, await getMatchRecord(db, match.id), userId), points_lost: 0 }

  const pointsLost = await deductForfeitPoints(db, userId)
  const bots = await getPracticeRivals(db, match.id)
  const opponents = [
    ...players.filter(item => item.user_id !== userId).map(item => item.user_id),
    ...bots.map(bot => `practice:${bot.id}`),
  ]
  if (opponents.length === 1) {
    match = await finalizeMatch(db, match, opponents[0])
  } else {
    const remaining = [...players.filter(item => item.user_id !== userId), ...bots]
    if (remaining.every(item => item.submitted_at)) match = await finalizeMatch(db, match)
  }
  return { match: await serializeMatch(db, match, userId), points_lost: pointsLost }
}

function validateQuizItems(items) {
  if (!Array.isArray(items) || items.length < 3 || items.length > 30) throw Object.assign(new Error('Create between 3 and 30 questions.'), { status: 400 })
  return items.map((item, index) => {
    const prompt = safeText(item.prompt, 1000)
    const options = Array.isArray(item.options) ? item.options.slice(0, 4).map(option => safeText(option, 400)) : []
    const correctIndex = Number(item.correct_index)
    if (!prompt || options.length !== 4 || options.some(option => !option) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) throw Object.assign(new Error(`Question ${index + 1} needs a prompt, four options and one correct answer.`), { status: 400 })
    return { prompt, options, correct_index: correctIndex, explanation: safeText(item.explanation, 800) }
  })
}

async function listPublicQuizzes(db, userId) {
  const { data, error } = await db.from('rival_public_quizzes').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  const profiles = await profileMap(db, (data || []).map(item => item.creator_id))
  return { quizzes: (data || []).map(quiz => ({ ...quiz, items: playableItems(quiz.items), creator_name: safeText(profiles.get(quiz.creator_id)?.display_name || 'Student', 80).split(' ')[0], is_mine: quiz.creator_id === userId })) }
}

async function createPublicQuiz(db, userId, input) {
  const items = validateQuizItems(input.items)
  const payload = { creator_id: userId, title: safeText(input.title, 120), subject: safeText(input.subject, 80), topic: safeText(input.topic, 120), level: safeText(input.level || 'Mixed', 40), description: safeText(input.description, 500), items, is_published: true }
  if (payload.title.length < 3 || payload.subject.length < 2) throw Object.assign(new Error('Add a quiz title and subject.'), { status: 400 })
  const { data, error } = await db.from('rival_public_quizzes').insert(payload).select().single()
  if (error) throw error
  return { quiz: { ...data, items: playableItems(data.items), creator_name: 'You', is_mine: true } }
}

async function submitPublicQuiz(db, userId, input) {
  const { data: quiz, error } = await db.from('rival_public_quizzes').select('*').eq('id', input.quizId).eq('is_published', true).maybeSingle()
  if (error) throw error
  if (!quiz) throw Object.assign(new Error('Quiz not found.'), { status: 404 })
  const answers = input.answers && typeof input.answers === 'object' ? input.answers : {}
  const items = Array.isArray(quiz.items) ? quiz.items : []
  const correct = items.reduce((total, item, index) => total + (Number(answers[index]) === Number(item.correct_index) ? 1 : 0), 0)
  const score = items.length ? Math.round(correct / items.length * 10000) / 100 : 0
  const elapsed = Math.max(0, Math.min(Number(input.elapsedMs) || 0, 24 * 60 * 60 * 1000))
  const { error: attemptError } = await db.from('rival_quiz_attempts').insert({ quiz_id: quiz.id, user_id: userId, score_percent: score, correct_answers: correct, elapsed_ms: elapsed })
  if (attemptError) throw attemptError
  await db.from('rival_public_quizzes').update({ play_count: Number(quiz.play_count || 0) + 1 }).eq('id', quiz.id)
  return { score_percent: score, correct_answers: correct, total_questions: items.length }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await requireUser(request)
    const db = serviceClient()
    const action = request.body?.action
    const input = request.body?.input || {}
    if (action === 'dashboard') return response.status(200).json(await dashboard(db, user.id))
    if (action === 'topics') {
      const { data, error } = await db.from('rival_topics').select('id,subject,topic,levels').eq('active', true).order('subject').order('topic')
      if (error) throw error
      return response.status(200).json({ topics: data || [] })
    }
    if (action === 'queue_ranked') return response.status(200).json(await queueRanked(db, user.id, input))
    if (action === 'add_practice_rival') return response.status(200).json(await addPracticeRival(db, user.id, input))
    if (action === 'get_match') {
      const match = await getMatchRecord(db, input.matchId)
      return response.status(200).json({ match: await serializeMatch(db, match, user.id) })
    }
    if (action === 'cancel_match') {
      const match = await getMatchRecord(db, input.matchId)
      if (match.host_user_id !== user.id || !['waiting', 'generating'].includes(match.status)) throw Object.assign(new Error('This matchmaking request cannot be cancelled.'), { status: 403 })
      const { error } = await db.from('rival_matches').update({ status: 'cancelled' }).eq('id', match.id)
      if (error) throw error
      return response.status(200).json({ cancelled: true })
    }
    if (action === 'create_friend_room') return response.status(200).json(await createFriendRoom(db, user.id, input))
    if (action === 'join_friend_room') return response.status(200).json(await joinFriendRoom(db, user.id, input))
    if (action === 'start_friend_room') return response.status(200).json(await startFriendRoom(db, user.id, input))
    if (action === 'submit_match') return response.status(200).json(await submitMatch(db, user.id, input))
    if (action === 'forfeit_match') return response.status(200).json(await forfeitMatch(db, user.id, input))
    if (action === 'list_public_quizzes') return response.status(200).json(await listPublicQuizzes(db, user.id))
    if (action === 'create_public_quiz') return response.status(200).json(await createPublicQuiz(db, user.id, input))
    if (action === 'submit_public_quiz') return response.status(200).json(await submitPublicQuiz(db, user.id, input))
    return response.status(400).json({ error: 'Unknown Rivals action.' })
  } catch (error) {
    console.error('Rivals request failed:', error)
    const missing = ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code) || /rival_.*schema cache|relation .*rival_|winner_bot_id/i.test(error.message || '')
    return response.status(error.status || (missing ? 503 : 500)).json({ error: missing ? 'Studentley Rivals needs its database migration before it can start.' : error.message || 'The Rivals request failed.' })
  }
}
