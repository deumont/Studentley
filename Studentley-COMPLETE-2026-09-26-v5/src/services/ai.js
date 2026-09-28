import { supabase } from '../lib/supabase'

const activityListeners = new Set()
const activities = new Map()
const activityLabels = {
  analyzeDocument: 'Analyzing document', analyzeTimetable: 'Reading timetable', extractExamSchedule: 'Reading exam schedule',
  generateQuiz: 'Generating quiz', generateFlashcards: 'Generating flashcards', generateSummary: 'Generating summary',
  generateMockExam: 'Generating mock exam', generateStudyPlan: 'Generating study plan', analyzeProgress: 'Analyzing progress',
  generateVisualExplanation: 'Designing visual explanation',
  markMockExam: 'Marking completed exam', personalAssistant: 'Your personal AI is working',
}

const emitActivities = () => {
  const snapshot = [...activities.values()].sort((a, b) => b.startedAt - a.startedAt)
  activityListeners.forEach(listener => listener(snapshot))
}

function startActivity(operation) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
  activities.set(id, { id, operation, label: activityLabels[operation] || 'Generating', status: 'running', startedAt: Date.now() })
  emitActivities()
  return id
}

function targetFor(operation, input, result) {
  if (['generateQuiz', 'generateFlashcards', 'generateMockExam', 'generateVisualExplanation'].includes(operation) && result?.practiceSet) return { path: '/practice', state: { openPracticeSet: result.practiceSet } }
  if (['analyzeDocument', 'generateSummary'].includes(operation)) return { path: '/upload', state: { openDocumentResult: { documentId: input.documentId, operation: operation === 'generateSummary' ? 'summary' : 'analysis' } } }
  if (operation === 'analyzeTimetable') return { path: '/study-plan' }
  if (operation === 'extractExamSchedule') return { path: '/practice', state: { openPracticeTab: 'exams' } }
  if (operation === 'generateStudyPlan') return { path: '/study-plan' }
  if (operation === 'analyzeProgress') return { path: '/practice', state: { openPracticeTab: 'results' } }
  if (operation === 'markMockExam') return { path: '/practice', state: { openPracticeSetId: input.practiceSetId } }
  if (operation === 'personalAssistant') return { path: '/personal-ai', state: { generatedAssistantResult: result, generatedQuestion: input.question } }
  return null
}

function finishActivity(id, status, message = '', target = null) {
  const current = activities.get(id)
  if (!current) return
  activities.set(id, { ...current, status, message, target, finishedAt: Date.now() })
  emitActivities()
  setTimeout(() => { activities.delete(id); emitActivities() }, status === 'complete' ? 20000 : 9000)
}

export function dismissAIActivity(id) { activities.delete(id); emitActivities() }

export function subscribeAIActivity(listener) {
  activityListeners.add(listener)
  listener([...activities.values()].sort((a, b) => b.startedAt - a.startedAt))
  return () => activityListeners.delete(listener)
}

export const AI_OPERATIONS = Object.freeze({
  ANALYZE_DOCUMENT: 'analyzeDocument', ANALYZE_TIMETABLE: 'analyzeTimetable',
  EXTRACT_EXAM_SCHEDULE: 'extractExamSchedule', GENERATE_QUIZ: 'generateQuiz',
  GENERATE_FLASHCARDS: 'generateFlashcards', GENERATE_SUMMARY: 'generateSummary',
  GENERATE_MOCK_EXAM: 'generateMockExam', GENERATE_STUDY_PLAN: 'generateStudyPlan',
  GENERATE_VISUAL_EXPLANATION: 'generateVisualExplanation',
  ANALYZE_PROGRESS: 'analyzeProgress', MARK_MOCK_EXAM: 'markMockExam', PERSONAL_ASSISTANT: 'personalAssistant',
})

export async function requestAI(operation, input) {
  if (!Object.values(AI_OPERATIONS).includes(operation)) throw new Error('Unknown AI operation.')
  const activityId = startActivity(operation)
  try {
    const { data } = await supabase.auth.getSession()
    const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ operation, input }) })
    const text = await response.text()
    let result
    try { result = JSON.parse(text) } catch { throw new Error(response.ok ? 'The AI response was unreadable.' : 'The AI service is temporarily unavailable.') }
    if (!response.ok) throw new Error(result.message || result.error || 'The AI request could not be completed.')
    finishActivity(activityId, 'complete', '', targetFor(operation, input, result))
    return result
  } catch (error) {
    finishActivity(activityId, 'error', error.message || 'Generation failed.')
    throw error
  }
}

export const analyzeDocument = input => requestAI(AI_OPERATIONS.ANALYZE_DOCUMENT, input)
export const analyzeTimetable = input => requestAI(AI_OPERATIONS.ANALYZE_TIMETABLE, input)
export const extractExamSchedule = input => requestAI(AI_OPERATIONS.EXTRACT_EXAM_SCHEDULE, input)
export const generateQuiz = input => requestAI(AI_OPERATIONS.GENERATE_QUIZ, input)
export const generateFlashcards = input => requestAI(AI_OPERATIONS.GENERATE_FLASHCARDS, input)
export const generateSummary = input => requestAI(AI_OPERATIONS.GENERATE_SUMMARY, input)
export const generateMockExam = input => requestAI(AI_OPERATIONS.GENERATE_MOCK_EXAM, input)
export const generateVisualExplanation = input => requestAI(AI_OPERATIONS.GENERATE_VISUAL_EXPLANATION, input)
export const generateStudyPlan = input => requestAI(AI_OPERATIONS.GENERATE_STUDY_PLAN, input)
export const analyzeProgress = input => requestAI(AI_OPERATIONS.ANALYZE_PROGRESS, input)
export const markMockExam = input => requestAI(AI_OPERATIONS.MARK_MOCK_EXAM, input)
export const askPersonalAssistant = input => requestAI(AI_OPERATIONS.PERSONAL_ASSISTANT, input)
