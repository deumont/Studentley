import { requireUser } from './_auth.js'

const operations = new Set(['analyzeDocument','analyzeTimetable','extractExamSchedule','generateQuiz','generateFlashcards','generateSummary','generateMockExam','generateStudyPlan','analyzeProgress','answerStudyQuestion'])

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    await requireUser(request)
    if (!operations.has(request.body?.operation)) return response.status(400).json({ error: 'Unknown AI operation.' })
    return response.status(501).json({ code: 'AI_NOT_ENABLED', message: 'AI integration is not enabled yet. This workflow is ready and will become available when the secure AI service is connected.' })
  } catch (error) { return response.status(error.status || 500).json({ error: error.message }) }
}
