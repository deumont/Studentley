export const ACTIVE_QUIZ_SHOW_KEY = 'studentley-active-quiz-show'
const ACTIVE_QUIZ_SHOW_EVENT = 'studentley-active-quiz-show-change'

export function readActiveQuizShow() {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(window.localStorage.getItem(ACTIVE_QUIZ_SHOW_KEY) || 'null')
    if (!value?.id || Date.now() - Number(value.updatedAt || 0) > 12 * 60 * 60 * 1000) return null
    return value
  } catch { return null }
}

export function rememberActiveQuizShow(party) {
  if (typeof window === 'undefined' || !party?.id || !['waiting', 'active'].includes(party.status)) return
  const value = { id: party.id, title: party.title || 'Quizz Show', roomCode: party.room_code || '', updatedAt: Date.now() }
  window.localStorage.setItem(ACTIVE_QUIZ_SHOW_KEY, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(ACTIVE_QUIZ_SHOW_EVENT, { detail: value }))
}

export function clearActiveQuizShow(partyId) {
  if (typeof window === 'undefined') return
  const current = readActiveQuizShow()
  if (partyId && current?.id && current.id !== partyId) return
  window.localStorage.removeItem(ACTIVE_QUIZ_SHOW_KEY)
  window.dispatchEvent(new CustomEvent(ACTIVE_QUIZ_SHOW_EVENT, { detail: null }))
}

export function subscribeActiveQuizShow(listener) {
  if (typeof window === 'undefined') return () => {}
  const update = () => listener(readActiveQuizShow())
  window.addEventListener('storage', update)
  window.addEventListener(ACTIVE_QUIZ_SHOW_EVENT, update)
  return () => {
    window.removeEventListener('storage', update)
    window.removeEventListener(ACTIVE_QUIZ_SHOW_EVENT, update)
  }
}

export function openQuizShowTab(partyId, preparedWindow = null) {
  if (!partyId || typeof window === 'undefined') return false
  const url = `${window.location.origin}/quiz-show/${partyId}`
  if (preparedWindow && !preparedWindow.closed) {
    preparedWindow.location.replace(url)
    preparedWindow.focus()
    return true
  }
  const opened = window.open(url, '_blank')
  opened?.focus()
  return Boolean(opened)
}

export function prepareQuizShowTab() {
  if (typeof window === 'undefined') return null
  const gameWindow = window.open('about:blank', '_blank')
  if (!gameWindow) return null
  gameWindow.document.title = 'Opening Studentley Quizz Show…'
  gameWindow.document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;background:#061b16;color:#fff;font:700 18px system-ui"><div style="text-align:center"><div style="font-size:42px">⚡</div><p>Preparing your Quizz Show…</p></div></main>'
  return gameWindow
}
