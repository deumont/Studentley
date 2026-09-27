import React from 'react'
import { ArrowRight, BarChart3, BookOpen, Brain, CalendarDays, Check, FileQuestion, GraduationCap, MessageCircle, Sparkles, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'

const features = [
  [UploadCloud, 'Study from your own material', 'Upload notes, worksheets, presentations, textbook pages and images. Studentley keeps the generated work connected to the sources you selected.', 'blue'],
  [CalendarDays, 'A plan that fits your week', 'Build a personalized study plan around your subjects, upcoming exams, deadlines and existing timetable.', 'green'],
  [MessageCircle, 'Your personal AI', 'Ask for a short explanation, schedule a study session, add a task or turn the context in your workspace into a clear next step.', 'violet'],
  [FileQuestion, 'Quizzes and mock exams', 'Create focused quizzes or printable, multi-page mock exams with varied question styles suited to your subject and school level.', 'orange'],
  [BookOpen, 'Summaries and flashcards', 'Turn selected documents into concise revision summaries and recall cards, then find the saved result beside its source material.', 'blue'],
  [BarChart3, 'Progress, streaks and points', 'See completed study work reflected in your progress, maintain a genuine study streak and join the Studentley leaderboard when you choose.', 'green'],
]

export default function Features() {
  return <PublicLayout><main className="public-features">
    <section className="plans-hero public-container"><span className="public-pill"><Sparkles /> One connected study workspace</span><h1>Useful tools, shaped around your school life.</h1><p>Studentley connects the material you have, the time you have and the exams you are preparing for—so every generated tool has a reason to exist.</p></section>

    <section className="feature-section"><div className="public-container"><div className="feature-showcase">{features.map(([Icon, title, text, tone], index) => <article className={`feature-story ${tone} ${index < 2 ? 'wide' : ''}`} key={title}><span><Icon /></span><small>{String(index + 1).padStart(2, '0')}</small><h2>{title}</h2><p>{text}</p></article>)}</div></div></section>

    <section className="how-section"><div className="public-container context-grid"><div><span className="section-kicker">From material to action</span><h2>Start with what you really need to learn.</h2><p className="feature-lead">Upload the relevant material, connect it to a subject and choose the kind of help you need. Your plan, practice and personal AI can then work from the same context.</p><ul className="feature-checklist"><li><Check /> Keep multiple documents together</li><li><Check /> Generate a plan from selected material</li><li><Check /> Choose quizzes, explanations, flashcards or exams</li><li><Check /> Edit the result as your week changes</li></ul></div><div className="feature-callout"><span><Brain /></span><small>Personal by design</small><h3>Your workspace gives your AI context.</h3><p>Your subjects, exams, study plans and selected documents help Studentley give shorter, more relevant support.</p></div></div></section>

    <section className="public-final"><div className="public-container final-panel"><GraduationCap className="feature-final-icon" /><span className="section-kicker">Build your study system</span><h2>Bring your next exam, document or study goal.</h2><p>Start free, then choose Plus or Pro when you need more space and personalization.</p><div><Link className="public-cta large" to="/signup">Create your account <ArrowRight /></Link><Link className="public-secondary" to="/plans">Compare plans</Link></div></div></section>
  </main></PublicLayout>
}
