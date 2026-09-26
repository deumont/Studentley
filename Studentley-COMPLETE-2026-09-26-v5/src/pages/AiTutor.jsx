import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, BookOpen, FileText, LockKeyhole, MessageCircle, Send, Sparkles, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { answerStudyQuestion } from '../services/ai'
import { Button, PageHeading } from '../components/UI'

const starters = [
  'Explain this topic in simpler words',
  'Quiz me on the key ideas',
  'Help me plan what to revise first',
  'Show me where my reasoning went wrong',
]

export default function AiTutor() {
  const { data, profile } = useApp()
  const documents = data?.documents || []
  const subjects = data?.subjects?.filter(item => !item.archived_at) || []
  const [subjectId, setSubjectId] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Choose a subject or one of your documents, then ask anything about what you are studying.', welcome: true }])
  const endRef = useRef(null)
  const currentPlan = profile?.subscription_plan || 'free'
  const selectedDocument = useMemo(() => documents.find(item => item.id === documentId), [documents, documentId])

  useEffect(() => { document.title = 'AI Tutor — Studentley' }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async event => {
    event?.preventDefault()
    const text = question.trim()
    if (!text || sending) return
    setMessages(items => [...items, { role: 'user', text }])
    setQuestion('')
    setSending(true)
    try {
      const result = await answerStudyQuestion({ question: text, subjectId: subjectId || null, documentId: documentId || null, history: messages.filter(message => !message.welcome).slice(-8) })
      setMessages(items => [...items, { role: 'assistant', text: result.answer, sources: result.sources || [] }])
    } catch (error) {
      setMessages(items => [...items, { role: 'assistant', text: error.message || 'The AI Tutor could not answer right now.', unavailable: true }])
    } finally { setSending(false) }
  }

  return <>
    <PageHeading eyebrow="AI Tutor" title="Study with context, not generic answers" text="Ask questions grounded in the subject and material you choose. Studentley uses your selected context for every answer." />
    <div className="tutor-layout">
      <aside className="card tutor-context">
        <div className="tutor-panel-title"><span className="icon-bubble violet"><BookOpen /></span><div><h2>Study context</h2><p>Control what the tutor may use.</p></div></div>
        <label><span>Subject</span><select value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">No subject selected</option>{subjects.map(subject => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label>
        <label><span>Source document</span><select value={documentId} onChange={event => setDocumentId(event.target.value)}><option value="">No document selected</option>{documents.map(document => <option value={document.id} key={document.id}>{document.name}</option>)}</select></label>
        {selectedDocument && <div className="tutor-source"><FileText /><span><b>{selectedDocument.name}</b><small>Selected private source</small></span></div>}
        <div className="tutor-privacy"><LockKeyhole /><p><b>Your context stays private.</b> Only the selected material and recent conversation are sent securely for this answer.</p></div>
        <div className="tutor-allowance"><Sparkles /><span><b>{currentPlan.toUpperCase()} allowance</b><small>{currentPlan === 'free' ? '10' : currentPlan === 'plus' ? '100' : '300'} tutor requests per week</small></span></div>
      </aside>

      <section className="card tutor-chat">
        <header><div><span className="tutor-status connected"><i /> AI connected</span><h2>Studentley Tutor</h2></div><button onClick={() => setMessages([{ role: 'assistant', text: 'Choose a subject or one of your documents, then ask anything about what you are studying.', welcome: true }])} aria-label="Clear conversation"><Trash2 /></button></header>
        <div className="tutor-messages" aria-live="polite">
          {messages.map((message, index) => <div className={`tutor-message ${message.role} ${message.unavailable ? 'unavailable' : ''}`} key={`${message.role}-${index}`}>
            {message.role === 'assistant' && <span><Bot /></span>}
            <div><p>{message.text}</p>{message.sources?.length > 0 && <small className="tutor-sources">Sources: {message.sources.join(' · ')}</small>}{message.unavailable && <small>Please try again. No answer was stored.</small>}</div>
          </div>)}
          {messages.length === 1 && <div className="tutor-starters">{starters.map(starter => <button key={starter} onClick={() => setQuestion(starter)}><MessageCircle />{starter}</button>)}</div>}
          {sending && <div className="tutor-message assistant typing"><span><Bot /></span><div><i /><i /><i /></div></div>}
          <div ref={endRef} />
        </div>
        <form className="tutor-composer" onSubmit={send}><textarea rows="2" value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder="Ask a question about your material…" /><Button loading={sending} disabled={!question.trim()} aria-label="Send question"><Send /></Button></form>
        <footer>AI can make mistakes. Check important answers against your original material.</footer>
      </section>
    </div>
  </>
}
