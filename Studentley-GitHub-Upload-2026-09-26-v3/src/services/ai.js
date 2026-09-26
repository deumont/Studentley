import { supabase } from '../lib/supabase'

export const AI_OPERATIONS = Object.freeze({
  ANALYZE_DOCUMENT: 'analyzeDocument', ANALYZE_TIMETABLE: 'analyzeTimetable',
  EXTRACT_EXAM_SCHEDULE: 'extractExamSchedule', GENERATE_QUIZ: 'generateQuiz',
  GENERATE_FLASHCARDS: 'generateFlashcards', GENERATE_SUMMARY: 'generateSummary',
  GENERATE_MOCK_EXAM: 'generateMockExam', GENERATE_STUDY_PLAN: 'generateStudyPlan',
  ANALYZE_PROGRESS: 'analyzeProgress', ANSWER_STUDY_QUESTION: 'answerStudyQuestion',
})

export async function requestAI(operation, input) {
  if (!Object.values(AI_OPERATIONS).includes(operation)) throw new Error('Unknown AI operation.')
  const { data } = await supabase.auth.getSession()
  const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ operation, input }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || result.error || 'AI integration is not enabled yet.')
  return result
}

export const analyzeDocument = input => requestAI(AI_OPERATIONS.ANALYZE_DOCUMENT, input)
export const analyzeTimetable = input => requestAI(AI_OPERATIONS.ANALYZE_TIMETABLE, input)
export const extractExamSchedule = input => requestAI(AI_OPERATIONS.EXTRACT_EXAM_SCHEDULE, input)
export const generateQuiz = input => requestAI(AI_OPERATIONS.GENERATE_QUIZ, input)
export const generateFlashcards = input => requestAI(AI_OPERATIONS.GENERATE_FLASHCARDS, input)
export const generateSummary = input => requestAI(AI_OPERATIONS.GENERATE_SUMMARY, input)
export const generateMockExam = input => requestAI(AI_OPERATIONS.GENERATE_MOCK_EXAM, input)
export const generateStudyPlan = input => requestAI(AI_OPERATIONS.GENERATE_STUDY_PLAN, input)
export const analyzeProgress = input => requestAI(AI_OPERATIONS.ANALYZE_PROGRESS, input)
export const answerStudyQuestion = input => requestAI(AI_OPERATIONS.ANSWER_STUDY_QUESTION, input)
