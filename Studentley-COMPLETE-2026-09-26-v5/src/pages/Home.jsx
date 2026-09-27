import React, { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, FileText, Flame, GraduationCap, ListTodo, Plus, Sparkles, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Button, EmptyState, Loader, formatDate, greeting } from '../components/UI'

const isToday = value => { const date = new Date(value), today = new Date(); return date.toDateString() === today.toDateString() }
const future = value => new Date(value) >= new Date(new Date().setHours(0, 0, 0, 0))

export default function Home() {
  const { profile, data, loading, update, notify } = useApp()
  const navigate = useNavigate()
  const tasks = data?.tasks || [], sessions = data?.study_sessions || [], exams = data?.exams || [], practiceResults = data?.practice_results || []
  const todayTasks = tasks.filter(item => !item.completed_at && isToday(item.due_at))
  const todaySessions = sessions.filter(item => isToday(item.starts_at)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  const completedToday = todaySessions.filter(item => item.completed_at).length
  const progress = todaySessions.length ? Math.round(completedToday / todaySessions.length * 100) : null
  const upcomingExams = exams.filter(item => !item.completed_at && future(item.exam_at)).sort((a, b) => new Date(a.exam_at) - new Date(b.exam_at)).slice(0, 4)
  const streak = useMemo(() => {
    const completed = [...sessions.map(item => item.completed_at), ...practiceResults.map(item => item.completed_at)].filter(Boolean)
    const days = new Set(completed.map(value => new Date(value).toDateString()))
    let cursor = new Date()
    if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
    let count = 0
    while (days.has(cursor.toDateString())) { count++; cursor.setDate(cursor.getDate() - 1) }
    return count
  }, [sessions, practiceResults])
  if (loading && !data) return <Loader label="Loading your dashboard…" />
  const name = profile?.display_name?.split(' ')[0] || 'there'
  const de = profile?.preferred_language === 'de'
  const copy = de ? {
    greeting: new Date().getHours() < 12 ? 'Guten Morgen' : new Date().getHours() < 18 ? 'Guten Tag' : 'Guten Abend', ready: 'Dein Tag ist bereit.', shape: 'Lass uns einen konzentrierten Tag planen.', tasks: 'Heutige Aufgaben', due: 'heute fällig', progress: 'Lernfortschritt', plan: 'Einheit planen', todayPlan: 'vom heutigen Plan', streak: 'Lernserie', day: 'Tag', days: 'Tage', complete: 'Einheit abschließen', schedule: 'Heutiger Zeitplan', viewPlan: 'Plan öffnen', nothing: 'Heute ist nichts geplant', addSession: 'Füge eine Lerneinheit hinzu, wenn du bereit bist.', planSession: 'Lerneinheit planen', exams: 'Anstehende Prüfungen', viewAll: 'Alle anzeigen', noExams: 'Noch keine Prüfungen', addExamText: 'Füge eine Prüfung manuell hinzu oder lade deinen Prüfungsplan hoch.', addExam: 'Prüfung hinzufügen', quick: 'Schnellaktionen', upload: 'Dokument hochladen', uploadSub: 'Notizen, PDFs, Bilder und mehr', addWork: 'Aufgabe oder Einheit hinzufügen', addWorkSub: 'Plane deine echte Lernwoche', tutor: 'KI-Tutor fragen', tutorSub: 'Hilfe mit deinem Lernmaterial', examSub: 'Behalte eine echte Prüfung im Blick', left: 'Tage übrig', today: 'Heute', reopened: 'Lerneinheit wieder geöffnet.', completed: 'Lerneinheit abgeschlossen.'
  } : {
    greeting: greeting(), ready: 'Your day is ready when you are.', shape: 'Let’s shape a focused day together.', tasks: 'Today’s tasks', due: 'due today', progress: 'Study progress', plan: 'plan a session', todayPlan: 'of today’s plan', streak: 'Study streak', day: 'day', days: 'days', complete: 'complete a session', schedule: 'Today’s schedule', viewPlan: 'View plan', nothing: 'Nothing planned today', addSession: 'Add a study session when you’re ready.', planSession: 'Plan a session', exams: 'Upcoming exams', viewAll: 'View all', noExams: 'No exams yet', addExamText: 'Add an exam manually or upload your exam schedule.', addExam: 'Add exam', quick: 'Quick actions', upload: 'Upload document', uploadSub: 'Notes, PDFs, images and more', addWork: 'Add a task or session', addWorkSub: 'Plan work around your real week', tutor: 'Ask AI Tutor', tutorSub: 'Get help from your material', examSub: 'Track a real upcoming assessment', left: 'days left', today: 'Today', reopened: 'Study session reopened.', completed: 'Study session completed.'
  }
  const completeSession = async session => { await update('study_sessions', session.id, { completed_at: session.completed_at ? null : new Date().toISOString() }); notify(session.completed_at ? copy.reopened : copy.completed) }
  return <>
    <div className="dashboard-greeting"><span className="sun-orb">☀</span><div><h1>{copy.greeting}, {name}</h1><p>{todayTasks.length || todaySessions.length ? copy.ready : copy.shape}</p></div><time><CalendarDays />{formatDate(new Date(), { weekday: 'short' })}</time></div>
    <section className="metric-row">
      <Metric tone="blue" icon={ListTodo} label={copy.tasks} value={todayTasks.length} hint={copy.due} />
      <Metric tone="green" icon={Target} label={copy.progress} value={progress === null ? '—' : `${progress}%`} hint={progress === null ? copy.plan : copy.todayPlan} />
      <Metric tone="violet" icon={Flame} label={copy.streak} value={streak || '—'} hint={streak ? (streak === 1 ? copy.day : copy.days) : copy.complete} />
    </section>
    <div className="dashboard-grid">
      <section className="card dashboard-card"><CardHeader icon={CalendarDays} title={copy.schedule} action={copy.viewPlan} onClick={() => navigate('/study-plan')} />{todaySessions.length ? <div className="rows">{todaySessions.map(item => <button className={`schedule-item ${item.completed_at ? 'done' : ''}`} onClick={() => completeSession(item)} key={item.id}><span className="color-dot" style={{ background: item.subjects?.color || '#2692f5' }} /><span><small>{new Date(item.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small><b>{item.title}</b><em>{item.subjects?.name || (de ? 'Lerneinheit' : 'Study session')}</em></span><CheckCircle2 /></button>)}</div> : <EmptyState compact icon={CalendarDays} title={copy.nothing} text={copy.addSession}><Button variant="secondary" onClick={() => navigate('/study-plan')}>{copy.planSession}</Button></EmptyState>}</section>
      <section className="card dashboard-card"><CardHeader icon={GraduationCap} title={copy.exams} action={copy.viewAll} onClick={() => navigate('/practice')} />{upcomingExams.length ? <div className="rows">{upcomingExams.map(item => { const days = Math.ceil((new Date(item.exam_at) - new Date()) / 86400000); return <div className="exam-item" key={item.id}><time><b>{new Date(item.exam_at).getDate()}</b><small>{new Date(item.exam_at).toLocaleString([], { month: 'short' })}</small></time><span><b>{item.title}</b><small>{item.subjects?.name || (de ? 'Kein Fach' : 'No subject')}</small></span><em>{days === 0 ? copy.today : de ? `${days} ${copy.left}` : `${days} day${days === 1 ? '' : 's'} left`}</em></div> })}</div> : <EmptyState compact icon={GraduationCap} title={copy.noExams} text={copy.addExamText}><Button variant="secondary" onClick={() => navigate('/practice')}>{copy.addExam}</Button></EmptyState>}</section>
      <section className="card dashboard-card actions-card"><CardHeader icon={Sparkles} title={copy.quick} />
        <Quick tone="blue" icon={FileText} title={copy.upload} sub={copy.uploadSub} onClick={() => navigate('/upload')} />
        <Quick tone="green" icon={Plus} title={copy.addWork} sub={copy.addWorkSub} onClick={() => navigate('/study-plan')} />
        <Quick tone="violet" icon={BookOpen} title={copy.tutor} sub={copy.tutorSub} onClick={() => navigate('/ai-tutor')} />
        <Quick tone="orange" icon={GraduationCap} title={copy.addExam} sub={copy.examSub} onClick={() => navigate('/practice')} />
      </section>
    </div>
  </>
}

function Metric({ tone, icon: Icon, label, value, hint }) { return <article className={`metric ${tone}`}><span className="icon-bubble"><Icon /></span><b>{label}</b><strong>{value}</strong><small>{hint}</small></article> }
function CardHeader({ icon: Icon, title, action, onClick }) { return <header className="card-header"><span className="icon-bubble blue"><Icon /></span><h2>{title}</h2>{action && <button onClick={onClick}>{action} <ArrowRight /></button>}</header> }
function Quick({ tone, icon: Icon, title, sub, onClick }) { return <button className={`quick-action ${tone}`} onClick={onClick}><span className="icon-bubble"><Icon /></span><span><b>{title}</b><small>{sub}</small></span><ArrowRight /></button> }
