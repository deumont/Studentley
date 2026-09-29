import { supabase } from '../lib/supabase'
import { COMMUNITY_PROFILES, withCommunityRivalsLeaderboard } from '../lib/communityProfiles'

async function rivalsRequest(action, input = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Your session expired. Please sign in again.')
  const response = await fetch('/api/rivals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, input }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Studentley Rivals is temporarily unavailable.')
  return result
}

export const loadRivalsDashboard = async () => {
  const result = await rivalsRequest('dashboard')
  const leaderboard = withCommunityRivalsLeaderboard(result.leaderboard || [])
  const ownEntry = leaderboard.find(entry => entry.is_current_user)
  const communityAbove = COMMUNITY_PROFILES.filter(entry => Number(entry.rating || 0) > Number(result.profile?.rating || 0)).length
  const leaderboardPosition = ownEntry?.position || (result.profile?.position ? Number(result.profile.position) + communityAbove : null)
  return { ...result, profile: { ...result.profile, leaderboard_position: leaderboardPosition }, leaderboard }
}
export const loadRivalTopics = () => rivalsRequest('topics')
export const queueRankedBattle = input => rivalsRequest('queue_ranked', input)
export const addPracticeRival = matchId => rivalsRequest('add_practice_rival', { matchId })
export const loadRivalMatch = matchId => rivalsRequest('get_match', { matchId })
export const cancelRivalMatch = matchId => rivalsRequest('cancel_match', { matchId })
export const createFriendRoom = input => rivalsRequest('create_friend_room', input)
export const joinFriendRoom = code => rivalsRequest('join_friend_room', { code })
export const startFriendRoom = matchId => rivalsRequest('start_friend_room', { matchId })
export const submitRivalMatch = (matchId, answers) => rivalsRequest('submit_match', { matchId, answers })
export const forfeitRivalMatch = matchId => rivalsRequest('forfeit_match', { matchId })
export const loadPublicRivalQuizzes = () => rivalsRequest('list_public_quizzes')
export const createPublicRivalQuiz = input => rivalsRequest('create_public_quiz', input)
export const submitPublicRivalQuiz = (quizId, answers, elapsedMs) => rivalsRequest('submit_public_quiz', { quizId, answers, elapsedMs })
