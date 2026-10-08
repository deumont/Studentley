import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, BellRing, BookOpenCheck, BrainCircuit, Check, Clock3, Coffee, Coins, Copy, Crown, Flame, Gauge, House, Link2, LoaderCircle, LockKeyhole, Maximize2, Minimize2, PartyPopper, Pause, Play, Radio, Send, Sparkles, Target, Trophy, UploadCloud, UserPlus, Volume2, VolumeX, Zap } from 'lucide-react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, ErrorState, Field, Loader, Modal, ProfileAvatar } from '../components/UI'
import { useApp } from '../context/AppContext'
import { uploadDocument } from '../lib/data'
import { clearActiveQuizShow, openQuizShowTab, prepareQuizShowTab, rememberActiveQuizShow } from '../lib/activeQuizShow'
import { getAIAudio } from '../services/ai'
import { answerStudyParty, buzzStudyParty, continueStudyPartyHost, createStudyParty, joinStudyParty, loadStudyParty, openStudyPartyQuestion, quitStudyParty, readyStudyPartyPause, requestStudyPartyPause, respondStudyPartyDouble, spinStudyPartyWheel, startStudyParty, startStudyPartyCountdown, syncStudyParty, voteStudyPartyPause } from '../services/studyParty'

const levels = ['Primary', 'GCSE / IGCSE', 'A-Level', 'IB', 'Abitur', 'Mixed']
const roomSizes = [2, 3, 4, 5, 6, 7, 8]
const roundNames = { buzzer: 'Buzzer Round', multiple_choice: 'Multiple Choice', quick_answer: 'One Word', explain_it: 'One Word', rapid_fire: 'Rapid Fire', true_false: 'True / False' }
const formatSeconds = milliseconds => Math.max(0, Math.ceil(milliseconds / 1000))

function SetupRequired({ error }) {
  return <section className="rivals-setup card"><LockKeyhole /><span><b>Quizz Show database setup required</b><p>{error}</p><code>202609290001_ai_hosted_study_parties.sql</code></span></section>
}

export default function StudyPartyHome() {
  const { data, user, refresh } = useApp()
  const documents = data?.documents || []
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteCode = String(searchParams.get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const [mode, setMode] = useState(inviteCode ? 'join' : 'create')
  const defaults = location.state?.topicDefaults || {}
  const [form, setForm] = useState({ title: defaults.topic ? `${defaults.topic} Quizz Show` : 'Friday Quizz Show', subject: defaults.subject || '', topic: defaults.topic || '', topicId: defaults.topicId || '', level: 'GCSE / IGCSE', difficulty: 'Adaptive', maxPlayers: 8, questionCount: 12, documentId: defaults.documentId || '', customInstructions: '' })
  const [code, setCode] = useState(inviteCode)
  const [loading, setLoading] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState('')
  const [generationStartedAt, setGenerationStartedAt] = useState(null), [generationSeconds, setGenerationSeconds] = useState(0)
  const autoJoined = useRef(false)

  useEffect(() => { document.title = 'Quizz Show — Studentley Rivals' }, [])
  useEffect(() => {
    if (!location.state?.topicDefaults) return
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])
  useEffect(() => {
    if (!generationStartedAt) return
    const update = () => setGenerationSeconds(Math.floor((Date.now() - generationStartedAt) / 1000))
    update()
    const timer = setInterval(update, 250)
    return () => clearInterval(timer)
  }, [generationStartedAt])

  const joinWithCode = useCallback(async (value, preparedWindow = null) => {
    if (value.length !== 6) return
    setLoading(true); setError('')
    try {
      const result = await joinStudyParty(value)
      rememberActiveQuizShow(result.party)
      if (!openQuizShowTab(result.party.id, preparedWindow)) navigate(`/quiz-show/${result.party.id}`)
    }
    catch (problem) { preparedWindow?.close(); setError(problem.message) }
    finally { setLoading(false) }
  }, [navigate])

  useEffect(() => {
    if (!inviteCode || autoJoined.current) return
    autoJoined.current = true
    joinWithCode(inviteCode)
  }, [inviteCode, joinWithCode])

  const upload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const created = await uploadDocument({ userId: user.id, file, topicId: form.topicId || null, category: 'study_material' })
      await refresh()
      setForm(value => ({ ...value, documentId: created.id }))
    } catch (problem) { setError(problem.message) }
    finally { setUploading(false); event.target.value = '' }
  }

  const create = async event => {
    event.preventDefault(); const gameWindow = prepareQuizShowTab(); setLoading(true); setError(''); setGenerationSeconds(0); setGenerationStartedAt(Date.now())
    try {
      const result = await createStudyParty(form)
      rememberActiveQuizShow(result.party)
      if (!openQuizShowTab(result.party.id, gameWindow)) navigate(`/quiz-show/${result.party.id}`)
    } catch (problem) { gameWindow?.close(); setError(problem.message) }
    finally { setLoading(false); setGenerationStartedAt(null) }
  }

  const join = event => { event.preventDefault(); joinWithCode(code, prepareQuizShowTab()) }

  return <>
    <div className="rivals-page-heading study-party-heading"><div><span className="rivals-kicker"><PartyPopper /> AI-hosted Quizz Show</span><h1>Turn revision into a live game show.</h1><p>Invite friends, hit the buzzer, steal points and let Studentley run every round.</p></div><div className="study-party-host-chip"><BrainCircuit /><span><small>Your host</small><b>Studentley AI</b></span></div></div>
    <section className="study-party-feature-strip">
      <article><BellRing /><span><b>Live buzzer</b><small>First tap gets the answer</small></span></article>
      <article><Gauge /><span><b>Adaptive rounds</b><small>Difficulty follows the group</small></span></article>
      <article><Trophy /><span><b>Real rewards</b><small>Win SP and build hot streaks</small></span></article>
    </section>
    <div className="rivals-switch study-party-switch"><button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}><PartyPopper /> Host a show</button><button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}><UserPlus /> Join a show</button></div>
    {error && (error.includes('migration') || error.includes('database setup') ? <SetupRequired error={error} /> : <ErrorState text={error} />)}
    {mode === 'create' ? <form className="card study-party-form" onSubmit={create}>
      <header><span><Sparkles /></span><div><h2>Set up the room</h2><p>Choose a topic or upload material. The AI host creates a balanced mix of six round types.</p></div></header>
      <Field label="Study material" hint="Optional when you enter a clear topic below."><div className="rivals-document-pick"><select value={form.documentId} onChange={event => setForm({ ...form, documentId: event.target.value })}><option value="">Use a topic only</option>{documents.map(document => <option value={document.id} key={document.id}>{document.name}</option>)}</select><label className="button rivals-secondary"><UploadCloud /> {uploading ? 'Uploading…' : 'Upload new'}<input hidden type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" onChange={upload} /></label></div></Field>
      <div className="ranked-form-grid"><Field label="Show name"><input required minLength="3" maxLength="120" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></Field><Field label="Subject"><input required value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} placeholder="e.g. Biology" /></Field><Field label="Topic"><input required={!form.documentId} value={form.topic} onChange={event => setForm({ ...form, topic: event.target.value })} placeholder="e.g. Cell division" /></Field><Field label="Grade / level"><select value={form.level} onChange={event => setForm({ ...form, level: event.target.value })}>{levels.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Question set"><select value={form.questionCount} onChange={event => setForm({ ...form, questionCount: Number(event.target.value) })}><option value="12">12 questions · Quick show</option><option value="18">18 questions · Full show</option><option value="24">24 questions · Marathon</option></select></Field><Field label="Room size"><div className="friend-player-count">{roomSizes.map(value => <button type="button" className={form.maxPlayers === value ? 'selected' : ''} onClick={() => setForm({ ...form, maxPlayers: value })} key={value}>{value}</button>)}</div></Field></div>
      <Field label="Your prompt" hint="Optional — tell the AI host what to focus on or how to shape the rounds."><textarea value={form.customInstructions} onChange={event => setForm({ ...form, customInstructions: event.target.value })} placeholder="e.g. Focus on key definitions, keep calculations short, and make the final round challenging." /></Field>
      {generationStartedAt && <div className="study-party-generation-clock" role="status" aria-live="polite"><span><Clock3 /></span><div><b>Generating your Quizz Show</b><small>The AI host is assembling questions and rounds…</small></div><strong>{String(Math.floor(generationSeconds / 60)).padStart(2, '0')}:{String(generationSeconds % 60).padStart(2, '0')}</strong></div>}
      <Button className="rivals-primary full" loading={loading || uploading} disabled={!form.documentId && !form.topic}><BrainCircuit /> Let the AI host build the show</Button>
    </form> : <form className="card join-room-form study-party-join" onSubmit={join}><div className="join-code-icon"><PartyPopper /></div><span className="rivals-kicker">Join the live room</span><h2>Enter the show code</h2><p>You can also open the invite link sent by the host.</p><input required autoCapitalize="characters" maxLength={6} value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC123" /><Button className="rivals-primary full" loading={loading} disabled={code.length !== 6}>Join Quizz Show <ArrowRight /></Button></form>}
  </>
}

