import React, { useMemo } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, FileText, Flame, FolderOpen, GraduationCap, Lightbulb, Play, Sparkles, Target, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Button, EmptyState, Loader, formatDate, greeting } from '../components/UI'

const isToday = value => { const date = new Date(value), today = new Date(); return date.toDateString() === today.toDateString() }

export default function Home() {
  const { profile, data, loading, update, notify } = useApp()
  const navigate = useNavigate()
  const topics = data?.topics || [], sessions = data?.study_sessions || [], practiceSets = data?.practice_sets || [], practiceResults = data?.practice_results || []
  const todaySessions = sessions.filter(item => isToday(item.starts_at)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  const completedToday = todaySessions.filter(item => item.completed_at).length
  const progress = todaySessions.length ? Math.round(completedToday / todaySessions.length * 100) : 0
  const nextSession = todaySessions.find(item => !item.completed_at)
  const mockExams = practiceSets.filter(item => item.kind === 'mock_exam').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4)
  const streak = useMemo(() => {
    const completed = [...sessions.map(item => item.completed_at), ...practiceResults.map(item => item.completed_at)].filter(Boolean)
    const days = new Set(completed.map(value => new Date(value).toDateString()))
    let cursor = new Date()
    if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
    let count = 0
    while (days.has(cursor.toDateString())) { count++; cursor.setDate(cursor.getDate() - 1) }
    return count
  }, [sessions, practiceResults])
  if (loading && !data) return <Loader variant="dashboard" label="Loading your dashboard…" />

  const name = profile?.display_name?.split(' ')[0] || 'there'
  const dayLabel = formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })
  const completeSession = async session => {
    await update('study_sessions', session.id, { completed_at: session.completed_at ? null : new Date().toISOString() })
    notify(session.completed_at ? 'Study session reopened.' : 'Study session completed.')
  }

  return <div className="home-dashboard">
    <section className="home-command" aria-labelledby="home-title">
      <div className="home-command-copy">
        <span className="home-eyebrow"><Sparkles /> {dayLabel}</span>
        <h1 id="home-title"><span>{greeting()}, {name}.</span> What’s your next move?</h1>
        <p>{topics.length || todaySessions.length ? 'Your plan is ready. Pick up where you left off or create something new.' : 'A clear day is a blank canvas. Start with a document, a topic or a new practice set.'}</p>
        <div className="home-command-actions">
          <button className="home-primary-action" onClick={() => navigate(nextSession ? '/study-plan' : '/practice')}>
            <span><Play /></span>
            <span><small>{nextSession ? 'CONTINUE TODAY' : 'START STUDYING'}</small><b>{nextSession?.title || 'Build a practice set'}</b></span>
            <ArrowUpRight />
          </button>
          <button className="home-secondary-action" onClick={() => navigate('/upload')}><FileText /> Upload material</button>
        </div>
      </div>

      <div className="home-progress-stage" aria-label={`${progress}% of today's sessions complete`}>
        <span className="home-orbit orbit-one" /><span className="home-orbit orbit-two" />
        <div className="home-progress-ring" style={{ '--home-progress': `${progress * 3.6}deg` }}>
          <div><small>TODAY</small><strong>{progress}%</strong><span>{todaySessions.length ? `${completedToday} of ${todaySessions.length} sessions` : 'Ready to begin'}</span></div>
        </div>
        <div className="home-stage-chip chip-top"><Target /><span><small>FOCUS</small><b>{nextSession?.subjects?.name || 'Choose a subject'}</b></span></div>
        <div className="home-stage-chip chip-bottom"><Clock3 /><span><small>NEXT UP</small><b>{nextSession ? new Date(nextSession.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Whenever you’re ready'}</b></span></div>
      </div>
    </section>

    <section className="home-stat-strip" aria-label="Today at a glance">
      <Metric tone="blue" icon={FolderOpen} label="Study topics" value={topics.length} hint={topics.length === 1 ? 'workspace' : 'workspaces'} />
      <Metric tone="green" icon={Target} label="Daily progress" value={`${progress}%`} hint={todaySessions.length ? 'of your plan' : 'plan a session'} />
      <Metric tone="orange" icon={Flame} label="Study streak" value={streak || '—'} hint={streak === 1 ? 'day' : streak ? 'days' : 'complete a session'} />
      <Metric tone="violet" icon={Trophy} label="Practice runs" value={practiceResults.length} hint="completed" />
    </section>

    <section className="home-section-heading">
      <div><span>YOUR DAY</span><h2>Everything that matters, in one view.</h2></div>
      <button onClick={() => navigate('/study-plan')}>Open full plan <ArrowRight /></button>
    </section>

    <div className="home-bento">
      <section className="card home-panel home-today-panel">
        <PanelHeader index="01" icon={CalendarDays} title="Today’s timeline" meta={`${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'}`} />
        {todaySessions.length ? <div className="home-timeline">{todaySessions.map((item, index) => <button className={`home-session ${item.completed_at ? 'done' : ''}`} onClick={() => completeSession(item)} key={item.id} style={{ '--item-index': index }}>
          <time>{new Date(item.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          <span className="home-session-line"><i style={{ background: item.subjects?.color || '#2692f5' }} /></span>
          <span className="home-session-copy"><small>{item.subjects?.name || 'Study session'}</small><b>{item.title}</b></span>
          <span className="home-session-status">{item.completed_at ? <CheckCircle2 /> : <ArrowUpRight />}</span>
        </button>)}</div> : <EmptyState compact icon={CalendarDays} title="Your timeline is open" text="Add a study session and give the day a little structure."><Button variant="secondary" onClick={() => navigate('/study-plan')}>Plan a session</Button></EmptyState>}
      </section>

      <section className="card home-panel home-exam-panel">
        <PanelHeader index="02" icon={GraduationCap} title="Mock exam library" meta={`${mockExams.length} saved`} />
        {mockExams.length ? <div className="home-exam-list">{mockExams.map((item, index) => {
          const marks = item.config?.totalMarks || item.items?.reduce((sum, question) => sum + Number(question.marks || 0), 0) || 0
          return <article key={item.id} style={{ '--item-index': index }}>
            <time><strong>{marks}</strong><small>MARKS</small></time>
            <span><small>{item.config?.qualification || item.config?.subjectName || 'Personalized paper'}</small><b>{item.title}</b></span>
            <i style={{ '--exam-progress': `${Math.min(100, Math.max(18, marks))}%` }} />
          </article>
        })}</div> : <EmptyState compact icon={GraduationCap} title="No mock exams yet" text="Generate a personalized paper and mark scheme for your level."><Button variant="secondary" onClick={() => navigate('/practice', { state: { openPracticeTab: 'mock', openPracticeGenerator: 'mock' } })}>Generate mock exam</Button></EmptyState>}
        <button className="home-panel-link" onClick={() => navigate('/practice', { state: { openPracticeTab: 'mock' } })}>View mock exams <ArrowRight /></button>
      </section>

      <section className="home-launch-panel">
        <header><div><span>03 / QUICK LAUNCH</span><h2>Turn an idea into study material.</h2></div><Sparkles /></header>
        <div className="home-launch-grid">
          <Quick tone="blue" icon={FileText} index="A" title="Upload a document" sub="Notes, PDFs, images and more" onClick={() => navigate('/upload')} />
          <Quick tone="green" icon={Lightbulb} index="B" title="Generate a visual guide" sub="Explain a topic with pictures and graphs" onClick={() => navigate('/practice', { state: { openPracticeTab: 'visuals', openPracticeGenerator: 'visual' } })} />
          <Quick tone="orange" icon={GraduationCap} index="C" title="Create a mock exam" sub="Generate a paper for your exact level" onClick={() => navigate('/practice', { state: { openPracticeTab: 'mock', openPracticeGenerator: 'mock' } })} />
        </div>
      </section>
    </div>
  </div>
}

function Metric({ tone, icon: Icon, label, value, hint }) {
  return <article className={`home-metric ${tone}`}><span><Icon /></span><div><small>{label}</small><strong>{value}</strong><em>{hint}</em></div></article>
}

function PanelHeader({ index, icon: Icon, title, meta }) {
  return <header className="home-panel-header"><span className="home-panel-index">{index}</span><span className="home-panel-icon"><Icon /></span><div><small>{meta}</small><h2>{title}</h2></div></header>
}

function Quick({ tone, icon: Icon, index, title, sub, onClick }) {
  return <button className={`home-launch-card ${tone}`} onClick={onClick}><span className="home-launch-index">{index}</span><span className="home-launch-icon"><Icon /></span><span><b>{title}</b><small>{sub}</small></span><ArrowUpRight /></button>
}
