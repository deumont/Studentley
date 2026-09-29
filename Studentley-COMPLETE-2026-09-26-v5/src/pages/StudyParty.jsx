import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, BellRing, BookOpenCheck, BrainCircuit, Check, Clock3, Coins, Copy, Crown, Flame, Gauge, Link2, LoaderCircle, LockKeyhole, PartyPopper, Radio, Send, Sparkles, Target, Trophy, UploadCloud, UserPlus, Users, Volume2, VolumeX, Zap } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, ErrorState, Field, Loader, Modal, ProfileAvatar } from '../components/UI'
import { useApp } from '../context/AppContext'
import { uploadDocument } from '../lib/data'
import { getPersonalAIAudio } from '../services/ai'
import { answerStudyParty, buzzStudyParty, createStudyParty, joinStudyParty, loadStudyParty, openStudyPartyQuestion, quitStudyParty, respondStudyPartyDouble, startStudyParty, startStudyPartyCountdown } from '../services/studyParty'

const levels = ['Primary', 'GCSE / IGCSE', 'A-Level', 'IB', 'Abitur', 'Mixed']
const roomSizes = [2, 3, 4, 5, 6, 7, 8]
const roundNames = { buzzer: 'Buzzer Round', multiple_choice: 'Multiple Choice', quick_answer: 'One Word', explain_it: 'One Word', rapid_fire: 'Rapid Fire', true_false: 'True / False', team_round: 'Team Round' }
const formatSeconds = milliseconds => Math.max(0, Math.ceil(milliseconds / 1000))

function SetupRequired({ error }) {
  return <section className="rivals-setup card"><LockKeyhole /><span><b>Quizz Show database setup required</b><p>{error}</p><code>202609290001_ai_hosted_study_parties.sql</code></span></section>
}

