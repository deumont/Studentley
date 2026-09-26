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
  const tasks = data?.tasks || [], sessions = data?.study_sessions || [], exams = data?.exams || []
  const todayTasks = tasks.filter(item => !item.completed_at && isToday(item.due_at))
  const todaySessions = sessions.filter(item => isToday(item.starts_at)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  const completedToday = todaySessions.filter(item => item.completed_at).length
  const progress = todaySessions.length ? Math.round(completedToday / todaySessions.length * 100) : null
  const upcomingExams = exams.filter(item => !item.completed_at && future(item.exam_at)).sort((a, b) => new Date(a.exam_at) - new Date(b.exam_at)).slice(0, 4)
  const streak = useMemo(() => {
    const days = new Set(sessions.filter(item => item.completed_at).map(item => new Date(item.completed_at).toDateString()))
    let count = 0, cursor = new Date(); while (days.has(cursor.toDateString())) { count++; cursor.setDate(cursor.getDate() - 1) } return count
  }, [sessions])
  if (loading && !data) return <Loader label="Loading your dashboard…" />
  const name = profile?.display_name?.split(' ')[0] || 'there'
  const completeSession = async session => { await update('study_sessions', session.id, { completed_at: session.completed_at ? null : new Date().toISOString() }); notify(session.completed_at ? 'Study session reopened.' : 'Study session completed.') }
  return <>
    <div className="dashboard-greeting"><span className="sun-orb">☀</span><div><h1>{greeting()}, {name}</h1><p>{todayTasks.length || todaySessions.length ? 'Your day is ready when you are.' : 'Let’s shape a focused day together.'}</p></div><time><CalendarDays />{formatDate(new Date(), { weekday: 'short' })}</time></div>
    <section className="metric-row">
      <Metric tone="blue" icon={ListTodo} label="Today’s tasks" value={todayTasks.length} hint={todayTasks.length === 1 ? 'due today' : 'due today'} />
      <Metric tone="green" icon={Target} label="Study progress" value={progress === null ? '—' : `${progress}%`} hint={progress === null ? 'plan a session' : 'of today’s plan'} />
      <Metric tone="violet" icon={Flame} label="Study streak" value={streak || '—'} hint={streak ? `${streak === 1 ? 'day' : 'days'}` : 'complete a session'} />
    </section>
    <div className="dashboard-grid">
      <section className="card dashboard-card"><CardHeader icon={CalendarDays} title="Today’s schedule" action="View plan" onClick={() => navigate('/study-plan')} />{todaySessions.length ? <div className="rows">{todaySessions.map(item => <button className={`schedule-item ${item.completed_at ? 'done' : ''}`} onClick={() => completeSession(item)} key={item.id}><span className="color-dot" style={{ background: item.subjects?.color || '#2692f5' }} /><span><small>{new Date(item.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small><b>{item.title}</b><em>{item.subjects?.name || 'Study session'}</em></span><CheckCircle2 /></button>)}</div> : <EmptyState compact icon={CalendarDays} title="Nothing planned today" text="Add a study session when you’re ready."><Button variant="secondary" onClick={() => navigate('/study-plan')}>Plan a session</Button></EmptyState>}</section>
      <section className="card dashboard-card"><CardHeader icon={GraduationCap} title="Upcoming exams" action="View all" onClick={() => navigate('/practice')} />{upcomingExams.length ? <div className="rows">{upcomingExams.map(item => { const days = Math.ceil((new Date(item.exam_at) - new Date()) / 86400000); return <div className="exam-item" key={item.id}><time><b>{new Date(item.exam_at).getDate()}</b><small>{new Date(item.exam_at).toLocaleString([], { month: 'short' })}</small></time><span><b>{item.title}</b><small>{item.subjects?.name || 'No subject'}</small></span><em>{days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} left`}</em></div> })}</div> : <EmptyState compact icon={GraduationCap} title="No exams yet" text="Add an exam manually or upload your exam schedule."><Button variant="secondary" onClick={() => navigate('/practice')}>Add exam</Button></EmptyState>}</section>
      <section className="card dashboard-card actions-card"><CardHeader icon={Sparkles} title="Quick actions" />
        <Quick tone="blue" icon={FileText} title="Upload document" sub="Notes, PDFs, images and more" onClick={() => navigate('/upload')} />
        <Quick tone="green" icon={Plus} title="Add a task or session" sub="Plan work around your real week" onClick={() => navigate('/study-plan')} />
        <Quick tone="violet" icon={BookOpen} title="Ask AI Tutor" sub="Get help from your material" onClick={() => navigate('/ai-tutor')} />
        <Quick tone="orange" icon={GraduationCap} title="Add an exam" sub="Track a real upcoming assessment" onClick={() => navigate('/practice')} />
      </section>
    </div>
  </>
}

function Metric({ tone, icon: Icon, label, value, hint }) { return <article className={`metric ${tone}`}><span className="icon-bubble"><Icon /></span><b>{label}</b><strong>{value}</strong><small>{hint}</small></article> }
function CardHeader({ icon: Icon, title, action, onClick }) { return <header className="card-header"><span className="icon-bubble blue"><Icon /></span><h2>{title}</h2>{action && <button onClick={onClick}>{action} <ArrowRight /></button>}</header> }
function Quick({ tone, icon: Icon, title, sub, onClick }) { return <button className={`quick-action ${tone}`} onClick={onClick}><span className="icon-bubble"><Icon /></span><span><b>{title}</b><small>{sub}</small></span><ArrowRight /></button> }
