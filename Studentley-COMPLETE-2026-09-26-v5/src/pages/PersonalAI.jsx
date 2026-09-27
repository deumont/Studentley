import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, BookOpen, CalendarCheck2, CalendarPlus, CheckCircle2, FileText, ListPlus, LockKeyhole, Send, Sparkles, Trash2, UserRoundCog } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { askPersonalAssistant } from '../services/ai'
import { Button, PageHeading } from '../components/UI'

const starters = [
  'Schedule a 45-minute study session tomorrow morning',
  'Add a task for the most important thing I should revise next',
  'Explain what I should focus on this week',
  'Create an exam reminder for my next assessment',
]

const welcome = {
  role: 'assistant',
  text: 'I’m your personal Studentley AI. I can use your subjects, plans, deadlines and Studio preferences to help—and I can add study sessions, tasks, exams and subjects when you ask me to.',
  welcome: true,
}

const actionIcons = { study_session: CalendarPlus, task: ListPlus, exam: CalendarCheck2, subject: BookOpen }

const conversationKey = userId => `studentley-personal-ai-conversation-${userId}`
const loadConversation = userId => {
  if (!userId) return [welcome]
  try {
    const stored = JSON.parse(localStorage.getItem(conversationKey(userId)))
    const valid = Array.isArray(stored) ? stored.filter(message => ['user', 'assistant'].includes(message?.role) && typeof message?.text === 'string').slice(-60) : []
    return valid.length ? valid : [welcome]
  } catch { return [welcome] }
}