export default function StudyPartyHome() {
  const { data, user, refresh } = useApp()
  const documents = data?.documents || []
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteCode = String(searchParams.get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const [mode, setMode] = useState(inviteCode ? 'join' : 'create')
  const [form, setForm] = useState({ title: 'Friday Quizz Show', subject: '', topic: '', level: 'GCSE / IGCSE', difficulty: 'Adaptive', gameMode: 'free_for_all', maxPlayers: 8, questionCount: 12, documentId: documents[0]?.id || '' })
  const [code, setCode] = useState(inviteCode)
  const [loading, setLoading] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState('')
  const [generationStartedAt, setGenerationStartedAt] = useState(null), [generationSeconds, setGenerationSeconds] = useState(0)
  const autoJoined = useRef(false)

  useEffect(() => { document.title = 'Quizz Show — Studentley Rivals' }, [])
  useEffect(() => { if (!form.documentId && documents[0]) setForm(value => ({ ...value, documentId: documents[0].id })) }, [documents, form.documentId])
  useEffect(() => {
    if (!generationStartedAt) return
    const update = () => setGenerationSeconds(Math.floor((Date.now() - generationStartedAt) / 1000))
    update()
    const timer = setInterval(update, 250)
    return () => clearInterval(timer)
  }, [generationStartedAt])

  const joinWithCode = useCallback(async value => {
    if (value.length !== 6) return
    setLoading(true); setError('')
    try { const result = await joinStudyParty(value); navigate(`/rivals/party/${result.party.id}`) }
    catch (problem) { setError(problem.message) }
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
      const created = await uploadDocument({ userId: user.id, file, category: 'study_material' })
      await refresh()
      setForm(value => ({ ...value, documentId: created.id }))
    } catch (problem) { setError(problem.message) }
    finally { setUploading(false); event.target.value = '' }
  }

  const create = async event => {
    event.preventDefault(); setLoading(true); setError(''); setGenerationSeconds(0); setGenerationStartedAt(Date.now())
    try {
      const result = await createStudyParty(form)
      navigate(`/rivals/party/${result.party.id}`)
    } catch (problem) { setError(problem.message) }
    finally { setLoading(false); setGenerationStartedAt(null) }
  }

  const join = event => { event.preventDefault(); joinWithCode(code) }

  return <>
    <div className="rivals-page-heading study-party-heading"><div><span className="rivals-kicker"><PartyPopper /> AI-hosted Quizz Show</span><h1>Turn revision into a live game show.</h1><p>Invite friends, hit the buzzer, steal points and let Studentley run every round.</p></div><div className="study-party-host-chip"><BrainCircuit /><span><small>Your host</small><b>Studentley AI</b></span></div></div>
    <section className="study-party-feature-strip">
      <article><BellRing /><span><b>Live buzzer</b><small>First tap gets the answer</small></span></article>
      <article><Gauge /><span><b>Adaptive rounds</b><small>Difficulty follows the group</small></span></article>
      <article><Trophy /><span><b>Real rewards</b><small>Win SP and streak bonuses</small></span></article>
    </section>
    <div className="rivals-switch study-party-switch"><button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}><PartyPopper /> Host a show</button><button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}><UserPlus /> Join a show</button></div>
    {error && (error.includes('migration') || error.includes('database setup') ? <SetupRequired error={error} /> : <ErrorState text={error} />)}
    {mode === 'create' ? <form className="card study-party-form" onSubmit={create}>
      <header><span><Sparkles /></span><div><h2>Set up the room</h2><p>Choose a topic or upload material. The AI host creates a balanced mix of six round types.</p></div></header>
      <Field label="Study material" hint="Optional when you enter a clear topic below."><div className="rivals-document-pick"><select value={form.documentId} onChange={event => setForm({ ...form, documentId: event.target.value })}><option value="">Use a topic only</option>{documents.map(document => <option value={document.id} key={document.id}>{document.name}</option>)}</select><label className="button rivals-secondary"><UploadCloud /> {uploading ? 'Uploading…' : 'Upload new'}<input hidden type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" onChange={upload} /></label></div></Field>
      <div className="ranked-form-grid"><Field label="Show name"><input required minLength="3" maxLength="120" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></Field><Field label="Subject"><input required value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} placeholder="e.g. Biology" /></Field><Field label="Topic"><input required={!form.documentId} value={form.topic} onChange={event => setForm({ ...form, topic: event.target.value })} placeholder="e.g. Cell division" /></Field><Field label="Grade / level"><select value={form.level} onChange={event => setForm({ ...form, level: event.target.value })}>{levels.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Question set"><select value={form.questionCount} onChange={event => setForm({ ...form, questionCount: Number(event.target.value) })}><option value="12">12 questions · Quick show</option><option value="18">18 questions · Full show</option><option value="24">24 questions · Marathon</option></select></Field><Field label="Room size"><div className="friend-player-count">{roomSizes.map(value => <button type="button" className={form.maxPlayers === value ? 'selected' : ''} onClick={() => setForm({ ...form, maxPlayers: value })} key={value}>{value}</button>)}</div></Field></div>
      <Field label="Game format"><div className="study-party-format"><button type="button" className={form.gameMode === 'free_for_all' ? 'selected' : ''} onClick={() => setForm({ ...form, gameMode: 'free_for_all' })}><Target /><span><b>Free-for-All</b><small>Every player for themselves</small></span></button><button type="button" className={form.gameMode === 'teams' ? 'selected' : ''} onClick={() => setForm({ ...form, gameMode: 'teams' })}><Users /><span><b>Teams</b><small>Balanced Team A vs Team B</small></span></button></div></Field>
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
  const audioContextRef = useRef(null), audioSourceRef = useRef(null), speechRequestRef = useRef(null), spokenRef = useRef(new Set())

  const load = useCallback(async () => {
    try { setParty((await loadStudyParty(id)).party); setError('') }
    catch (problem) { setError(problem.message) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { document.title = 'Live Quizz Show — Studentley'; load() }, [load])
  useEffect(() => {
    if (!party || party.status === 'completed') return
    const fastPhase = ['intro', 'countdown', 'double_offer', 'double_intro', 'double_countdown'].includes(party.phase)
    const timer = setInterval(load, fastPhase ? 300 : party.status === 'active' ? 650 : 1800)
    return () => clearInterval(timer)
  }, [party?.phase, party?.status, load])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer) }, [])
  useEffect(() => { setAnswer('') }, [party?.current_question, party?.phase, party?.buzzed_by])

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
    const context = await armHostVoice()
    if (!context) return false
    const request = new AbortController()
    speechRequestRef.current = request
    try {
      setVoiceStatus('Studentley is speaking…')
      const audioData = await getPersonalAIAudio(text, request.signal, 'quiz_show')
      const audioBuffer = await context.decodeAudioData(audioData.slice(0))
      await new Promise((resolve, reject) => {
        const source = context.createBufferSource()
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
      if (problem.name !== 'AbortError') setVoiceStatus('Natural host voice is temporarily unavailable.')
      return false
    } finally {
      speechRequestRef.current = null
      audioSourceRef.current = null
    }
  }, [armHostVoice, stopHostVoice, voiceEnabled])

  useEffect(() => {
    if (!party || party.status !== 'active' || !party.question) return
    const spokenLine = party.phase === 'reveal' || party.phase === 'double_reveal'
      ? party.reveal_announcement
      : ['intermission', 'double_offer'].includes(party.phase)
        ? party.host_message
        : ''
    const key = party.phase === 'intro'
      ? `question-${party.current_question}`
      : party.phase === 'double_intro'
        ? `double-question-${party.current_question}`
        : spokenLine
          ? `${party.phase}-${party.current_question}-${spokenLine}`
          : ''
    if (!key || spokenRef.current.has(key)) return
    spokenRef.current.add(key)
    const run = async () => {
      if (spokenLine) {
        await speakHostLine(spokenLine)
        return
      }
      const directed = party.players.find(player => player.user_id === (party.double_or_nothing?.target_user_id || party.directed_user_id))
      const target = party.phase === 'double_intro'
        ? `${directed?.display_name || 'Player'}, this is Double or Nothing. `
        : directed
          ? `This one is for ${directed.display_name}. `
          : ''
      const spoken = await speakHostLine(`${target}${party.question.prompt}`)
      if (!spoken) await new Promise(resolve => setTimeout(resolve, 1800))
      if (party.is_host) {
        try { setParty((await startStudyPartyCountdown(party.id)).party) }
        catch (problem) { if (!/answers/i.test(problem.message)) setError(problem.message); await load() }
      }
    }
    run()
  }, [load, party?.current_question, party?.directed_user_id, party?.double_or_nothing?.target_user_id, party?.host_message, party?.id, party?.is_host, party?.phase, party?.question?.prompt, party?.reveal_announcement, party?.status, speakHostLine])

  useEffect(() => {
    if (!['countdown', 'double_countdown'].includes(party?.phase)) return
    stopHostVoice()
    setVoiceStatus('')
    if (!party.is_host || !party.phase_deadline) return
    const wait = Math.max(0, new Date(party.phase_deadline).getTime() - Date.now()) + 40
    const timer = setTimeout(async () => {
      try { setParty((await openStudyPartyQuestion(party.id)).party) }
      catch { await load() }
    }, wait)
    return () => clearTimeout(timer)
  }, [load, party?.id, party?.is_host, party?.phase, party?.phase_deadline, stopHostVoice])

  useEffect(() => () => { stopHostVoice(); audioContextRef.current?.close?.() }, [stopHostVoice])

  if (loading && !party) return <Loader label="Joining the Quizz Show…" />
  if (error && !party) return <>{error.includes('migration') ? <SetupRequired error={error} /> : <ErrorState text={error} />}<Button variant="secondary" onClick={() => navigate('/rivals/party')}>Back to Quizz Show</Button></>
  if (!party) return null
  const me = party.players.find(player => player.is_current_user)
  const buzzerPlayer = party.players.find(player => player.user_id === party.buzzed_by)
  const directedPlayer = party.players.find(player => player.user_id === party.directed_user_id)
  const remaining = party.phase_deadline ? Math.max(0, new Date(party.phase_deadline).getTime() - now) : 0
  const seconds = formatSeconds(remaining)
  const countdownNumber = Math.max(1, Math.min(3, Math.ceil(remaining / 1000)))

  const copyValue = async (value, kind) => { try { await navigator.clipboard.writeText(value); setCopied(kind); setTimeout(() => setCopied(''), 1800) } catch { setError('Copying is blocked by this browser.') } }
  const start = async () => { setWorking(true); setError(''); try { if (voiceEnabled) await armHostVoice(); setParty((await startStudyParty(party.id)).party) } catch (problem) { setError(problem.message) } finally { setWorking(false) } }
  const buzz = async () => {
    if (pendingAction) return
    setPendingAction('buzz'); setWorking(true); setError('')
    try { setParty((await buzzStudyParty(party.id)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const submit = async event => {
    event.preventDefault()
    if (!answer || pendingAction) return
    const lockedAnswer = answer
    setPendingAction('answer'); setWorking(true); setError('')
    try { setParty((await answerStudyParty(party.id, lockedAnswer)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const respondDouble = async accept => {
    if (pendingAction) return
    setPendingAction('double'); setWorking(true); setError('')
    try { setParty((await respondStudyPartyDouble(party.id, accept)).party) }
    catch (problem) { setError(problem.message); await load() }
    finally { setPendingAction(''); setWorking(false) }
  }
  const quit = async () => {
    setQuitting(true); setError('')
    try {
      await quitStudyParty(party.id)
      await refresh()
      navigate('/rivals')
    } catch (problem) { setError(problem.message); setShowQuit(false) }
    finally { setQuitting(false) }
  }

  if (party.status === 'waiting') {
    const invite = `${window.location.origin}/rivals/party?join=${party.room_code}`
    return <section className="study-party-lobby"><div className="study-party-lobby-orb"><PartyPopper /></div><span className="rivals-kicker">AI host is ready</span><h1>{party.title}</h1><p>Invite your friends. Studentley will control the questions, timers, buzzers and scoring once you begin.</p><div className="study-party-share"><button onClick={() => copyValue(party.room_code, 'code')}><span><small>Room code</small><b>{party.room_code}</b></span>{copied === 'code' ? <Check /> : <Copy />}</button><button onClick={() => copyValue(invite, 'link')}><span><small>Invite friends</small><b>{copied === 'link' ? 'Link copied!' : 'Copy invite link'}</b></span><Link2 /></button></div><div className="lobby-details"><span>{party.subject}</span><span>{party.level}</span><span>{party.game_mode === 'teams' ? 'Teams' : 'Free-for-All'}</span><span>{party.question_count} questions</span></div><button type="button" className={`study-party-voice-toggle ${voiceReady ? 'ready' : ''}`} onClick={async () => { setVoiceEnabled(true); await armHostVoice() }}><Volume2 /> {voiceReady ? 'Natural host voice ready' : 'Enable natural host voice'}</button>{voiceStatus && <small className="study-party-voice-status">{voiceStatus}</small>}{error && <ErrorState text={error} />}<PartyScoreboard party={party} lobby />{party.is_host ? <Button className="rivals-primary study-party-start" loading={working} disabled={party.players.length < 2} onClick={start}><Zap /> Start with {party.players.length} players</Button> : <p className="waiting-host"><LoaderCircle className="spin" /> Waiting for the host to start…</p>}</section>
  }

  if (party.status === 'completed') return <StudyPartyResults party={party} onExit={() => navigate('/rivals')} />

  const hostMessage = ['reveal', 'double_reveal'].includes(party.phase) && party.reveal_announcement ? party.reveal_announcement : party.host_message
  const doublePhase = party.phase.startsWith('double_')

  return <>
  <section className="study-party-live">
    <header className="study-party-live-header"><button onClick={() => setShowQuit(true)}><ArrowRight /> Quit show</button><div><span className="study-party-live-dot" /> AI host live</div><span className="study-party-live-tools"><button type="button" onClick={async () => { if (voiceEnabled) { stopHostVoice(); setVoiceEnabled(false); setVoiceStatus('') } else { setVoiceEnabled(true); await armHostVoice() } }} title={voiceEnabled ? 'Mute host voice' : 'Enable host voice'}>{voiceEnabled ? <Volume2 /> : <VolumeX />}</button><b>{party.question_number}/{party.question_count}</b></span></header>
    <div className={`study-party-host-message ${doublePhase ? 'double' : ''}`} key={hostMessage}><BrainCircuit /><p>{hostMessage}</p></div>
    {voiceStatus && <div className="study-party-voice-status live" role="status">{voiceStatus}</div>}
    {error && <ErrorState text={error} />}
    <div className="study-party-stage">
      <main className={`card study-party-question ${party.phase}`}>
        {party.phase === 'double_offer' ? <DoubleOffer party={party} onRespond={respondDouble} working={working} pendingAction={pendingAction} seconds={seconds} /> : party.phase === 'intermission' ? <div className="study-party-intermission"><Sparkles /><span>Take a breath</span><h1>{roundNames[party.question?.round_type]}</h1><p>The next question will begin shortly.</p></div> : ['countdown', 'double_countdown'].includes(party.phase) ? <div className={`study-party-countdown ${party.phase === 'double_countdown' ? 'double' : ''}`} aria-live="assertive"><span>{party.phase === 'double_countdown' ? 'Double or Nothing' : 'Get ready'}</span><b key={countdownNumber}>{countdownNumber}</b><small>Answers open after the countdown</small></div> : doublePhase ? <DoubleStage party={party} answer={answer} setAnswer={setAnswer} onSubmit={submit} working={working} pendingAction={pendingAction} seconds={seconds} remaining={remaining} /> : <>
          <div className="study-party-question-top"><span><Radio /> {roundNames[party.question?.round_type]}</span>{party.question?.is_final && <b><Crown /> Final · Double points</b>}<time className={party.phase === 'question' && seconds <= 5 ? 'critical' : ''}>{party.phase === 'intro' ? <><Volume2 /> Listen</> : <><Clock3 /> {seconds}s</>}</time></div>
          <div className={`study-party-timer ${party.phase === 'intro' ? 'listening' : ''}`}><span style={{ width: party.phase === 'intro' ? '100%' : `${party.question ? Math.min(100, remaining / (party.question.time_limit * 1000) * 100) : 0}%` }} /></div>
          {directedPlayer && (party.phase === 'question' || party.phase === 'intro') && <div className="study-party-directed"><Target /> This question starts with <b>{directedPlayer.display_name}</b></div>}
          <small>{party.question?.difficulty} · {party.question?.topic} · {party.question?.points}{party.question?.is_final ? ' × 2' : ''} pts</small>
          <h1>{party.question?.prompt}</h1>
          {party.phase === 'intro' ? <div className="study-party-listening"><Volume2 /><b>Listen carefully…</b><span>The answer area stays locked until the voice finishes.</span></div> : party.phase === 'reveal' ? <><PersonalQuestionResult result={party.current_user_result} /><div className="study-party-reveal"><Check /><div><small>Correct answer</small><b>{party.question?.correct_answer}</b><p>{party.question?.explanation}</p></div></div></> : <StudyPartyAnswer party={party} me={me} buzzerPlayer={buzzerPlayer} answer={answer} setAnswer={setAnswer} onBuzz={buzz} onSubmit={submit} working={working} pendingAction={pendingAction} />}
        </>}
      </main>
      <PartyScoreboard party={party} />
    </div>
  </section>
  {showQuit && <Modal title="Quit this Quizz Show?" description="This action cannot be undone." onClose={() => !quitting && setShowQuit(false)}><div className="study-party-quit-warning"><span><AlertTriangle /></span><div><b>Are you sure you want to quit?</b><p>You will lose 20 Studentley Points and leave the live room. If only one player remains, they win the show.</p></div></div><div className="study-party-modal-actions"><Button variant="ghost" disabled={quitting} onClick={() => setShowQuit(false)}>Keep playing</Button><Button className="study-party-quit-confirm" loading={quitting} onClick={quit}>Quit and lose 20 SP</Button></div></Modal>}
  </>
}

function PersonalQuestionResult({ result }) {
  if (!result) return null
  const positive = result.correct && Number(result.points || 0) >= 0
  const label = !result.answered ? 'No answer locked' : positive ? 'Correct!' : 'Not quite'
  const points = Number(result.points || 0)
  return <div className={`study-party-personal-result ${positive ? 'correct' : 'wrong'}`} role="status"><span>{positive ? <Check /> : <AlertTriangle />}</span><div><b>{label}</b><small>{points > 0 ? `+${points} points` : points < 0 ? `${points} points` : '0 points'}</small></div></div>
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
    <div className={`study-party-timer ${listening ? 'listening' : ''}`}><span style={{ width: listening ? '100%' : `${Math.min(100, remaining / 25000 * 100)}%` }} /></div>
    <div className="study-party-directed double"><Target /> Only <b>{offer?.target_name || 'the selected player'}</b> can answer</div>
    <small>Follow-up challenge · double the reward or lose it</small>
    <h1>{party.question?.prompt}</h1>
    {listening ? <div className="study-party-listening double"><Volume2 /><b>Listen carefully…</b><span>The options appear after the dramatic countdown.</span></div> : reveal ? <><PersonalQuestionResult result={party.current_user_result} /><div className="study-party-reveal double"><Coins /><div><small>Correct answer</small><b>{party.question?.correct_answer}</b><p>{party.question?.explanation}</p></div></div></> : isTarget ? pendingAction === 'answer' ? <div className="study-party-answer-locked pending"><Check /><b>Answer locked!</b><small>Double or Nothing is being scored…</small></div> : <form className="study-party-answer" onSubmit={onSubmit}><div className="study-party-options">{party.question?.options?.map((option, index) => <button type="button" className={answer === option ? 'selected' : ''} onClick={() => setAnswer(option)} key={option}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span></button>)}</div><Button className="rivals-primary full" loading={working} disabled={!answer}><Send /> Lock Double or Nothing answer</Button></form> : <div className="study-party-double-wait"><LoaderCircle className="spin" /> {offer?.target_name || 'The selected player'} is answering for Double or Nothing…</div>}
  </>
}

function StudyPartyAnswer({ party, me, buzzerPlayer, answer, setAnswer, onBuzz, onSubmit, working, pendingAction }) {
  const question = party.question
  if (!question || party.phase !== 'question') return null
  const attempted = party.attempted_user_ids.includes(me?.user_id)
  const directedElsewhere = party.directed_user_id && !party.attempted_user_ids.length && party.directed_user_id !== me?.user_id
  if (pendingAction === 'buzz') return <div className="study-party-answer-locked pending"><BellRing /><b>Buzzer pressed!</b><small>Claiming your answer now…</small></div>
  if (pendingAction === 'answer') return <div className="study-party-answer-locked pending"><Check /><b>Answer locked!</b><small>Updating the scoreboard…</small></div>
  if (me?.has_answered || attempted) return <div className="study-party-answer-locked"><Check /> Your answer is locked. Watch the live scoreboard.</div>
  if (question.requires_buzzer && !party.buzzed_by) return <button className="study-party-buzzer" disabled={working || directedElsewhere} onClick={onBuzz}><span><BellRing /></span><b>{directedElsewhere ? 'Waiting for the selected player' : 'BUZZ'}</b><small>{directedElsewhere ? 'You can steal if they miss it' : 'First tap gets the first answer'}</small></button>
  if (question.requires_buzzer && party.buzzed_by !== me?.user_id) return <div className="study-party-buzzed"><BellRing /><b>{buzzerPlayer?.display_name || 'Another player'} buzzed first</b><small>Get ready to steal if the answer is wrong.</small></div>
  return <form className="study-party-answer" onSubmit={onSubmit}>{question.options?.length ? <div className="study-party-options">{question.options.map((option, index) => <button type="button" className={answer === option ? 'selected' : ''} onClick={() => setAnswer(option)} key={option}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span></button>)}</div> : <div className="study-party-text-answer"><input autoFocus maxLength="60" value={answer} onChange={event => setAnswer(event.target.value.replace(/\s+/g, ''))} placeholder="One-word answer" aria-label="One-word answer" /><small>One word only</small><Button className="rivals-primary" loading={working} disabled={!answer.trim()}><Send /> Lock answer</Button></div>}{question.options?.length > 0 && <Button className="rivals-primary full" loading={working} disabled={!answer}><Send /> Lock answer</Button>}</form>
}

function PartyScoreboard({ party, lobby = false }) {
  return <aside className={`card study-party-scoreboard ${lobby ? 'lobby' : ''}`}><header><div><span>Live points</span><h2>{party.game_mode === 'teams' ? 'Team scoreboard' : 'Leaderboard'}</h2></div><Trophy /></header>{party.game_mode === 'teams' && <div className="study-party-team-scores">{party.team_scores.map(team => <span key={team.team}><small>Team {team.team}</small><b>{team.score}</b></span>)}</div>}<div className="study-party-player-list">{party.players.map((player, index) => <article className={`${player.is_current_user ? 'current' : ''} ${player.user_id === party.buzzed_by ? 'buzzed' : ''}`} key={player.user_id}><em>{index + 1}</em><ProfileAvatar name={player.display_name} path={player.avatar_path} bucket={player.avatar_bucket} /><span><b>{player.display_name}{player.is_current_user && ' (You)'}</b><small>{party.game_mode === 'teams' ? `Team ${player.team}` : player.streak >= 3 ? `${player.streak} streak 🔥` : lobby ? 'Ready' : `${player.accuracy}% accuracy`}</small></span><strong>{player.score}</strong></article>)}</div></aside>
}

function StudyPartyResults({ party, onExit }) {
  const winner = party.winner_team ? `Team ${party.winner_team}` : party.players.find(player => player.user_id === party.winner_user_id)?.display_name || 'It is a tie'
  return <section className="study-party-results"><div className="result-burst"><span><Trophy /></span></div><span className="rivals-kicker">Quizz Show complete</span><h1>{winner}{winner === 'It is a tie' ? '!' : ' wins!'}</h1><p>{party.host_message}</p>{party.game_mode === 'teams' && <div className="study-party-final-teams">{party.team_scores.map(team => <span className={team.team === party.winner_team ? 'winner' : ''} key={team.team}><b>Team {team.team}</b><strong>{team.score}</strong></span>)}</div>}<div className="study-party-final-grid">{party.players.map((player, index) => <article className={`card ${player.user_id === party.winner_user_id || player.team === party.winner_team ? 'winner' : ''}`} key={player.user_id}><header><span>#{index + 1}</span><ProfileAvatar name={player.display_name} path={player.avatar_path} bucket={player.avatar_bucket} /><div><b>{player.display_name}</b><small>{player.score} game points · +{player.sp_awarded} SP</small></div></header><div><span><Check /><b>{player.accuracy}%</b><small>Accuracy</small></span><span><Flame /><b>{player.best_streak}</b><small>Best streak</small></span></div><p><strong>Strongest:</strong> {player.strongest_topic}</p><p><strong>Revise next:</strong> {player.weakest_topic}</p></article>)}</div><div className="battle-result-actions"><Button className="rivals-primary" onClick={onExit}>Rivals dashboard</Button><Button variant="secondary" onClick={() => window.location.assign('/rivals/party')}>Host another show</Button></div></section>
}
