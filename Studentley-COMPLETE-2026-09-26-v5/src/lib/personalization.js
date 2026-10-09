export const GRADES = Array.from({ length: 8 }, (_, index) => index + 5)

export const LEARNING_LEVELS = [
  { value: 0, label: "I'm struggling", detail: 'Start gently and explain every step.' },
  { value: 1, label: "I'm doing okay", detail: 'Build confidence with balanced practice.' },
  { value: 2, label: "I'm doing well", detail: 'Keep me challenged and moving forward.' },
  { value: 3, label: "I'm doing excellent!", detail: 'Give me ambitious, advanced work.' },
]

export const LEARNING_GOALS = [
  'Improve my grades',
  'Prepare for exams',
  'Understand difficult topics',
  'Make studying more fun',
  'Become one of the best students!',
]

export function curriculaForGrade(grade) {
  const value = Number(grade)
  return [
    { value: 'British', label: value >= 11 ? 'British · A Levels' : value >= 9 ? 'British · GCSE / IGCSE' : 'British curriculum', detail: value >= 11 ? 'A Levels and sixth form' : value >= 9 ? 'GCSE and IGCSE pathways' : 'Primary and lower secondary' },
    { value: 'American', label: value >= 11 ? 'American · AP / High School' : 'American curriculum', detail: value >= 11 ? 'High School and AP courses' : 'Middle and High School' },
    { value: 'IB', label: value >= 11 ? 'IB Diploma Programme' : value >= 6 ? 'IB Middle Years Programme' : 'IB Primary Years Programme', detail: value >= 11 ? 'IB DP' : value >= 6 ? 'IB MYP' : 'IB PYP' },
    ...(value >= 6 ? [{ value: 'German / Abitur', label: value >= 11 ? 'German · Abitur' : 'German curriculum', detail: value >= 11 ? 'Oberstufe and Abitur' : 'Sekundarstufe' }] : []),
    { value: 'Other', label: 'Another curriculum', detail: 'National, international, or school-specific' },
  ]
}

export function subjectsForStudent(grade, curriculum) {
  const value = Number(grade)
  const core = value <= 6
    ? ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Computing', 'Languages', 'Art']
    : ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Computer Science']
  const senior = value >= 9 ? ['Economics', 'Business', 'Psychology', 'Politics'] : ['Music', 'Art']
  const curriculumSubjects = curriculum === 'American' && value >= 9 ? ['US History'] : curriculum === 'German / Abitur' ? ['German'] : curriculum === 'IB' ? ['Individuals & Societies'] : []
  return [...new Set([...core, ...senior, ...curriculumSubjects])]
}

export function qualificationForProfile(profile) {
  const grade = Number(String(profile?.grade_year || '').match(/\d+/)?.[0])
  const system = String(profile?.school_system || '').trim()
  if (system === 'British') return grade <= 6 ? 'Primary' : grade >= 11 ? 'A-Level' : 'GCSE'
  if (system === 'American') return grade >= 11 ? 'AP' : grade <= 6 ? 'Primary' : 'Other'
  if (system === 'IB') return grade <= 5 ? 'Primary' : 'IB'
  if (system === 'German / Abitur') return grade >= 11 ? 'Abitur' : 'Other'
  if (['IGCSE', 'GCSE', 'IB', 'A-Level', 'Abitur', 'AP'].includes(system)) return system
  return Number.isFinite(grade) && grade <= 6 ? 'Primary' : 'Other'
}

export function qualificationsForProfile(profile) {
  const grade = Number(String(profile?.grade_year || '').match(/\d+/)?.[0])
  const system = String(profile?.school_system || '').trim()
  if (grade <= 6) return ['Primary', 'Other']
  if (grade <= 8) return system === 'IB' ? ['IB', 'Other'] : ['Other']
  if (grade <= 10) {
    if (system === 'British' || ['GCSE', 'IGCSE'].includes(system)) return ['GCSE', 'IGCSE', 'Other']
    if (system === 'IB') return ['IB', 'Other']
    return ['Other']
  }
  if (system === 'British' || system === 'A-Level') return ['A-Level', 'GCSE', 'IGCSE', 'Other']
  if (system === 'American' || system === 'AP') return ['AP', 'Other']
  if (system === 'IB') return ['IB', 'Other']
  if (system === 'German / Abitur' || system === 'Abitur') return ['Abitur', 'Other']
  return ['A-Level', 'IB', 'AP', 'Abitur', 'Other']
}