export default function PersonalAI() {
  const location = useLocation(), navigate = useNavigate()
  const { data, profile, refresh, user } = useApp()
  const documents = data?.documents || []
  const subjects = data?.subjects?.filter(item => !item.archived_at) || []
  const [subjectId, setSubjectId] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState(() => loadConversation(user?.id))
  const endRef = useRef(null)
  const conversationUser = useRef(user?.id)
  const currentPlan = profile?.subscription_plan || 'free'
  const studioConnected = currentPlan === 'pro'
  const selectedDocument = useMemo(() => documents.find(item => item.id === documentId), [documents, documentId])

  useEffect(() => { document.title = 'Personal AI — Studentley' }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    if (!user?.id || conversationUser.current === user.id) return
    conversationUser.current = user.id
    setMessages(loadConversation(user.id))
  }, [user?.id])
  useEffect(() => {
    if (!user?.id || conversationUser.current !== user.id) return
    try { localStorage.setItem(conversationKey(user.id), JSON.stringify(messages.slice(-60))) } catch { /* Browser storage can be unavailable in private mode. */ }
  }, [messages, user?.id])
  useEffect(() => {
    const generated = location.state?.generatedAssistantResult
    if (!generated?.answer) return
    setMessages(items => {
      if (items.some(message => message.role === 'assistant' && message.text === generated.answer)) return items
      const next = [...items]
      const questionText = String(location.state?.generatedQuestion || '').trim()
      if (questionText && !next.some(message => message.role === 'user' && message.text === questionText)) next.push({ role: 'user', text: questionText })
      next.push({ role: 'assistant', text: generated.answer, sources: generated.sources || [], actions: generated.created || [] })
      return next
    })
    if (generated.created?.length) refresh()
    navigate('/personal-ai', { replace: true })
  }, [location.state, navigate, refresh])

  const send = async event => {
    event?.preventDefault()
    const text = question.trim()
    if (!text || sending) return
    const history = messages.filter(message => !message.welcome).slice(-10).map(({ role, text: messageText }) => ({ role, text: messageText }))
    setMessages(items => [...items, { role: 'user', text }])
    setQuestion('')
    setSending(true)
    try {
      const result = await askPersonalAssistant({ question: text, subjectId: subjectId || null, documentId: documentId || null, history })
      if (result.created?.length) await refresh()
      setMessages(items => [...items, { role: 'assistant', text: result.answer, sources: result.sources || [], actions: result.created || [] }])
    } catch (error) {
      setMessages(items => [...items, { role: 'assistant', text: error.message || 'Your personal AI could not complete that request right now.', unavailable: true }])
    } finally { setSending(false) }
  }

  const reset = () => { if (user?.id) localStorage.removeItem(conversationKey(user.id)); setMessages([welcome]); setQuestion('') }

  return <>
    <PageHeading eyebrow="Personal AI" title="Your AI, shaped around your life" text="Ask for help or tell it to add study sessions, tasks, exams and subjects directly to your Studentley workspace." />
    <div className="tutor-layout personal-ai-layout">
      <aside className="card tutor-context">
        <div className="tutor-panel-title"><span className="icon-bubble violet"><UserRoundCog /></span><div><h2>Your context</h2><p>Personal and private to your account.</p></div></div>
        <div className={`personal-ai-memory ${studioConnected ? 'connected' : ''}`}><Sparkles /><span><b>{studioConnected ? 'Studio personalization active' : 'Standard personalization'}</b><small>{studioConnected ? 'Your goals, learning style, free times and blocked times guide every response.' : 'Your workspace guides responses. Pro Studio adds your routines, availability and learning preferences.'}</small></span></div>
        <Link className="button secondary full" to="/personalization">{studioConnected ? 'Edit Studio preferences' : 'View Studio'}</Link>
        <label><span>Focus subject (optional)</span><select value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">Use my whole workspace</option>{subjects.map(subject => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label>
        <label><span>Source document (optional)</span><select value={documentId} onChange={event => setDocumentId(event.target.value)}><option value="">No document selected</option>{documents.map(document => <option value={document.id} key={document.id}>{document.name}</option>)}</select></label>
        {selectedDocument && <div className="tutor-source"><FileText /><span><b>{selectedDocument.name}</b><small>Selected private source</small></span></div>}
        <div className="tutor-privacy"><LockKeyhole /><p><b>You stay in control.</b> Your AI only creates workspace items when your message clearly asks it to. It never deletes or completes work for you.</p></div>
        <div className="tutor-allowance"><Sparkles /><span><b>{currentPlan.toUpperCase()} allowance</b><small>{currentPlan === 'free' ? '10' : currentPlan === 'plus' ? '100' : '300'} personal AI requests per week</small></span></div>
      </aside>

      <section className="card tutor-chat">
        <header><div><span className="tutor-status connected"><i /> Personal AI connected</span><h2>{profile?.display_name?.split(' ')[0] ? `${profile.display_name.split(' ')[0]}’s AI` : 'Your personal AI'}</h2></div><button onClick={reset} aria-label="Clear conversation"><Trash2 /></button></header>
        <div className="tutor-messages" aria-live="polite">
          {messages.map((message, index) => <div className={`tutor-message ${message.role} ${message.unavailable ? 'unavailable' : ''}`} key={`${message.role}-${index}`}>
            {message.role === 'assistant' && <span><Bot /></span>}
            <div><p>{message.text}</p>{message.actions?.length > 0 && <div className="personal-ai-actions">{message.actions.map((action, actionIndex) => { const Icon = actionIcons[action.kind] || CheckCircle2; return <article key={`${action.kind}-${action.id || actionIndex}`}><Icon /><span><b>{action.title}</b><small>{action.detail || `Added to ${action.kind.replace('_', ' ')}`}</small></span><CheckCircle2 /></article> })}</div>}{message.sources?.length > 0 && <small className="tutor-sources">Sources: {message.sources.join(' · ')}</small>}{message.unavailable && <small>Please try again. No workspace item was added.</small>}</div>
          </div>)}
          {messages.length === 1 && <div className="tutor-starters">{starters.map(starter => <button key={starter} onClick={() => setQuestion(starter)}><Sparkles />{starter}</button>)}</div>}
          {sending && <div className="tutor-message assistant typing"><span><Bot /></span><div><i /><i /><i /></div></div>}
          <div ref={endRef} />
        </div>
        <form className="tutor-composer" onSubmit={send}><textarea rows="2" value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder="Ask for help or tell your AI what to add…" /><Button loading={sending} disabled={!question.trim()} aria-label="Send request"><Send /></Button></form>
        <footer>Conversation saved in this browser. Your AI can make mistakes, so check important details and dates.</footer>
      </section>
    </div>
  </>
}
