import { supabase } from '../lib/supabase'

async function studyPartyRequest(action, input = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Your session expired. Please sign in again.')
  const response = await fetch('/api/study-party', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, input }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The Quizz Show is temporarily unavailable.')
  return result
}

export const createStudyParty = input => studyPartyRequest('create', input)
export const joinStudyParty = code => studyPartyRequest('join', { code })
export const loadStudyParty = partyId => studyPartyRequest('get', { partyId })
export const startStudyParty = partyId => studyPartyRequest('start', { partyId })
export const startStudyPartyCountdown = partyId => studyPartyRequest('start_countdown', { partyId })
export const openStudyPartyQuestion = partyId => studyPartyRequest('open_question', { partyId })
export const buzzStudyParty = partyId => studyPartyRequest('buzz', { partyId })
export const answerStudyParty = (partyId, answer) => studyPartyRequest('answer', { partyId, answer })
