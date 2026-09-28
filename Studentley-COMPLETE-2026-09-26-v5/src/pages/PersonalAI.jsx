import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, BookOpen, CalendarCheck2, CalendarPlus, CheckCircle2, FileQuestion, FileText, GraduationCap, Layers3, Lightbulb, ListPlus, LockKeyhole, Send, Sparkles, Trash2, UserRoundCog, Volume2, VolumeX, Mic, MicOff } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { analyzeDocument, analyzeProgress, analyzeTimetable, askPersonalAssistant, extractExamSchedule, generateFlashcards, generateMockExam, generateQuiz, generateStudyPlan, generateSummary, generateVisualExplanation, getPersonalAIAudio } from '../services/ai'
import { Button, PageHeading } from '../components/UI'

const starters = [
  'Make me a 10-question quiz from this material',
  'Create a mock exam from this document',
  'Explain this topic with a visual guide',
  'Schedule a 45-minute study session tomorrow morning',
]

const welcome = {
  role: 'assistant',
  text: 'Hey—what are we working on? I can explain something, make a quiz or exam, create revision tools, or plan your study time.',
  welcome: true,
}

const actionIcons = { study_session: CalendarPlus, task: ListPlus, exam: CalendarCheck2, subject: BookOpen, quiz: FileQuestion, flashcards: Layers3, mock_exam: GraduationCap, visual_guide: Lightbulb, summary: FileText, document_analysis: FileText, study_plan: CalendarCheck2, timetable: CalendarPlus, exam_schedule: GraduationCap }
const nextMonday = () => { const value = new Date(); const day = value.getDay() || 7; value.setDate(value.getDate() - day + 8); return value.toISOString().slice(0, 10) }
const concise = (value, limit = 240) => { const text = String(value || '').trim(); if (text.length <= limit) return text; return `${text.slice(0, limit).replace(/\s+\S*$/, '')}…` }
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
  const [voiceLoadingIndex, setVoiceLoadingIndex] = useState(null)
  const [messages, setMessages] = useState(() => loadConversation(user?.id))
  const endRef = useRef(null)
  const recognitionRef = useRef(null)
  const keepListeningRef = useRef(false)
  const recognitionRestartRef = useRef(null)
  const dictationBaseRef = useRef('')
  const finalTranscriptRef = useRef('')
  const voicesRef = useRef([])
  const speechSessionRef = useRef(0)
  const speechRequestRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioSourceRef = useRef(null)
  const audioCacheRef = useRef(new Map())
  const conversationUser = useRef(user?.id)
  const currentPlan = profile?.subscription_plan || 'free'
  const selectedDocument = useMemo(() => documents.find(item => item.id === documentId), [documents, documentId])
  const selectedSubject = useMemo(() => subjects.find(item => item.id === subjectId), [subjects, subjectId])
  const mobileVoiceEnabled = mobileDevice()
  const voiceInputSupported = mobileVoiceEnabled && typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  const voiceOutputSupported = mobileVoiceEnabled && typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext)

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
    if (!mobileVoiceEnabled || !window.speechSynthesis) return undefined
    const refreshVoices = () => { voicesRef.current = window.speechSynthesis.getVoices() }
    refreshVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices)
  }, [mobileVoiceEnabled])
  useEffect(() => () => {
    keepListeningRef.current = false
    clearTimeout(recognitionRestartRef.current)
    recognitionRef.current?.abort()
    speechSessionRef.current += 1
    speechRequestRef.current?.abort()
    try { audioSourceRef.current?.stop() } catch { /* Audio may already be stopped. */ }
    audioContextRef.current?.close?.()
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

  const stopVoicePlayback = () => {
    speechSessionRef.current += 1
    speechRequestRef.current?.abort()
    speechRequestRef.current = null
    try { audioSourceRef.current?.stop() } catch { /* Audio may already be stopped. */ }
    audioSourceRef.current = null
    window.speechSynthesis?.cancel()
    setSpeakingIndex(null)
    setVoiceLoadingIndex(null)
  }

  const playDeviceVoiceFallback = (text, index, session) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance || speechSessionRef.current !== session) {
      setSpeakingIndex(null)
      setVoiceLoadingIndex(null)
      return
    }
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
      utterance.onerror = () => { setSpeakingIndex(null); setVoiceLoadingIndex(null) }
      window.speechSynthesis.speak(utterance)
    }
    setVoiceLoadingIndex(null)
    setSpeakingIndex(index)
    speakChunk(0)
  }

  const speakMessage = async (text, index) => {
    if (!voiceOutputSupported) return
    if (speakingIndex === index || voiceLoadingIndex === index) {
      stopVoicePlayback()
      return
    }
    stopVoicePlayback()
    const session = speechSessionRef.current + 1
    speechSessionRef.current = session
    setVoiceLoadingIndex(index)
    const request = new AbortController()
    speechRequestRef.current = request
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const audioContext = audioContextRef.current || new AudioContext()
      audioContextRef.current = audioContext
      if (audioContext.state === 'suspended') await audioContext.resume()
      const cacheKey = cleanSpeechText(text)
      let audioBuffer = audioCacheRef.current.get(cacheKey)
      if (!audioBuffer) {
        const audioData = await getPersonalAIAudio(cacheKey, request.signal)
        if (speechSessionRef.current !== session) return
        audioBuffer = await audioContext.decodeAudioData(audioData.slice(0))
        audioCacheRef.current.set(cacheKey, audioBuffer)
      }
      if (speechSessionRef.current !== session) return
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.onended = () => {
        if (speechSessionRef.current !== session) return
        audioSourceRef.current = null
        setSpeakingIndex(null)
      }
      audioSourceRef.current = source
      speechRequestRef.current = null
      setVoiceLoadingIndex(null)
      setSpeakingIndex(index)
      source.start(0)
    } catch (error) {
      speechRequestRef.current = null
      if (error.name === 'AbortError' || speechSessionRef.current !== session) return
      playDeviceVoiceFallback(text, index, session)
    }
  }

  const runRequestedGeneration = async generation => {
    const type = generation?.type
    if (!type) return null
    const topic = String(generation.topic || '').trim()
    const subjectName = selectedSubject?.name || String(generation.subject || '').trim()
    const difficulty = String(generation.difficulty || '').trim() || (type === 'mock_exam' ? 'Exam standard' : 'Medium')
    const common = { documentId: documentId || null, subjectId: subjectId || null, subjectName, topic, difficulty }
    const needsSource = ['quiz', 'flashcards', 'visual_guide'].includes(type)
    if (needsSource && !documentId && !subjectId && !topic) throw new Error('Select a document or subject, or name a topic first.')
    if (['summary', 'document_analysis', 'study_plan', 'timetable_import', 'exam_schedule_import', 'mock_exam'].includes(type) && !documentId) throw new Error('Select the document you want me to use first.')

    if (type === 'quiz' || type === 'flashcards') {
      const count = Math.max(5, Math.min(Number(generation.count) || (type === 'quiz' ? 10 : 20), type === 'quiz' ? 25 : 40))
      const result = type === 'quiz' ? await generateQuiz({ ...common, count, questionStyle: 'Multiple choice' }) : await generateFlashcards({ ...common, count })
      return { answer: `Done — your ${type === 'quiz' ? `${count}-question quiz` : `${count}-card flashcard set`} is ready.`, actions: [{ id: result.practiceSet.id, kind: type, title: result.practiceSet.title, detail: `${result.practiceSet.items?.length || count} ${type === 'quiz' ? 'questions' : 'cards'}`, path: '/practice' }] }
    }
    if (type === 'mock_exam') {
      const count = Math.max(5, Math.min(Number(generation.count) || 10, 20))
      const qualification = String(generation.qualification || '').trim() || profile?.school_system || 'GCSE'
      const result = await generateMockExam({ ...common, documentIds: [documentId], count, qualification, gradeYear: profile?.grade_year || qualification, examBoard: 'Auto', paperCode: '', durationMinutes: Math.max(30, Number(generation.duration_minutes) || 90), totalMarks: Math.max(20, Number(generation.total_marks) || 60), assessmentStyle: ['IB', 'A-Level', 'Abitur', 'AP'].includes(qualification) ? 'Written depth' : 'Balanced variety', questionFormats: ['multiple choice', 'matching', 'fill in', 'table or data completion', 'diagrams', 'calculations', 'structured writing', 'extended responses'], calculatorPolicy: 'Follow normal subject expectations', customInstructions: String(generation.extra_instructions || '').trim() })
      return { answer: 'Done — your mock exam and mark scheme are ready.', actions: [{ id: result.practiceSet.id, kind: 'mock_exam', title: result.practiceSet.title, detail: `${result.practiceSet.config?.totalMarks || 60} marks · PDF`, path: '/practice' }] }
    }
    if (type === 'visual_guide') {
      const result = await generateVisualExplanation({ ...common, level: profile?.grade_year || profile?.school_system || '', visualStyle: 'Colorful infographic' })
      return { answer: 'Done — your visual guide is ready.', actions: [{ id: result.practiceSet.id, kind: 'visual_guide', title: result.practiceSet.title, detail: 'Illustrated PDF guide', path: '/practice' }] }
    }
    if (type === 'summary' || type === 'document_analysis') {
      const result = type === 'summary' ? await generateSummary({ documentId }) : await analyzeDocument({ documentId })
      return { answer: `Done — I saved the ${type === 'summary' ? 'summary' : 'analysis'} under your document.`, actions: [{ id: documentId, kind: type, title: result.title || selectedDocument?.name || 'Document result', detail: type === 'summary' ? 'Saved summary' : 'Saved analysis', path: '/upload', operation: type === 'summary' ? 'summary' : 'analysis' }] }
    }
    if (type === 'study_plan') {
      const result = await generateStudyPlan({ documentId, documentIds: [documentId], weekStart: nextMonday(), dailyMinutes: profile?.daily_study_minutes || 45, sessionMinutes: 45, studyApproach: generation.study_approach || 'Balanced', focus: generation.focus || topic, replaceExisting: false })
      return { answer: `Done — I added ${result.imported || 0} study sessions to your plan.`, actions: [{ kind: 'study_plan', title: result.title || 'Personalized study plan', detail: `${result.imported || 0} sessions added`, path: '/study-plan' }] }
    }
    if (type === 'timetable_import') {
      const result = await analyzeTimetable({ documentId })
      return { answer: `Done — I imported ${result.imported || 0} classes.`, actions: [{ kind: 'timetable', title: 'Imported timetable', detail: `${result.imported || 0} classes added`, path: '/study-plan' }] }
    }
    if (type === 'exam_schedule_import') {
      const result = await extractExamSchedule({ documentId, timezone: profile?.timezone })
      return { answer: `Done — I imported ${result.imported || 0} exams.`, actions: [{ kind: 'exam_schedule', title: 'Imported exam schedule', detail: `${result.imported || 0} exams added`, path: '/practice', tab: 'exams' }] }
    }
    if (type === 'progress_review') {
      const result = await analyzeProgress({})
      const nextStep = result.next_steps?.[0] ? ` Next: ${result.next_steps[0]}` : ''
      return { answer: concise(`${result.summary || 'Your progress review is ready.'}${nextStep}`), actions: [] }
    }
    return null
  }

  const openCreatedAction = action => {
    if (!action.path) return
    if (action.path === '/practice') navigate('/practice', { state: action.id ? { openPracticeSetId: action.id } : { openPracticeTab: action.tab || 'exams' } })
    else if (action.path === '/upload') navigate('/upload', { state: { openDocumentResult: { documentId: action.id, operation: action.operation } } })
    else navigate(action.path)
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
      let answer = result.answer, actions = result.created || [], unavailable = false
      if (result.generation?.type) {
        try {
          const generated = await runRequestedGeneration(result.generation)
          if (generated) { answer = generated.answer; actions = [...actions, ...(generated.actions || [])] }
        } catch (generationError) {
          answer = `I couldn’t make that yet — ${generationError.message || 'please try again.'}`
          unavailable = true
        }
      }
      if (actions.length) await refresh()
      setMessages(items => [...items, { role: 'assistant', text: answer, sources: result.sources || [], actions, unavailable }])
    } catch (error) {
      setMessages(items => [...items, { role: 'assistant', text: error.message || 'Your personal AI could not complete that request right now.', unavailable: true }])
    } finally { setSending(false) }
  }

  const reset = () => {
    stopListening(true)
    stopVoicePlayback()
    if (user?.id) localStorage.removeItem(conversationKey(user.id))
    setMessages([welcome])
    setQuestion('')
    setVoiceError('')
    setSpeakingIndex(null)
  }

  return <>
    <PageHeading eyebrow="Personal AI" title="Your AI, shaped around your life" text="Ask for help, generate study tools, or add plans and deadlines directly to your Studentley workspace." />
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
            <div><p>{message.text}</p>{message.role === 'assistant' && voiceOutputSupported && <button type="button" className={`tutor-speak-button ${speakingIndex === index || voiceLoadingIndex === index ? 'speaking' : ''}`} onClick={() => speakMessage(message.text, index)} aria-label={speakingIndex === index || voiceLoadingIndex === index ? 'Stop voice playback' : 'Read response aloud'} title={speakingIndex === index || voiceLoadingIndex === index ? 'Stop voice playback' : 'Read aloud'}>{speakingIndex === index || voiceLoadingIndex === index ? <VolumeX /> : <Volume2 />}{voiceLoadingIndex === index ? 'Preparing…' : speakingIndex === index ? 'Stop' : 'Listen'}</button>}{message.actions?.length > 0 && <div className="personal-ai-actions">{message.actions.map((action, actionIndex) => { const Icon = actionIcons[action.kind] || CheckCircle2; return <article key={`${action.kind}-${action.id || actionIndex}`}><Icon /><span><b>{action.title}</b><small>{action.detail || `Added to ${action.kind.replace('_', ' ')}`}</small></span>{action.path ? <button type="button" onClick={() => openCreatedAction(action)}>View</button> : <CheckCircle2 />}</article> })}</div>}{message.sources?.length > 0 && <small className="tutor-sources">Sources: {message.sources.join(' · ')}</small>}{message.unavailable && <small>Please try again.</small>}</div>
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
        <footer>Conversation saved in this browser. Your AI can make mistakes, so check important details and dates.{mobileVoiceEnabled && ' Voice playback is AI-generated.'}</footer>
      </section>
    </div>
  </>
}