export function StudyPartyRoom() {
  const { id } = useParams()
  const { refresh } = useApp()
  const navigate = useNavigate()
  const [party, setParty] = useState(null), [loading, setLoading] = useState(true), [working, setWorking] = useState(false), [error, setError] = useState('')
  const [answer, setAnswer] = useState(''), [now, setNow] = useState(Date.now()), [copied, setCopied] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const [showQuit, setShowQuit] = useState(false), [quitting, setQuitting] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true), [voiceReady, setVoiceReady] = useState(false), [voiceStatus, setVoiceStatus] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement)), [scoreChanges, setScoreChanges] = useState({}), [leadChange, setLeadChange] = useState('')
  const [clockOffset, setClockOffset] = useState(0), [syncWaiting, setSyncWaiting] = useState('')
  const audioContextRef = useRef(null), audioSourceRef = useRef(null), speechRequestRef = useRef(null), spokenRef = useRef(new Set())
  const speechQueueRef = useRef(Promise.resolve()), previousBoardRef = useRef({}), previousRanksRef = useRef({}), lastBoardKeyRef = useRef('')
  const loadInFlightRef = useRef(false), loadedOnceRef = useRef(false), syncEpochRef = useRef(0), mountedRef = useRef(true)

  const load = useCallback(async (reportError = false) => {
    if (loadInFlightRef.current) return
    loadInFlightRef.current = true
    const requestEpoch = syncEpochRef.current
    try {
      const nextParty = (await loadStudyParty(id)).party
      if (requestEpoch === syncEpochRef.current) {
        setParty(nextParty)
        if (['waiting', 'active'].includes(nextParty.status)) rememberActiveQuizShow(nextParty)
        else clearActiveQuizShow(nextParty.id)
      }
      if (!loadedOnceRef.current) setError('')
      loadedOnceRef.current = true
    } catch (problem) {
      if (reportError || !loadedOnceRef.current) setError(problem.message)
    } finally {
      loadInFlightRef.current = false
      if (reportError || !loadedOnceRef.current) setLoading(false)
    }
  }, [id])

  const runSynchronizedTransition = useCallback(async (request, label) => {
    while (mountedRef.current) {
      syncEpochRef.current += 1
      const result = await request()
      if (!mountedRef.current) return result
      setParty(result.party)
      if (!result.waiting_for_sync) { setSyncWaiting(''); return result }
      const names = result.waiting_for || result.party?.sync?.waiting_for || []
      setSyncWaiting(names.length ? `Waiting for ${names.join(' and ')} to catch up…` : label)
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    return null
  }, [])

  useEffect(() => {
    mountedRef.current = true
    document.title = 'Live Quizz Show — Studentley'
    document.body.classList.add('quiz-show-mode')
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreen)
    load(true)
    return () => { mountedRef.current = false; document.body.classList.remove('quiz-show-mode'); document.removeEventListener('fullscreenchange', onFullscreen) }
  }, [load])
  useEffect(() => {
    if (!party || party.status === 'completed') return
    let cancelled = false
    let timer
    const delay = party.status === 'active' ? 700 : 1200
    const poll = async () => {
      await load()
      if (!cancelled) timer = setTimeout(poll, delay)
    }
    timer = setTimeout(poll, delay)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [party?.phase, party?.status, load])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer) }, [])
  useEffect(() => {
    if (!party?.server_time) return
    setClockOffset(new Date(party.server_time).getTime() - Date.now())
  }, [party?.server_time])
  useEffect(() => {
    const token = party?.sync?.token
    if (!party?.id || !token || party.status === 'completed' || party.status === 'cancelled') return undefined
    let cancelled = false
    let timer
    const acknowledge = async () => {
      try {
        await syncStudyParty(party.id, token)
      } catch { /* The normal room poll will reconnect presence. */ }
      if (!cancelled) timer = setTimeout(acknowledge, 7000)
    }
    acknowledge()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [party?.id, party?.status, party?.sync?.token])
  useEffect(() => { setAnswer('') }, [party?.current_question, party?.phase, party?.buzzed_by])
  useEffect(() => { if (party?.status === 'completed' || party?.status === 'cancelled') clearActiveQuizShow(party.id) }, [party?.id, party?.status])
  useEffect(() => {
    if (!party?.players?.length) return
    const currentScores = Object.fromEntries(party.players.map(player => [player.user_id, Number(player.score || 0)]))
    const currentRanks = Object.fromEntries(party.players.map((player, index) => [player.user_id, index + 1]))
    if (party.status === 'waiting' || !Object.keys(previousBoardRef.current).length) {
      previousBoardRef.current = currentScores
      previousRanksRef.current = currentRanks
      return
    }
    if (!['reveal', 'double_reveal', 'wheel_result'].includes(party.phase)) return
    const boardKey = `${party.current_question}-${party.phase}-${party.host_message}`
    if (lastBoardKeyRef.current === boardKey) return
    const changes = Object.fromEntries(party.players.map((player, index) => [player.user_id, {
      points: Number(player.score || 0) - Number(previousBoardRef.current[player.user_id] || 0),
      places: Number(previousRanksRef.current[player.user_id] || index + 1) - (index + 1),
    }]))
    const oldLeader = Object.entries(previousRanksRef.current).find(([, rank]) => rank === 1)?.[0]
    const newLeader = party.players[0]?.user_id
    setScoreChanges(changes)
    setLeadChange(oldLeader && newLeader && oldLeader !== newLeader ? party.players[0].display_name : '')
    previousBoardRef.current = currentScores
    previousRanksRef.current = currentRanks
    lastBoardKeyRef.current = boardKey
  }, [party?.current_question, party?.host_message, party?.phase, party?.players, party?.status])

  const stopHostVoice = useCallback(() => {
    speechRequestRef.current?.abort()
    speechRequestRef.current = null
    try { audioSourceRef.current?.stop() } catch { /* Audio may already be stopped. */ }
    audioSourceRef.current = null
  }, [])

  const armHostVoice = useCallback(async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) throw new Error('Audio is not supported by this browser.')
      const context = audioContextRef.current || new AudioContext()
      audioContextRef.current = context
      if (context.state === 'suspended') await context.resume()
      setVoiceReady(true)
      setVoiceStatus('')
      return context
    } catch {
      setVoiceReady(false)
      setVoiceStatus('Tap the sound button to enable the host voice.')
      return null
    }
  }, [])

  const speakHostLine = useCallback(async text => {
    if (!voiceEnabled || !text) return false
    stopHostVoice()
    let context = await armHostVoice()
    if (!context) return false
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const request = new AbortController()
      let source = null
      let requestTimeout = null
      speechRequestRef.current = request
      try {
        setVoiceStatus(attempt ? 'Reconnecting the AI host voice…' : 'Studentley is speaking…')
        requestTimeout = window.setTimeout(() => request.abort(), 18000)
        const audioData = await getAIAudio(text, request.signal, 'quiz_show')
        window.clearTimeout(requestTimeout)
        requestTimeout = null
        if (context.state === 'suspended') await context.resume()
        const audioBuffer = await context.decodeAudioData(audioData.slice(0))
        await new Promise((resolve, reject) => {
          source = context.createBufferSource()
          audioSourceRef.current = source
          source.buffer = audioBuffer
          source.connect(context.destination)
          source.onended = resolve
          source.start(0)
          request.signal.addEventListener('abort', () => { try { source.stop() } catch { /* Already stopped. */ }; reject(Object.assign(new Error('Stopped'), { name: 'AbortError' })) }, { once: true })
        })
        setVoiceStatus('')
        return true
      } catch (problem) {
        if (problem.name === 'AbortError') return false
        if (attempt === 2) {
          setVoiceStatus('The AI host voice is reconnecting for the next announcement.')
          return false
        }
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
        context = await armHostVoice()
        if (!context) return false
      } finally {
        if (requestTimeout) window.clearTimeout(requestTimeout)
        if (speechRequestRef.current === request) speechRequestRef.current = null
        if (audioSourceRef.current === source) audioSourceRef.current = null
      }
    }
    return false
  }, [armHostVoice, stopHostVoice, voiceEnabled])

  const queueHostLine = useCallback(text => {
    const queued = speechQueueRef.current.catch(() => false).then(() => speakHostLine(text))
    speechQueueRef.current = queued
    return queued
  }, [speakHostLine])

  const markVoiceDone = useCallback(async snapshot => {
    const token = snapshot?.sync?.token
    if (!snapshot?.id || !token) return
    for (let attempt = 0; attempt < 6 && mountedRef.current; attempt += 1) {
      try {
        await syncStudyParty(snapshot.id, token, true)
        return
      } catch {
        await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)))
      }
    }
  }, [])

  useEffect(() => {
    if (!party || party.status !== 'active' || !party.question) return
    if (!party.sync?.all_ready) return
    const buzzerQuestion = Boolean(party.question.requires_buzzer)
    const buzzerQuestionLive = party.phase === 'question' && buzzerQuestion && !party.buzzed_by
    const spokenLine = ['reveal', 'double_reveal', 'wheel_result'].includes(party.phase)
      ? party.reveal_announcement
      : ['show_intro', 'intermission', 'double_offer', 'wheel_offer', 'pause_vote', 'paused', 'resume'].includes(party.phase)
        ? party.host_message
        : ''
    const key = party.phase === 'intro'
      ? `${buzzerQuestion ? 'buzzer-countdown' : 'question'}-${party.current_question}`
      : party.phase === 'double_intro'
        ? `double-question-${party.current_question}`
        : buzzerQuestionLive
          ? `buzzer-question-${party.current_question}`
        : spokenLine
          ? `${party.phase}-${party.current_question}-${spokenLine}`
          : ''
    if (!key || spokenRef.current.has(key)) return
    spokenRef.current.add(key)
    const run = async () => {
      if (party.phase === 'intro' && buzzerQuestion) {
        const spoken = await queueHostLine(party.host_message)
        if (!spoken) await new Promise(resolve => setTimeout(resolve, 1200))
        const voiceDone = markVoiceDone(party)
        if (party.is_host) {
          try { await runSynchronizedTransition(() => startStudyPartyCountdown(party.id), 'Synchronizing the countdown…') }
          catch (problem) { setError(problem.message); await load() }
        } else await voiceDone
        return
      }
      if (buzzerQuestionLive) {
        const waitForSharedOpening = Math.max(0, new Date(party.question_opens_at || 0).getTime() - (Date.now() + clockOffset))
        if (waitForSharedOpening) await new Promise(resolve => setTimeout(resolve, waitForSharedOpening))
        const spoken = await queueHostLine(party.question.voice_prompt || party.question.prompt)
        if (!spoken) await new Promise(resolve => setTimeout(resolve, 1200))
        void markVoiceDone(party)
        return
      }
      if (spokenLine) {
        const spoken = await queueHostLine(spokenLine)
        const shouldContinue = ['show_intro', 'reveal', 'double_reveal', 'wheel_result', 'intermission', 'resume'].includes(party.phase)
        if (!spoken) await new Promise(resolve => setTimeout(resolve, 1200))
        const voiceDone = markVoiceDone(party)
        if (party.is_host && shouldContinue) {
          const breathingRoom = party.phase === 'show_intro' ? 700 : party.phase === 'resume' ? 900 : 1800
          await new Promise(resolve => setTimeout(resolve, breathingRoom))
          try { await runSynchronizedTransition(() => continueStudyPartyHost(party.id), 'Waiting for every screen…') }
          catch (problem) { setError(problem.message); await load() }
        } else await voiceDone
        return
      }
      const directed = party.players.find(player => player.user_id === party.double_or_nothing?.target_user_id)
      const target = party.phase === 'double_intro'
        ? `${directed?.display_name || 'Player'}, this is Double or Nothing. `
        : ''
      const swapIntro = party.question.swap_round ? 'Score Swap Round. Everyone can answer. The winner must swap their total points with another player. ' : ''
      const spoken = await queueHostLine(`${target}${swapIntro}${party.question.voice_prompt || party.question.prompt}`)
      if (!spoken) await new Promise(resolve => setTimeout(resolve, 1800))
      const voiceDone = markVoiceDone(party)
      if (party.is_host) {
        try { await runSynchronizedTransition(() => startStudyPartyCountdown(party.id), 'Synchronizing the countdown…') }
        catch (problem) { if (!/answers/i.test(problem.message)) setError(problem.message); await load() }
      } else await voiceDone
    }
    run()
  }, [clockOffset, load, markVoiceDone, party?.buzzed_by, party?.current_question, party?.directed_user_id, party?.double_or_nothing?.target_user_id, party?.host_message, party?.id, party?.is_host, party?.phase, party?.question?.prompt, party?.question?.requires_buzzer, party?.question?.swap_round, party?.question?.voice_prompt, party?.question_opens_at, party?.reveal_announcement, party?.status, party?.sync?.all_ready, queueHostLine, runSynchronizedTransition])

  useEffect(() => {
    if (party?.status !== 'active' || party.phase !== 'question' || !party.question?.requires_buzzer || !party.buzzed_by || !party.sync?.all_ready) return
    const key = `buzz-reaction-${party.current_question}-${party.buzzed_by}`
    if (spokenRef.current.has(key)) return
    spokenRef.current.add(key)
    stopHostVoice()
    queueHostLine(party.host_message)
  }, [party?.buzzed_by, party?.current_question, party?.host_message, party?.phase, party?.question?.requires_buzzer, party?.status, party?.sync?.all_ready, queueHostLine, stopHostVoice])

  useEffect(() => {
    if (party?.status !== 'active' || party.phase !== 'question' || !party.question?.requires_buzzer || party.buzzed_by || !party.attempted_user_ids?.length || !party.sync?.all_ready) return
    const key = `steal-reaction-${party.current_question}-${party.attempted_user_ids.length}`
    if (spokenRef.current.has(key)) return
    spokenRef.current.add(key)
    queueHostLine(party.host_message)
  }, [party?.attempted_user_ids?.length, party?.buzzed_by, party?.current_question, party?.host_message, party?.phase, party?.question?.requires_buzzer, party?.status, party?.sync?.all_ready, queueHostLine])

  useEffect(() => {
    if (!['countdown', 'double_countdown'].includes(party?.phase)) return
    setVoiceStatus('')
    if (!party.is_host || !party.phase_deadline) return
    const wait = Math.max(0, new Date(party.phase_deadline).getTime() - (Date.now() + clockOffset)) + 40
    const timer = setTimeout(async () => {
      try { await runSynchronizedTransition(() => openStudyPartyQuestion(party.id), 'GO! Opening the round for everyone…') }
      catch { await load() }
    }, wait)
    return () => clearTimeout(timer)
  }, [clockOffset, load, party?.id, party?.is_host, party?.phase, party?.phase_deadline, runSynchronizedTransition])

  useEffect(() => () => { stopHostVoice(); audioContextRef.current?.close?.() }, [stopHostVoice])

  if (loading && !party) return <Loader full variant="quiz-show" label="Joining the Quizz Show…" />
  if (error && !party) return <>{error.includes('migration') ? <SetupRequired error={error} /> : <ErrorState text={error} />}<Button variant="secondary" onClick={() => navigate('/rivals/party')}>Back to Quizz Show</Button></>
  if (!party) return null
  const me = party.players.find(player => player.is_current_user)
  const buzzerPlayer = party.players.find(player => player.user_id === party.buzzed_by)
  const effectiveNow = now + clockOffset
  const remaining = party.phase_deadline ? Math.max(0, new Date(party.phase_deadline).getTime() - effectiveNow) : 0
  const seconds = formatSeconds(remaining)
  const countdownNumber = Math.max(1, Math.min(3, Math.ceil(remaining / 1000)))
  const openingRemaining = party.question_opens_at ? Math.max(0, new Date(party.question_opens_at).getTime() - effectiveNow) : 0
  const roundOpening = party.phase === 'question' && (openingRemaining > 0 || !party.sync?.all_ready)
  const questionDuration = Number(party.question?.time_limit || 25) * 1000
  const questionElapsed = party.question_opens_at ? Math.max(0, effectiveNow - new Date(party.question_opens_at).getTime()) : 0
  const livePoints = Math.max(10, Math.min(200, Math.ceil(200 * (1 - Math.min(questionDuration, questionElapsed) / questionDuration))))

  const copyValue = async (value, kind) => { try { await navigator.clipboard.writeText(value); setCopied(kind); setTimeout(() => setCopied(''), 1800) } catch { setError('Copying is blocked by this browser.') } }
  const start = async () => { setWorking(true); setError(''); try { if (voiceEnabled) await armHostVoice(); await runSynchronizedTransition(() => startStudyParty(party.id), 'Waiting for every player to enter the arena…') } catch (problem) { setError(problem.message) } finally { setWorking(false) } }
  const buzz = async () => {
    if (pendingAction) return
    setPendingAction('buzz'); setWorking(true); setError(''); syncEpochRef.current += 1
    try { setParty((await buzzStudyParty(party.id)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const submit = async (event, selectedAnswer = '') => {
    event?.preventDefault?.()
    const lockedAnswer = selectedAnswer || answer
    if (!lockedAnswer || pendingAction) return
    if (selectedAnswer) setAnswer(selectedAnswer)
    setPendingAction('answer'); setWorking(true); setError(''); syncEpochRef.current += 1
    try { setParty((await answerStudyParty(party.id, lockedAnswer)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const respondDouble = async accept => {
    if (pendingAction) return
    setPendingAction('double'); setWorking(true); setError(''); syncEpochRef.current += 1
    try { setParty((await respondStudyPartyDouble(party.id, accept)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const spinWheel = async () => {
    if (pendingAction) return
    setPendingAction('wheel'); setWorking(true); setError(''); syncEpochRef.current += 1
    try { setParty((await spinStudyPartyWheel(party.id)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const requestBreak = async () => {
    if (pendingAction) return
    setPendingAction('pause'); setWorking(true); setError(''); syncEpochRef.current += 1
    try { setParty((await requestStudyPartyPause(party.id)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const voteBreak = async accept => {
    if (pendingAction) return
    setPendingAction('pause-vote'); setWorking(true); setError(''); syncEpochRef.current += 1
    try { setParty((await voteStudyPartyPause(party.id, accept)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const readyFromBreak = async () => {
    if (pendingAction) return
    setPendingAction('pause-ready'); setWorking(true); setError(''); syncEpochRef.current += 1
    try { setParty((await readyStudyPartyPause(party.id)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const quit = async () => {
    setQuitting(true); setError('')
    try {
      await quitStudyParty(party.id)
      clearActiveQuizShow(party.id)
      await refresh()
      navigate('/rivals')
    } catch (problem) { setError(problem.message); setShowQuit(false) }
    finally { setQuitting(false) }
  }
  const leaveGame = () => {
    if (window.opener && !window.opener.closed) window.close()
    else navigate('/rivals')
  }
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch { setError('Full-screen mode is blocked by this browser.') }
  }

  if (party.status === 'waiting') {
    const invite = `${window.location.origin}/rivals/party?join=${party.room_code}`
    return <section className="study-party-lobby"><header className="quiz-show-lobby-controls"><button onClick={leaveGame}><House /> Back to Studentley</button><button onClick={toggleFullscreen}>{isFullscreen ? <Minimize2 /> : <Maximize2 />} {isFullscreen ? 'Exit full screen' : 'Full screen'}</button></header><div className="study-party-lobby-orb"><PartyPopper /></div><span className="rivals-kicker">AI host is ready</span><h1>{party.title}</h1><p>Invite your friends. Everyone stays here until the host starts the game.</p><div className="study-party-share"><button onClick={() => copyValue(party.room_code, 'code')}><span><small>Room code</small><b>{party.room_code}</b></span>{copied === 'code' ? <Check /> : <Copy />}</button><button onClick={() => copyValue(invite, 'link')}><span><small>Invite friends</small><b>{copied === 'link' ? 'Link copied!' : 'Copy invite link'}</b></span><Link2 /></button></div><div className="lobby-details"><span>{party.subject}</span><span>{party.level}</span><span>Free-for-All</span><span>{party.question_count} questions</span></div><button type="button" className={`study-party-voice-toggle ${voiceReady ? 'ready' : ''}`} onClick={async () => { setVoiceEnabled(true); await armHostVoice() }}><Volume2 /> {voiceReady ? 'Male AI host voice ready' : 'Enable male AI host voice'}</button>{voiceStatus && <small className="study-party-voice-status">{voiceStatus}</small>}{error && <ErrorState text={error} />}<PartyScoreboard party={party} lobby />{party.is_host ? <><Button className="rivals-primary study-party-start" loading={working} disabled={party.players.length < 2 || !party.sync?.all_ready} onClick={start}><Zap /> {party.sync?.all_ready ? 'Start Game' : 'Synchronizing players…'}</Button>{party.players.length >= 2 && !party.sync?.all_ready && <SyncNotice text={`Waiting for ${(party.sync?.waiting_for || []).join(' and ') || 'every player'}…`} />}</> : <p className="waiting-host"><LoaderCircle className="spin" /> Waiting for the host to press Start Game…</p>}</section>
  }

  if (party.status === 'completed') return <StudyPartyResults party={party} onExit={leaveGame} />

  const hostMessage = ['reveal', 'double_reveal', 'wheel_result'].includes(party.phase) && party.reveal_announcement ? party.reveal_announcement : party.host_message
  const doublePhase = party.phase.startsWith('double_')
  const wheelPhase = party.phase.startsWith('wheel_')
  const pausePhase = ['pause_vote', 'paused', 'resume'].includes(party.phase)
  const canRequestBreak = ['reveal', 'double_reveal', 'wheel_result', 'intermission'].includes(party.phase)
  const showLeaderboard = ['reveal', 'double_reveal', 'wheel_result'].includes(party.phase)

  return <>
  <section className="study-party-live">
    <header className="study-party-live-header"><span className="study-party-exit-tools"><button onClick={leaveGame}><House /> Leave tab</button><button className="danger" onClick={() => setShowQuit(true)}><ArrowRight /> Quit game</button></span><div><span className="study-party-live-dot" /> AI host live</div><span className="study-party-live-tools">{canRequestBreak && !pausePhase && <button type="button" className="study-party-pause-request" disabled={working} onClick={requestBreak} title="Ask everyone for a short break"><Pause /><span>Break</span></button>}<button type="button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}>{isFullscreen ? <Minimize2 /> : <Maximize2 />}</button><button type="button" onClick={async () => { if (voiceEnabled) { stopHostVoice(); setVoiceEnabled(false); setVoiceStatus('') } else { setVoiceEnabled(true); await armHostVoice() } }} title={voiceEnabled ? 'Mute host voice' : 'Enable host voice'}>{voiceEnabled ? <Volume2 /> : <VolumeX />}</button><b>{party.question_number}/{party.question_count}</b></span></header>
    <div className={`study-party-host-message ${doublePhase ? 'double' : ''}`} key={hostMessage}><BrainCircuit /><p>{hostMessage}</p></div>
    {voiceStatus && <div className="study-party-voice-status live" role="status">{voiceStatus}</div>}
    {(syncWaiting || (!party.sync?.all_ready && !['question', 'paused'].includes(party.phase))) && <SyncNotice text={syncWaiting || `Waiting for ${(party.sync?.waiting_for || []).join(' and ') || 'every player'} to reach this screen…`} />}
    {error && <ErrorState text={error} />}
    <div className={`study-party-stage ${showLeaderboard ? 'leaderboard-visible' : 'gameplay-only'}`}>
      <main className={`card study-party-question ${party.phase}`} key={`${party.current_question}-${party.phase}`}>
        {pausePhase ? <PauseStage party={party} onVote={voteBreak} onReady={readyFromBreak} working={working} pendingAction={pendingAction} /> : party.phase === 'show_intro' ? <ShowIntroStage party={party} /> : roundOpening ? <RoundGoStage /> : wheelPhase ? <ComebackWheel party={party} onSpin={spinWheel} working={working} pendingAction={pendingAction} seconds={seconds} /> : party.phase === 'double_offer' ? <DoubleOffer party={party} onRespond={respondDouble} working={working} pendingAction={pendingAction} seconds={seconds} /> : party.phase === 'intermission' ? <div className="study-party-intermission"><Sparkles /><span>Take a breath</span><h1>{roundNames[party.question?.round_type]}</h1><p>The next question will begin shortly.</p></div> : ['countdown', 'double_countdown'].includes(party.phase) ? <div className={`study-party-countdown ${party.phase === 'double_countdown' ? 'double' : ''}`} aria-live="assertive"><span>{party.phase === 'double_countdown' ? 'Double or Nothing' : 'Get ready'}</span><b key={countdownNumber}>{countdownNumber}</b><small>Answers open after the countdown</small></div> : doublePhase ? <DoubleStage party={party} answer={answer} setAnswer={setAnswer} onSubmit={submit} working={working} pendingAction={pendingAction} seconds={seconds} remaining={remaining} /> : <>
          <div className="study-party-question-top"><span><Radio /> {party.question?.swap_round ? 'Score Swap Round' : roundNames[party.question?.round_type]}</span>{party.question?.swap_round ? <b><Coins /> Winner swaps scores</b> : party.question?.is_final && <b><Crown /> Final round</b>}<time className={party.phase === 'question' && seconds <= 5 ? 'critical' : ''}>{party.phase === 'intro' ? <><Volume2 /> Listen</> : <><Clock3 /> {seconds}s</>}</time></div>
          <div className={`study-party-timer ${party.phase === 'intro' ? 'listening' : ''}`}><span style={{ width: party.phase === 'intro' ? '100%' : `${party.question ? Math.min(100, remaining / (party.question.time_limit * 1000) * 100) : 0}%` }} /></div>
          <small>{party.question?.difficulty} · {party.question?.topic} · {party.phase === 'question' ? `${livePoints} points available now` : 'Up to 200 points · speed matters'}</small>
          <h1>{party.question?.prompt}</h1>
          {party.question?.swap_round && party.phase !== 'reveal' && <div className="study-party-swap-notice"><Coins /><span><b>Score Swap is active</b><small>The first correct player swaps their total points with another player.</small></span></div>}
          {party.phase === 'intro' ? <div className="study-party-listening"><Volume2 /><b>Listen carefully…</b><span>The answer area stays locked until the voice finishes.</span></div> : party.phase === 'reveal' ? <>{party.swap_result && <SwapResult result={party.swap_result} />}<PersonalQuestionResult result={party.current_user_result} /><div className="study-party-reveal"><Check /><div><small>Correct answer</small><b>{party.question?.correct_answer}</b><p>{party.question?.explanation}</p></div></div></> : <StudyPartyAnswer party={party} me={me} buzzerPlayer={buzzerPlayer} answer={answer} setAnswer={setAnswer} onBuzz={buzz} onSubmit={submit} working={working} pendingAction={pendingAction} />}
        </>}
      </main>
      {showLeaderboard && <PartyScoreboard party={party} changes={scoreChanges} leadChange={leadChange} />}
    </div>
  </section>
  {showQuit && <Modal title="Quit this Quizz Show?" description="This action cannot be undone." onClose={() => !quitting && setShowQuit(false)}><div className="study-party-quit-warning"><span><AlertTriangle /></span><div><b>Are you sure you want to quit?</b><p>You will lose 20 Studentley Points and leave the live room. If only one player remains, they win the show.</p></div></div><div className="study-party-modal-actions"><Button variant="ghost" disabled={quitting} onClick={() => setShowQuit(false)}>Keep playing</Button><Button className="study-party-quit-confirm" loading={quitting} onClick={quit}>Quit and lose 20 SP</Button></div></Modal>}
  </>
}

function SyncNotice({ text }) {
  return <div className="study-party-sync-notice" role="status"><LoaderCircle className="spin" /><span><b>Keeping every screen together</b><small>{text}</small></span></div>
}

function ShowIntroStage({ party }) {
  return <div className="study-party-show-intro" role="status" aria-live="polite">
    <div className="study-party-intro-orbits"><i /><i /><i /><span><Trophy /></span></div>
    <small>Tonight’s Quiz Show</small>
    <h1>{party.topic || party.subject}</h1>
    <p>{party.level} · {party.question_count} questions · Up to 200 points per question</p>
    <div className="study-party-intro-contenders">
      {party.players.map((player, index) => <article key={player.user_id} style={{ '--intro-delay': `${.48 + index * .13}s` }}><ProfileAvatar profile={player} /><span><small>Contender {String(index + 1).padStart(2, '0')}</small><b>{player.display_name}</b></span></article>)}
    </div>
    <strong><Sparkles /> Let the show begin <Sparkles /></strong>
  </div>
}

function RoundGoStage() {
  return <div className="study-party-round-sync go" role="status" aria-live="assertive"><div className="study-party-go-rings"><i /><i /><i /></div><small>Everyone is ready</small><h1>GO!</h1><p>The round opens for every player at the same moment.</p></div>
}

function PauseStage({ party, onVote, onReady, working, pendingAction }) {
  const pause = party.pause || {}
  if (party.phase === 'pause_vote') return <div className="study-party-break-stage vote"><span className="study-party-break-icon"><Coffee /></span><small>Quick break request</small><h1>{pause.requested_by_name || 'A player'} wants a short pause</h1><p>Everyone has to agree. The show only pauses if every player says yes.</p><div className="study-party-break-progress"><span style={{ width: `${Math.min(100, Number(pause.vote_count || 0) / Math.max(1, Number(pause.player_count || 1)) * 100)}%` }} /></div><b>{pause.vote_count || 0} of {pause.player_count || party.players.length} agreed</b>{pause.voted ? <div className="study-party-break-wait"><LoaderCircle className="spin" /> Waiting for everyone else to vote…</div> : <div className="study-party-break-actions"><Button variant="secondary" disabled={working} onClick={() => onVote(false)}>Keep playing</Button><Button className="rivals-primary" loading={working && pendingAction === 'pause-vote'} onClick={() => onVote(true)}><Pause /> Agree to pause</Button></div>}</div>
  if (party.phase === 'paused') return <div className="study-party-break-stage paused"><span className="study-party-break-icon"><Coffee /></span><small>Show paused</small><h1>Take a breather</h1><p>Grab some water, stretch, and press Ready when you want to return. The show resumes only when everyone is ready.</p><div className="study-party-break-progress"><span style={{ width: `${Math.min(100, Number(pause.ready_count || 0) / Math.max(1, Number(pause.player_count || 1)) * 100)}%` }} /></div><b>{pause.ready_count || 0} of {pause.player_count || party.players.length} ready</b>{pause.ready ? <div className="study-party-break-wait"><LoaderCircle className="spin" /> Waiting for the rest of the room…</div> : <Button className="rivals-primary study-party-ready-button" loading={working && pendingAction === 'pause-ready'} onClick={onReady}><Play /> I’m ready</Button>}</div>
  return <div className="study-party-break-stage resume"><span className="study-party-break-icon"><Zap /></span><small>Everybody is ready</small><h1>And we are back!</h1><p>The AI host is bringing the whole room back into the show together.</p><LoaderCircle className="spin study-party-resume-spinner" /></div>
}

function PersonalQuestionResult({ result }) {
  if (!result) return null
  const positive = result.correct && Number(result.points || 0) >= 0
  const label = !result.answered ? 'No answer locked' : positive ? 'Correct!' : 'Not quite'
  const points = Number(result.points || 0)
  return <div className={`study-party-personal-result ${positive ? 'correct' : 'wrong'}`} role="status"><span>{positive ? <Check /> : <AlertTriangle />}</span><div><b>{label}</b><small>{points > 0 ? `+${points} points` : points < 0 ? `${points} points` : '0 points'}</small></div></div>
}

function SwapResult({ result }) {
  if (result.skipped) return <div className="study-party-swap-result skipped"><Crown /><div><small>No swap needed</small><b>{result.winner_name} stays on top</b><p>{result.winner_name} already has the highest score with {result.winner_score} points.</p></div></div>
  return <div className="study-party-swap-result"><Coins /><div><small>Random Score Swap complete</small><b>{result.winner_name} ↔ {result.opponent_name}</b><p>{result.winner_name}: {result.winner_score} points · {result.opponent_name}: {result.opponent_score} points</p></div></div>
}

function ComebackWheel({ party, onSpin, working, pendingAction, seconds }) {
  const event = party.wheel_event || {}
  const spinning = party.phase === 'wheel_spinning'
  const result = party.phase === 'wheel_result'
  const swapped = result && event.outcome === 'swap'
  const resultLabel = swapped ? 'SCORE SWAP' : Number(event.delta || 0) >= 0 ? `+${Number(event.delta || 0)}` : `${Number(event.delta || 0)}`
  const stopIndex = Math.max(0, Math.min(7, Number(event.stop_index || 0)))
  const stopRotation = 1800 + ((360 - (stopIndex * 45 + 22.5)) % 360)
  const wheelStyle = { '--wheel-stop': `${stopRotation}deg`, '--wheel-stop-reverse': `${-stopRotation}deg` }
  return <div className={`study-party-wheel-stage ${spinning ? 'spinning' : ''} ${result ? 'result' : ''}`}>
    <span className="study-party-wheel-kicker"><Sparkles /> Mid-game comeback</span>
    <h1>{result ? 'The wheel has spoken!' : spinning ? 'Round and round…' : `${event.target_name || 'The last-place player'}, spin the wheel!`}</h1>
    <div className="study-party-wheel-wrap" aria-label={spinning ? 'Comeback Wheel spinning' : 'Comeback Wheel'}>
      <i />
      <div className="study-party-wheel" style={wheelStyle}><span>+50</span><span>+100</span><span>+150</span><span>+200</span><span>+300</span><span>+400</span><span>−50</span><span>SWAP</span><b>{result ? resultLabel : <Coins />}</b></div>
    </div>
    {result && Number(event.delta || 0) > 0 && <div className="study-party-wheel-win" aria-label={`${event.delta} points won`}><div>{Array.from({ length: 14 }, (_, index) => <i style={{ '--spark-angle': `${index * 25.7}deg`, '--spark-delay': `${index * 35}ms` }} key={index} />)}</div><PartyPopper /><strong>+{event.delta}</strong><span>POINTS!</span></div>}
    {party.phase === 'wheel_offer' && (event.is_target
      ? <><p>You are currently in last place. One spin can turn the whole show around.</p><Button className="rivals-primary study-party-wheel-button" loading={working && pendingAction === 'wheel'} onClick={onSpin}><Sparkles /> Spin the Comeback Wheel</Button><small>{seconds}s to spin · it spins automatically if time runs out</small></>
      : <div className="study-party-wheel-wait"><LoaderCircle className="spin" /> Waiting for {event.target_name || 'the selected player'} to spin…</div>)}
    {spinning && <p className="study-party-wheel-spin-copy"><LoaderCircle className="spin" /> The result is being decided…</p>}
    {result && <div className={`study-party-wheel-result ${swapped ? 'swap' : Number(event.delta || 0) < 0 ? 'loss' : 'win'}`}><PartyPopper /><div><small>{swapped ? 'Random score swap' : 'Wheel result'}</small><b>{swapped ? `${event.target_name} ↔ ${event.opponent_name}` : `${event.target_name} ${Number(event.delta || 0) >= 0 ? 'wins' : 'loses'} ${Math.abs(Number(event.delta || 0))} points`}</b><p>{swapped ? `${event.target_name}: ${event.target_score} · ${event.opponent_name}: ${event.opponent_score}` : `${event.target_name} now has ${event.score} points.`}</p></div></div>}
  </div>
}

function DoubleOffer({ party, onRespond, working, pendingAction, seconds }) {
  const offer = party.double_or_nothing
  const target = offer?.target_name || party.players.find(player => player.user_id === offer?.target_user_id)?.display_name || 'Player'
  return <div className="study-party-double-offer"><span className="study-party-double-crown"><Crown /></span><small>Special challenge · {seconds}s to choose</small><h1>Double or Nothing</h1><p><b>{target}</b> can risk the {offer?.wager || 0} points they just won. Get the follow-up right to double those points. Get it wrong and lose them.</p>{offer?.is_target ? <div className="study-party-double-actions"><Button variant="secondary" disabled={working} onClick={() => onRespond(false)}>Keep my points</Button><Button className="rivals-primary" loading={working && pendingAction === 'double'} onClick={() => onRespond(true)}><Coins /> Risk {offer.wager} points</Button></div> : <div className="study-party-double-wait"><LoaderCircle className="spin" /> Waiting for {target} to choose…</div>}</div>
}

function DoubleStage({ party, answer, setAnswer, onSubmit, working, pendingAction, seconds, remaining }) {
  const offer = party.double_or_nothing
  const isTarget = offer?.is_target
  const listening = party.phase === 'double_intro'
  const reveal = party.phase === 'double_reveal'
  return <>
    <div className="study-party-question-top"><span><Coins /> Double or Nothing</span><b><Crown /> {offer?.wager || 0} points at risk</b><time className={party.phase === 'double_question' && seconds <= 5 ? 'critical' : ''}>{listening ? <><Volume2 /> Listen</> : <><Clock3 /> {seconds}s</>}</time></div>
    <div className={`study-party-timer ${listening ? 'listening' : ''}`}><span style={{ width: listening ? '100%' : `${Math.min(100, remaining / 20000 * 100)}%` }} /></div>
    <div className="study-party-directed double"><Target /> Only <b>{offer?.target_name || 'the selected player'}</b> can answer</div>
    <small>Follow-up challenge · double the reward or lose it</small>
    <h1>{party.question?.prompt}</h1>
    {listening ? <div className="study-party-listening double"><Volume2 /><b>Listen carefully…</b><span>The options appear after the dramatic countdown.</span></div> : reveal ? <><PersonalQuestionResult result={party.current_user_result} /><div className="study-party-reveal double"><Coins /><div><small>Correct answer</small><b>{party.question?.correct_answer}</b><p>{party.question?.explanation}</p></div></div></> : isTarget ? pendingAction === 'answer' ? <div className="study-party-answer-locked pending"><Check /><b>Answer locked!</b><small>Double or Nothing is being scored…</small></div> : <div className="study-party-answer"><div className="study-party-options">{party.question?.options?.map((option, index) => <button type="button" disabled={working} className={answer === option ? 'selected' : ''} onClick={() => onSubmit(null, option)} key={option}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span></button>)}</div></div> : <div className="study-party-double-wait"><LoaderCircle className="spin" /> {offer?.target_name || 'The selected player'} is answering for Double or Nothing…</div>}
  </>
}

function StudyPartyAnswer({ party, me, buzzerPlayer, answer, setAnswer, onBuzz, onSubmit, working, pendingAction }) {
  const question = party.question
  if (!question || party.phase !== 'question') return null
  const attempted = party.attempted_user_ids.includes(me?.user_id)
  if (pendingAction === 'buzz') return <div className="study-party-answer-locked pending"><BellRing /><b>Buzzer pressed!</b><small>Claiming your answer now…</small></div>
  if (pendingAction === 'answer') return <div className="study-party-answer-locked pending"><Check /><b>Answer locked!</b><small>Updating the scoreboard…</small></div>
  if (me?.has_answered || attempted) return <div className="study-party-answer-locked"><Check /> Your answer is locked. The scoreboard appears when the question ends.</div>
  if (question.requires_buzzer && !party.buzzed_by) return <button className="study-party-buzzer" disabled={working} onClick={onBuzz}><span><BellRing /></span><b>BUZZ</b><small>First tap gets the first answer</small></button>
  if (question.requires_buzzer && party.buzzed_by !== me?.user_id) return <div className="study-party-buzzed"><BellRing /><b>{buzzerPlayer?.display_name || 'Another player'} buzzed first</b><small>Get ready to steal if the answer is wrong.</small></div>
  return question.options?.length ? <div className="study-party-answer"><div className="study-party-options">{question.options.map((option, index) => <button type="button" disabled={working} className={answer === option ? 'selected' : ''} onClick={() => onSubmit(null, option)} key={option}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span></button>)}</div></div> : <form className="study-party-answer" onSubmit={onSubmit}><div className="study-party-text-answer"><input autoFocus maxLength="60" value={answer} onChange={event => setAnswer(event.target.value.replace(/\s+/g, ''))} placeholder="One-word answer" aria-label="One-word answer" /><small>One word only</small><Button className="rivals-primary" loading={working} disabled={!answer.trim()}><Send /> Lock answer</Button></div></form>
}

function PartyScoreboard({ party, lobby = false, changes = {}, leadChange = '' }) {
  return <aside className={`card study-party-scoreboard ${lobby ? 'lobby' : 'round-result'}`}>{leadChange && !lobby && <div className="study-party-lead-change"><Crown /><span><small>New leader</small><b>{leadChange} takes the lead!</b></span></div>}<header><div><span>{lobby ? 'Players connected' : 'End of question'}</span><h2>{lobby ? 'Waiting room' : 'Scoreboard update'}</h2></div><Trophy /></header><div className="study-party-player-list">{party.players.map((player, index) => { const change = changes[player.user_id] || {}; const points = Number(change.points || 0); const places = Number(change.places || 0); const rankClass = places > 0 ? 'rank-up' : places < 0 ? 'rank-down' : ''; return <article className={`${player.is_current_user ? 'current' : ''} ${index === 0 && !lobby ? 'leader' : ''} ${points > 0 ? 'gained' : points < 0 ? 'lost' : ''} ${rankClass}`} style={places ? { '--rank-shift': `${places * 59}px` } : undefined} key={player.user_id}><em>{index + 1}</em><ProfileAvatar name={player.display_name} path={player.avatar_path} bucket={player.avatar_bucket} /><span><b>{player.display_name}{player.is_current_user && ' (You)'}</b><small>{player.streak >= 3 ? `${player.streak} streak 🔥` : lobby ? 'Ready' : `${player.accuracy}% accuracy`}</small></span>{!lobby && (points !== 0 || places !== 0) && <div className="study-party-score-change"><small>{points > 0 ? `+${points}` : points} pts</small>{places !== 0 && <b>{places > 0 ? `▲ ${places}` : `▼ ${Math.abs(places)}`}</b>}</div>}<AnimatedScore value={Number(player.score || 0)} delta={lobby ? 0 : points} /></article> })}</div></aside>
}

function AnimatedScore({ value, delta = 0 }) {
  const [displayed, setDisplayed] = useState(value - delta)
  useEffect(() => {
    const startValue = value - delta
    if (!delta) { setDisplayed(value); return undefined }
    setDisplayed(startValue)
    const startedAt = performance.now()
    const duration = Math.min(1900, 950 + Math.abs(delta) * 4)
    let frame
    const tick = now => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(startValue + delta * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [delta, value])
  return <strong className={`study-party-animated-score ${delta > 0 ? 'counting-up' : delta < 0 ? 'counting-down' : ''}`} aria-label={`${value} points`}>{displayed}</strong>
}

function StudyPartyResults({ party, onExit }) {
  const winner = party.players.find(player => player.user_id === party.winner_user_id)?.display_name || 'It is a tie'
  return <section className="study-party-results"><div className="result-burst"><span><Trophy /></span></div><span className="rivals-kicker">Quizz Show complete</span><h1>{winner}{winner === 'It is a tie' ? '!' : ' wins!'}</h1><p>{party.host_message}</p><div className="study-party-final-grid">{party.players.map((player, index) => <article className={`card ${player.user_id === party.winner_user_id ? 'winner' : ''}`} key={player.user_id}><header><span>#{index + 1}</span><ProfileAvatar name={player.display_name} path={player.avatar_path} bucket={player.avatar_bucket} /><div><b>{player.display_name}</b><small>{player.score} game points · +{player.sp_awarded} SP</small></div></header><div><span><Check /><b>{player.accuracy}%</b><small>Accuracy</small></span><span><Flame /><b>{player.best_streak}</b><small>Best streak</small></span></div><p><strong>Strongest:</strong> {player.strongest_topic}</p><p><strong>Revise next:</strong> {player.weakest_topic}</p></article>)}</div><div className="battle-result-actions"><Button className="rivals-primary" onClick={onExit}>Rivals dashboard</Button><Button variant="secondary" onClick={() => window.location.assign('/rivals/party')}>Host another show</Button></div></section>
}
