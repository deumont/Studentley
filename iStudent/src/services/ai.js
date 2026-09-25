// Deliberately local-only. Replace these demo functions with calls to a secure
// server-side API when AI is introduced; never place an API key in the browser.
const questions = [
  { topic: 'Algebra', prompt: 'Solve: 3x + 5 = 20', options: ['x = 3', 'x = 5', 'x = 7', 'x = 15'], answer: 1 },
  { topic: 'Algebra', prompt: 'Which expression is equivalent to 2(a + 4)?', options: ['2a + 4', '2a + 8', 'a + 8', '2a + 6'], answer: 1 },
  { topic: 'Forces', prompt: 'What is the unit of force?', options: ['Watt', 'Joule', 'Newton', 'Volt'], answer: 2 },
  { topic: 'Reading', prompt: 'A text’s main idea is best described as…', options: ['A small detail', 'Its central message', 'The longest paragraph', 'The title only'], answer: 1 }
]

export async function generateMockExam({ subject = 'Mathematics', count = 4 } = {}) {
  return { title: `${subject} practice exam`, questions: questions.slice(0, Number(count)) }
}

export async function generateQuiz() { return questions.slice(0, 3) }
export async function generateFlashcards() { return [{ front: 'la casa', back: 'the house' }, { front: 'la escuela', back: 'the school' }, { front: 'los libros', back: 'the books' }] }
export async function generateStudyPlan() { return [] }
