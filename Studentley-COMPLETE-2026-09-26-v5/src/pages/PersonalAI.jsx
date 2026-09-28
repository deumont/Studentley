import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, BookOpen, CalendarCheck2, CalendarPlus, CheckCircle2, FileText, ListPlus, LockKeyhole, Mic, MicOff, Send, Sparkles, Trash2, UserRoundCog, Volume2, VolumeX } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  text: 'I’m your personal Studentley AI. I can use your subjects, plans, deadlines and selected documents to help—and I can add study sessions, tasks, exams and subjects when you ask me to.',
  welcome: true,
}

const actionIcons = { study_session: CalendarPlus, task: ListPlus, exam: CalendarCheck2, subject: BookOpen }
const mobileDevice = () => {
  if (typeof navigator === 'undefined') return false
  if (navigator.userAgentData?.mobile) return true
  return /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

const cleanSpeechText = text => String(text || '')
  .replace(/https?:\/\/\S+/g, 'link')
  .replace(/[`*_#>|]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const speechChunks = text => {
  const sentences = cleanSpeechText(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []
  return sentences.flatMap(sentence => sentence.length <= 220 ? [sentence.trim()] : sentence.match(/.{1,200}(?:\s|$)/g)?.map(part => part.trim()).filter(Boolean) || [sentence.trim()])
}

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
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [speakingIndex, setSpeakingIndex] = useState(null)
  const [messages, setMessages] = useState(() => loadConversation(user?.id))
  const endRef = useRef(null)
  const recognitionRef = useRef(null)
  const keepListeningRef = useRef(false)
  const recognitionRestartRef = useRef(null)
  const dictationBaseRef = useRef('')
  const finalTranscriptRef = useRef('')
  const voicesRef = useRef([])
  const speechSessionRef = useRef(0)
  const conversationUser = useRef(user?.id)
  const currentPlan = profile?.subscription_plan || 'free'
  const selectedDocument = useMemo(() => documents.find(item => item.id === documentId), [documents, documentId])
  const mobileVoiceEnabled = mobileDevice()
  const voiceInputSupported = mobileVoiceEnabled && typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  const voiceOutputSupported = mobileVoiceEnabled && typeof window !== 'undefined' && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)

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
  useEffect(() => {
    if (!voiceOutputSupported) return undefined
    const refreshVoices = () => { voicesRef.current = window.speechSynthesis.getVoices() }
    refreshVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices)
  }, [voiceOutputSupported])
  useEffect(() => () => {
    keepListeningRef.current = false
    clearTimeout(recognitionRestartRef.current)
    recognitionRef.current?.abort()
    speechSessionRef.current += 1
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  const stopListening = (abort = false) => {
    keepListeningRef.current = false
    clearTimeout(recognitionRestartRef.current)
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      try { abort ? recognition.abort() : recognition.stop() } catch { /* Recognition may have already ended. */ }
    }
    setListening(false)
  }

  const startRecognitionSession = () => {
    if (!keepListeningRef.current || recognitionRef.current) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      keepListeningRef.current = false
      setListening(false)
      setVoiceError('Voice input is not supported by this browser.')
      return
    }
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = /^en-/i.test(navigator.language || '') ? navigator.language : 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3
    recognition.onstart = () => { setListening(true); setVoiceError('') }
    recognition.onresult = event => {
      let interimTranscript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const best = Array.from(result).sort((left, right) => (right.confidence || 0) - (left.confidence || 0))[0]
        const words = best?.transcript?.trim()
        if (!words) continue
        if (result.isFinal) finalTranscriptRef.current = `${finalTranscriptRef.current} ${words}`.trim()
        else interimTranscript = `${interimTranscript} ${words}`.trim()
      }
      setQuestion([dictationBaseRef.current, finalTranscriptRef.current, interimTranscript].filter(Boolean).join(' ').replace(/\s+/g, ' '))
    }
    recognition.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      keepListeningRef.current = false
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setVoiceError('Microphone access was blocked. Allow it in your browser settings and try again.')
      else if (event.error === 'audio-capture') setVoiceError('No microphone was found. Check your phone’s microphone settings.')
      else setVoiceError('Voice input lost its connection. Tap the microphone to try again.')
    }
    recognition.onend = () => {
      recognitionRef.current = null
      if (keepListeningRef.current) recognitionRestartRef.current = setTimeout(startRecognitionSession, 250)
      else setListening(false)
    }
    try { recognition.start() } catch {
      recognitionRef.current = null
      keepListeningRef.current = false
      setListening(false)
      setVoiceError('Voice input could not start. Please try again.')
    }
  }

  const toggleListening = () => {
    if (keepListeningRef.current || listening) return stopListening()
    dictationBaseRef.current = question.trim()
    finalTranscriptRef.current = ''
    keepListeningRef.current = true
    setListening(true)
    setVoiceError('')
    startRecognitionSession()
  }

  const speakMessage = (text, index) => {
    if (!voiceOutputSupported) return
    if (speakingIndex === index) {
      speechSessionRef.current += 1
      window.speechSynthesis.cancel()
      setSpeakingIndex(null)
      return
    }
    window.speechSynthesis.cancel()
    const session = speechSessionRef.current + 1
    speechSessionRef.current = session
    const chunks = speechChunks(text)
    const availableVoices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices()
    const preferredVoice = [...availableVoices].sort((left, right) => {
      const score = voice => {
        const name = voice.name.toLowerCase()
        let value = /^en-(gb|us|au|ie)/i.test(voice.lang) ? 50 : /^en/i.test(voice.lang) ? 30 : -100
        if (/natural|neural|enhanced|premium|siri|samantha|ava|aria|jenny|serena|daniel|karen|google uk english|google us english/.test(name)) value += 40
        if (/compact|espeak|fred/.test(name)) value -= 60
        if (voice.localService) value += 5
        if (voice.default) value += 2
        return value
      }
      return score(right) - score(left)
    })[0]
    const speakChunk = chunkIndex => {
      if (speechSessionRef.current !== session || chunkIndex >= chunks.length) {
        if (speechSessionRef.current === session) setSpeakingIndex(null)
        return
      }
      const utterance = new window.SpeechSynthesisUtterance(chunks[chunkIndex])
      if (preferredVoice) utterance.voice = preferredVoice
      utterance.lang = preferredVoice?.lang || 'en-US'
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.onend = () => speakChunk(chunkIndex + 1)
      utterance.onerror = () => setSpeakingIndex(null)
      window.speechSynthesis.speak(utterance)
    }
    setSpeakingIndex(index)
    speakChunk(0)
  }

  const send = async event => {
    event?.preventDefault()
    if (keepListeningRef.current) stopListening()
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

  const reset = () => {
    stopListening(true)
    speechSessionRef.current += 1
    window.speechSynthesis?.cancel()
    if (user?.id) localStorage.removeItem(conversationKey(user.id))
    setMessages([welcome])
    setQuestion('')
    setVoiceError('')
    setSpeakingIndex(null)
  }

  return <>
    <PageHeading eyebrow="Personal AI" title="Your AI, shaped around your life" text="Ask for help or tell it to add study sessions, tasks, exams and subjects directly to your Studentley workspace." />
    <div className="tutor-layout personal-ai-layout">
      <aside className="card tutor-context">
        <div className="tutor-panel-title"><span className="icon-bubble violet"><UserRoundCog /></span><div><h2>Your context</h2><p>Personal and private to your account.</p></div></div>
        <div className="personal-ai-memory connected"><Sparkles /><span><b>Workspace context active</b><small>Your subjects, plans, deadlines and the source you select guide each response.</small></span></div>
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
            <div><p>{message.text}</p>{message.role === 'assistant' && voiceOutputSupported && <button type="button" className={`tutor-speak-button ${speakingIndex === index ? 'speaking' : ''}`} onClick={() => speakMessage(message.text, index)} aria-label={speakingIndex === index ? 'Stop reading response' : 'Read response aloud'} title={speakingIndex === index ? 'Stop reading' : 'Read aloud'}>{speakingIndex === index ? <VolumeX /> : <Volume2 />}{speakingIndex === index ? 'Stop' : 'Listen'}</button>}{message.actions?.length > 0 && <div className="personal-ai-actions">{message.actions.map((action, actionIndex) => { const Icon = actionIcons[action.kind] || CheckCircle2; return <article key={`${action.kind}-${action.id || actionIndex}`}><Icon /><span><b>{action.title}</b><small>{action.detail || `Added to ${action.kind.replace('_', ' ')}`}</small></span><CheckCircle2 /></article> })}</div>}{message.sources?.length > 0 && <small className="tutor-sources">Sources: {message.sources.join(' · ')}</small>}{message.unavailable && <small>Please try again. No workspace item was added.</small>}</div>
          </div>)}
          {messages.length === 1 && <div className="tutor-starters">{starters.map(starter => <button key={starter} onClick={() => setQuestion(starter)}><Sparkles />{starter}</button>)}</div>}
          {sending && <div className="tutor-message assistant typing"><span><Bot /></span><div><i /><i /><i /></div></div>}
          <div ref={endRef} />
        </div>
        <form className="tutor-composer" onSubmit={send}>
          <div className="tutor-composer-field">
            <textarea rows="2" value={question} onChange={event => { setQuestion(event.target.value); setVoiceError('') }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder={listening ? 'Listening…' : 'Ask for help or tell your AI what to add…'} />
            {(listening || voiceError) && <small className={`voice-status ${voiceError ? 'error' : ''}`} role="status">{voiceError || 'Listening… speak now. Tap the microphone again when you are finished.'}</small>}
          </div>
          {mobileVoiceEnabled && <button type="button" className={`voice-input-button ${listening ? 'listening' : ''}`} onClick={toggleListening} disabled={sending || !voiceInputSupported} aria-label={listening ? 'Stop listening' : 'Speak to your personal AI'} title={voiceInputSupported ? (listening ? 'Stop listening' : 'Speak to your AI') : 'Voice input is not supported by this browser'}>{listening ? <MicOff /> : <Mic />}</button>}
          <Button loading={sending} disabled={!question.trim()} aria-label="Send request"><Send /></Button>
        </form>
        <footer>Conversation saved in this browser. Your AI can make mistakes, so check important details and dates.</footer>
      </section>
    </div>
  </>
}
