import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Award, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Copy, Crown, Flame, Gauge, Library, LoaderCircle, LockKeyhole, Medal, Plus, RefreshCw, Search, Shield, Sparkles, Swords, Target, Trash2, Trophy, UploadCloud, UserPlus, Users, X, Zap } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, EmptyState, ErrorState, Field, Loader, ProfileAvatar } from '../components/UI'
import { useApp } from '../context/AppContext'
import { uploadDocument } from '../lib/data'
import { generateQuiz } from '../services/ai'
import { addPracticeRival, cancelRivalMatch, createFriendRoom, createPublicRivalQuiz, joinFriendRoom, loadPublicRivalQuizzes, loadRivalMatch, loadRivalTopics, loadRivalsDashboard, queueRankedBattle, startFriendRoom, submitPublicRivalQuiz, submitRivalMatch } from '../services/rivals'

const tiers = [
  ['Bronze', 0, '#b87945'], ['Silver', 1000, '#8d9bae'], ['Gold', 1200, '#e0a91f'],
  ['Platinum', 1400, '#3bbfa0'], ['Diamond', 1600, '#43a4db'], ['Master', 1800, '#8b63e8'],
]
const levels = ['Primary', 'GCSE / IGCSE', 'A-Level', 'IB', 'Abitur']
const difficulties = ['Accessible', 'Exam standard', 'Challenging']
const friendRoomSizes = [2, 3, 4, 5, 6, 7, 8]
const rankColor = rank => tiers.find(([name]) => name === rank)?.[2] || '#16a36f'
const formatTime = milliseconds => { const seconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }

function SetupRequired({ error }) {
  return <section className="rivals-setup card"><LockKeyhole /><span><b>Rivals database setup required</b><p>{error || 'Run the Studentley Rivals migrations in Supabase before opening competitive mode.'}</p><code>202609270005_studentley_rivals.sql + 202609270006_rivals_practice_opponents.sql</code></span></section>
}

const PracticeLabel = ({ player }) => player?.is_practice_rival ? <em className="practice-rival-badge"><Shield /> Practice Rival</em> : null

const matchmakingSteps = ['Finding opponent', 'Opponent found', 'Preparing arena', 'Assembling questions']

function MatchmakingPanel({ match, onCancel, error = '' }) {
  const mountedAt = useRef(Date.now())
  const [now, setNow] = useState(Date.now())
  const [statusStartedAt, setStatusStartedAt] = useState(Date.now())
  const [cancelling, setCancelling] = useState(false)
  useEffect(() => {
    mountedAt.current = Date.now()
    setNow(Date.now())
  }, [match.id])
  useEffect(() => {
    setStatusStartedAt(Date.now())
  }, [match.id, match.status])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const createdAt = Date.parse(match.created_at || '')
  const elapsed = now - (Number.isFinite(createdAt) ? createdAt : mountedAt.current)
  const phaseSeconds = Math.max(0, Math.floor((now - statusStartedAt) / 1000))
  const activeStep = match.status === 'waiting' ? 0 : phaseSeconds < 3 ? 1 : phaseSeconds < 7 ? 2 : 3
  const title = activeStep === 0 ? 'Finding your Rival…' : activeStep === 1 ? 'Opponent found!' : activeStep === 2 ? 'Preparing arena…' : 'Assembling questions…'
  const description = activeStep === 0
    ? 'Searching for a student near your rating. Your timer keeps running while we build a fair match.'
    : activeStep === 1
      ? 'Your opponent is ready. Locking in the same rules and conditions for both players.'
      : activeStep === 2
        ? 'Setting up your shared arena and checking the match conditions.'
        : 'Creating and checking one identical standardized quiz for both players.'

  return <section className="rivals-matchmaking">
    <div className={`matchmaking-radar ${match.status === 'generating' ? 'found' : ''}`}><span /><span /><span />{match.status === 'generating' ? <Sparkles /> : <Swords />}</div>
    <span className="rivals-kicker">Ranked matchmaking</span>
    <h1 key={title} className="matchmaking-title">{title}</h1>
    <p>{description}</p>
    <div className="matchmaking-stopwatch" aria-label={`Matchmaking time ${formatTime(elapsed)}`}><Clock3 /><span><small>Matchmaking time</small><strong>{formatTime(elapsed)}</strong></span></div>
    <ol className="matchmaking-steps" aria-label="Matchmaking progress" aria-live="polite">
      {matchmakingSteps.map((step, index) => <li className={index < activeStep ? 'done' : index === activeStep ? 'active' : ''} key={step}><span>{index < activeStep ? <Check /> : index + 1}</span><b>{step}</b></li>)}
    </ol>
    <div className="matchmaking-tags"><span>{match.subject}</span><span>{match.topic}</span><span>{match.level}</span>{match.difficulty && <span>{match.difficulty}</span>}</div>
    {error && <ErrorState text={error} />}
    <Button variant="ghost" loading={cancelling} onClick={async () => { setCancelling(true); try { await onCancel() } finally { setCancelling(false) } }}>Cancel search</Button>
  </section>
}

export default function RivalsDashboard() {
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = async () => { setLoading(true); setError(''); try { setData(await loadRivalsDashboard()) } catch (problem) { setError(problem.message) } finally { setLoading(false) } }
  useEffect(() => { document.title = 'Rivals — Studentley'; load() }, [])
  if (loading && !data) return <Loader label="Loading Studentley Rivals…" />
  if (error && !data) return <SetupRequired error={error} />
  const profile = data?.profile || {}, played = Number(profile.total_battles || 0), wins = Number(profile.ranked_wins || 0) + Number(profile.friend_wins || 0)
  return <>
    <section className="rivals-hero"><div><span className="rivals-kicker"><Swords /> Competitive studying</span><h1>Learn. Compete. <em>Climb.</em></h1><p>Challenge students on equal questions, battle friends on shared material, and turn knowledge into rank.</p><div className="rivals-hero-actions"><Link className="button rivals-primary" to="/rivals/ranked"><Zap /> Find ranked match</Link><Link className="button rivals-secondary" to="/rivals/friends"><Users /> Study with friends</Link></div></div><div className="rivals-rank-orb" style={{ '--rank-color': rankColor(profile.rank) }}><Shield /><small>Current rank</small><strong>{profile.rank || 'Bronze'}</strong><span>{profile.rating || 900} rating</span></div></section>
    {data?.active_match && <Link className="rivals-active-match card" to={`/rivals/match/${data.active_match.id}`}><span><LoaderCircle className={['waiting','generating'].includes(data.active_match.status) ? 'spin' : ''} /></span><div><small>Battle in progress</small><b>{data.active_match.title}</b><p>{data.active_match.status === 'waiting' ? 'Searching for an opponent…' : data.active_match.status === 'generating' ? 'Preparing the shared quiz…' : 'Return to your live battle.'}</p></div><ArrowRight /></Link>}
    <section className="rivals-stat-grid"><article><Trophy /><span><small>Rating</small><strong>{profile.rating || 900}</strong></span></article><article><Swords /><span><small>Battles</small><strong>{played}</strong></span></article><article><Target /><span><small>Win rate</small><strong>{played ? Math.round(wins / played * 100) : 0}%</strong></span></article><article><Flame /><span><small>Best streak</small><strong>{profile.best_win_streak || 0}</strong></span></article></section>
    <div className="rivals-dashboard-grid">
      <section className="card rivals-mode-grid"><header><div><span>Choose your arena</span><h2>Competitive modes</h2></div></header><Link to="/rivals/ranked" className="ranked"><span><Trophy /></span><div><b>Ranked Mode</b><p>Standardized topics, skill-based matchmaking and 100 SP for the winner.</p></div><ArrowRight /></Link><Link to="/rivals/friends" className="friends"><span><Users /></span><div><b>Friend Battles</b><p>Use shared study material and invite up to seven friends with a room code.</p></div><ArrowRight /></Link><Link to="/rivals/quizzes" className="library"><span><Library /></span><div><b>Quiz Library</b><p>Create, publish and play quizzes made by the Studentley community.</p></div><ArrowRight /></Link></section>
      <section className="card rivals-ladder"><header><div><span>Ranked ladder</span><h2>Top Rivals</h2></div><Crown /></header>{data?.leaderboard?.slice(0, 10).map(entry => <article className={entry.is_current_user ? 'current' : ''} key={entry.user_id}><b className="rivals-place">{entry.position}</b><ProfileAvatar name={entry.display_name} path={entry.avatar_path} bucket={entry.avatar_bucket} /><span><b>{entry.display_name}{entry.is_current_user && <em>You</em>}</b><small style={{ color: rankColor(entry.rank) }}>{entry.rank}</small></span><strong>{entry.rating}</strong></article>)}<div className="rivals-own-place"><span><Trophy /><b>Your place</b><small>{profile.rank || 'Bronze'} · {profile.rating || 900} rating</small></span><strong>{profile.leaderboard_position ? `#${profile.leaderboard_position}` : '—'}</strong></div></section>
    </div>
    <section className="card rivals-recent"><header><div><span>Battle log</span><h2>Recent matches</h2></div><Button variant="ghost" onClick={load} loading={loading}><RefreshCw /> Refresh</Button></header>{data?.history?.filter(item => item.status === 'completed').length ? <div>{data.history.filter(item => item.status === 'completed').map(match => { const me = match.players.find(player => player.is_current_user); const won = match.winner_key === me?.player_key; return <Link to={`/rivals/match/${match.id}`} key={match.id}><span className={won ? 'won' : 'lost'}>{won ? <Trophy /> : <Swords />}</span><div><b>{match.title}</b><small>{match.mode === 'ranked' ? 'Ranked' : 'Friend battle'} · {match.subject} · {match.level}</small></div><strong>{won ? 'Victory' : match.winner_key ? 'Defeat' : 'Draw'}</strong><small>{me?.correct_answers ?? 0}/{match.question_count}</small></Link> })}</div> : <EmptyState compact icon={Swords} title="No completed battles yet" text="Your competitive match history will appear here." />}</section>
  </>
}

export function RankedRivals() {
  const navigate = useNavigate()
  const [topics, setTopics] = useState([]), [subject, setSubject] = useState(''), [topicId, setTopicId] = useState(''), [level, setLevel] = useState('GCSE / IGCSE'), [difficulty, setDifficulty] = useState('Exam standard')
  const [match, setMatch] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState('')
  useEffect(() => { document.title = 'Ranked — Studentley Rivals'; loadRivalTopics().then(result => { setTopics(result.topics); const first = result.topics[0]; if (first) { setSubject(first.subject); setTopicId(first.id); setLevel(first.levels.includes('GCSE / IGCSE') ? 'GCSE / IGCSE' : first.levels[0]) } }).catch(problem => setError(problem.message)) }, [])
  const subjects = [...new Set(topics.map(item => item.subject))], availableTopics = topics.filter(item => item.subject === subject), selectedTopic = topics.find(item => item.id === topicId)
  useEffect(() => { if (!availableTopics.some(item => item.id === topicId) && availableTopics[0]) { setTopicId(availableTopics[0].id); setLevel(availableTopics[0].levels.includes(level) ? level : availableTopics[0].levels[0]) } }, [subject, topics])
  useEffect(() => { if (!match || !['waiting','generating'].includes(match.status)) return; const timer = setInterval(() => loadRivalMatch(match.id).then(result => { setMatch(result.match); if (result.match.status === 'active') navigate(`/rivals/match/${result.match.id}`) }).catch(problem => setError(problem.message)), 2500); return () => clearInterval(timer) }, [match?.id, match?.status, navigate])
  useEffect(() => { if (!match || match.status !== 'waiting') return; const timer = setTimeout(() => addPracticeRival(match.id).then(result => { setMatch(result.match); if (result.match.status === 'active') navigate(`/rivals/match/${result.match.id}`) }).catch(problem => setError(problem.message)), 8000); return () => clearTimeout(timer) }, [match?.id, match?.status, navigate])
  const queue = async event => { event.preventDefault(); setLoading(true); setError(''); try { const result = await queueRankedBattle({ topicId, level, difficulty }); setMatch(result.match); if (result.match.status === 'active') navigate(`/rivals/match/${result.match.id}`) } catch (problem) { setError(problem.message) } finally { setLoading(false) } }
  if (match && ['waiting','generating'].includes(match.status)) return <MatchmakingPanel match={match} error={error} onCancel={async () => { await cancelRivalMatch(match.id); setMatch(null) }} />
  return <>
    <div className="rivals-page-heading"><div><span className="rivals-kicker"><Trophy /> Ranked mode</span><h1>Prove what you know.</h1><p>Uploaded documents are never used here. Every matchup comes from Studentley’s standardized topic bank.</p></div><div className="ranked-rules"><b>Correctness first</b><span>Speed breaks ties</span><small>Opponent gets 20 seconds after the first finish</small></div></div>
    {error && (error.includes('migration') ? <SetupRequired error={error} /> : <ErrorState text={error} />)}
    <form className="card ranked-setup" onSubmit={queue}><header><span><Target /></span><div><small>Match preferences</small><h2>Choose your battleground</h2></div></header><div className="ranked-form-grid"><Field label="Subject"><select value={subject} onChange={event => setSubject(event.target.value)}>{subjects.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Topic"><select value={topicId} onChange={event => { const id = event.target.value; setTopicId(id); const item = topics.find(value => value.id === id); if (item && !item.levels.includes(level)) setLevel(item.levels[0]) }}>{availableTopics.map(item => <option value={item.id} key={item.id}>{item.topic}</option>)}</select></Field><Field label="Grade / level"><select value={level} onChange={event => setLevel(event.target.value)}>{(selectedTopic?.levels || levels).map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Difficulty"><select value={difficulty} onChange={event => setDifficulty(event.target.value)}>{difficulties.map(value => <option key={value}>{value}</option>)}</select></Field></div><div className="ranked-fairness"><Shield /><span><b>Fair-match guarantee</b><small>Both students receive the exact same questions, answer order, difficulty and finish window.</small></span></div><Button className="rivals-primary full" loading={loading} disabled={!topicId}><Search /> Find opponent</Button></form>
    <section className="rivals-rank-road"><h2>Rank progression</h2><div>{tiers.map(([name, rating, color], index) => <article key={name} style={{ '--tier-color': color }}><span>{index < 3 ? <Medal /> : index === 5 ? <Crown /> : <Shield />}</span><b>{name}</b><small>{rating ? `${rating}+ rating` : 'Starting tier'}</small></article>)}</div></section>
  </>
}

export function FriendRivals() {
  const { data, user, refresh } = useApp()
  const navigate = useNavigate()
  const documents = data?.documents || []
  const [mode, setMode] = useState('create'), [documentId, setDocumentId] = useState(documents[0]?.id || ''), [title, setTitle] = useState('Study battle'), [subject, setSubject] = useState(''), [topic, setTopic] = useState(''), [level, setLevel] = useState('GCSE / IGCSE'), [difficulty, setDifficulty] = useState('Medium'), [count, setCount] = useState(10), [maxPlayers, setMaxPlayers] = useState(8), [code, setCode] = useState(''), [loading, setLoading] = useState(false), [error, setError] = useState(''), [uploading, setUploading] = useState(false)
  useEffect(() => { document.title = 'Friend Battles — Studentley Rivals' }, [])
  useEffect(() => { if (!documentId && documents[0]) setDocumentId(documents[0].id) }, [documents, documentId])
  const upload = async event => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError(''); try { const created = await uploadDocument({ userId: user.id, file, category: 'study_material' }); await refresh(); setDocumentId(created.id) } catch (problem) { setError(problem.message) } finally { setUploading(false); event.target.value = '' } }
  const create = async event => { event.preventDefault(); setLoading(true); setError(''); try { const generated = await generateQuiz({ documentIds: [documentId], subjectName: subject, topic, difficulty, count: Number(count) }); const result = await createFriendRoom({ practiceSetId: generated.practiceSet.id, title, subject, topic, level, difficulty, maxPlayers }); navigate(`/rivals/match/${result.match.id}`) } catch (problem) { setError(problem.message) } finally { setLoading(false) } }
  const join = async event => { event.preventDefault(); setLoading(true); setError(''); try { const result = await joinFriendRoom(code); navigate(`/rivals/match/${result.match.id}`) } catch (problem) { setError(problem.message) } finally { setLoading(false) } }
  return <>
    <div className="rivals-page-heading"><div><span className="rivals-kicker"><Users /> Friend battles</span><h1>Study the same. Battle together.</h1><p>Turn shared class material into one identical quiz, invite friends and see who learned it best.</p></div></div>
    <div className="rivals-switch"><button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}><Plus /> Create room</button><button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}><UserPlus /> Join room</button></div>
    {error && (error.includes('migration') ? <SetupRequired error={error} /> : <ErrorState text={error} />)}
    {mode === 'create' ? <form className="card friend-room-form" onSubmit={create}><div className="friend-form-intro"><span><BookOpen /></span><div><h2>Create a shared-material battle</h2><p>Studentley generates the quiz once. Every invited player receives that exact saved quiz.</p></div></div><Field label="Study material"><div className="rivals-document-pick"><select required value={documentId} onChange={event => setDocumentId(event.target.value)}><option value="">Choose uploaded material</option>{documents.map(document => <option value={document.id} key={document.id}>{document.name}</option>)}</select><label className="button rivals-secondary"><UploadCloud /> {uploading ? 'Uploading…' : 'Upload new'}<input hidden type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" onChange={upload} /></label></div></Field><div className="ranked-form-grid"><Field label="Room name"><input required value={title} maxLength={120} onChange={event => setTitle(event.target.value)} /></Field><Field label="Subject"><input required value={subject} onChange={event => setSubject(event.target.value)} placeholder="e.g. Biology" /></Field><Field label="Topic"><input value={topic} onChange={event => setTopic(event.target.value)} placeholder="e.g. Cell division" /></Field><Field label="Grade / level"><select value={level} onChange={event => setLevel(event.target.value)}>{[...levels, 'Mixed'].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Questions"><input type="number" min="3" max="20" value={count} onChange={event => setCount(event.target.value)} /></Field><Field label="Room size" hint="Choose 2–8 total players, including you."><div className="friend-player-count" role="group" aria-label="Maximum players">{friendRoomSizes.map(value => <button type="button" className={maxPlayers === value ? 'selected' : ''} aria-pressed={maxPlayers === value} onClick={() => setMaxPlayers(value)} key={value}>{value}</button>)}</div></Field></div><Button className="rivals-primary full" loading={loading || uploading} disabled={!documentId}><Sparkles /> Generate quiz and create room for {maxPlayers}</Button></form> : <form className="card join-room-form" onSubmit={join}><div className="join-code-icon"><Swords /></div><span className="rivals-kicker">Private room</span><h2>Enter the six-character room code</h2><p>Ask the host to share the code shown in their Friend Battle lobby.</p><input required autoCapitalize="characters" maxLength={6} value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC123" /><Button className="rivals-primary full" loading={loading} disabled={code.length !== 6}>Join battle <ArrowRight /></Button></form>}
  </>
}

const blankQuestion = () => ({ prompt: '', options: ['', '', '', ''], correct_index: 0, explanation: '' })

export function RivalQuizLibrary() {
  const [quizzes, setQuizzes] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [search, setSearch] = useState(''), [creating, setCreating] = useState(false), [playing, setPlaying] = useState(null)
  const [draft, setDraft] = useState({ title: '', subject: '', topic: '', level: 'GCSE / IGCSE', description: '', items: [blankQuestion(), blankQuestion(), blankQuestion()] })
  const load = async () => { setLoading(true); setError(''); try { setQuizzes((await loadPublicRivalQuizzes()).quizzes) } catch (problem) { setError(problem.message) } finally { setLoading(false) } }
  useEffect(() => { document.title = 'Quiz Library — Studentley Rivals'; load() }, [])
  const filtered = quizzes.filter(quiz => `${quiz.title} ${quiz.subject} ${quiz.topic} ${quiz.creator_name}`.toLowerCase().includes(search.toLowerCase()))
  const setQuestion = (index, changes) => setDraft(value => ({ ...value, items: value.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }))
  const save = async event => { event.preventDefault(); setLoading(true); setError(''); try { await createPublicRivalQuiz(draft); setCreating(false); setDraft({ title: '', subject: '', topic: '', level: 'GCSE / IGCSE', description: '', items: [blankQuestion(), blankQuestion(), blankQuestion()] }); await load() } catch (problem) { setError(problem.message); setLoading(false) } }
  if (playing) return <CommunityQuizPlayer quiz={playing} onClose={() => { setPlaying(null); load() }} />
  if (creating) return <section className="quiz-builder"><button className="rivals-back" onClick={() => setCreating(false)}><ChevronLeft /> Back to library</button><div className="rivals-page-heading"><div><span className="rivals-kicker"><Plus /> Create your own quiz</span><h1>Build something worth sharing.</h1><p>Add four options to every question, mark the correct answer, then publish it to the Rivals library.</p></div></div>{error && <ErrorState text={error} />}<form onSubmit={save}><section className="card quiz-builder-details"><div className="ranked-form-grid"><Field label="Quiz title"><input required minLength={3} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></Field><Field label="Subject"><input required minLength={2} value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} /></Field><Field label="Topic"><input value={draft.topic} onChange={event => setDraft({ ...draft, topic: event.target.value })} /></Field><Field label="Level"><select value={draft.level} onChange={event => setDraft({ ...draft, level: event.target.value })}>{[...levels, 'Mixed'].map(value => <option key={value}>{value}</option>)}</select></Field></div><Field label="Description"><textarea value={draft.description} maxLength={500} onChange={event => setDraft({ ...draft, description: event.target.value })} /></Field></section><div className="quiz-builder-questions">{draft.items.map((question, index) => <section className="card" key={index}><header><span>Question {index + 1}</span>{draft.items.length > 3 && <button type="button" onClick={() => setDraft(value => ({ ...value, items: value.items.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 /></button>}</header><Field label="Question"><textarea required value={question.prompt} onChange={event => setQuestion(index, { prompt: event.target.value })} /></Field><div className="builder-options">{question.options.map((option, optionIndex) => <label className={question.correct_index === optionIndex ? 'correct' : ''} key={optionIndex}><input type="radio" name={`correct-${index}`} checked={question.correct_index === optionIndex} onChange={() => setQuestion(index, { correct_index: optionIndex })} /><b>{String.fromCharCode(65 + optionIndex)}</b><input required value={option} onChange={event => { const options = [...question.options]; options[optionIndex] = event.target.value; setQuestion(index, { options }) }} placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} /></label>)}</div><Field label="Explanation (optional)"><input value={question.explanation} onChange={event => setQuestion(index, { explanation: event.target.value })} /></Field></section>)}</div><div className="quiz-builder-actions"><Button type="button" variant="secondary" disabled={draft.items.length >= 30} onClick={() => setDraft(value => ({ ...value, items: [...value.items, blankQuestion()] }))}><Plus /> Add question</Button><Button className="rivals-primary" loading={loading}><Library /> Publish to library</Button></div></form></section>
  return <>
    <div className="rivals-page-heading"><div><span className="rivals-kicker"><Library /> Community quizzes</span><h1>Play what students create.</h1><p>Challenge yourself with public quizzes—or build and publish your own.</p></div><Button className="rivals-primary" onClick={() => setCreating(true)}><Plus /> Create quiz</Button></div>
    {error && (error.includes('migration') ? <SetupRequired error={error} /> : <ErrorState text={error} />)}
    <div className="rivals-library-tools"><div><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search quizzes, subjects or creators" /></div><Button variant="ghost" loading={loading} onClick={load}><RefreshCw /> Refresh</Button></div>
    {filtered.length ? <div className="rivals-quiz-grid">{filtered.map(quiz => <article className="card" key={quiz.id}><div className="quiz-card-top"><span><BookOpen /></span>{quiz.is_mine && <em>Your quiz</em>}</div><small>{quiz.subject} · {quiz.level}</small><h2>{quiz.title}</h2><p>{quiz.description || quiz.topic || 'A community-created Studentley quiz.'}</p><div><span><Users /> {quiz.play_count} plays</span><span>{quiz.items.length} questions</span></div><footer><small>by {quiz.creator_name}</small><Button className="rivals-primary" onClick={() => setPlaying(quiz)}>Play <ArrowRight /></Button></footer></article>)}</div> : !loading && <EmptyState icon={Library} title="No quizzes found" text="Create the first quiz for this search." />}
  </>
}

function CommunityQuizPlayer({ quiz, onClose }) {
  const [index, setIndex] = useState(0), [answers, setAnswers] = useState({}), [result, setResult] = useState(null), [loading, setLoading] = useState(false)
  const started = useRef(Date.now()), current = quiz.items[index]
  const finish = async () => { setLoading(true); try { setResult(await submitPublicRivalQuiz(quiz.id, answers, Date.now() - started.current)) } finally { setLoading(false) } }
  if (result) return <section className="card rival-result-card"><span><Trophy /></span><small>Community quiz complete</small><h1>{Math.round(result.score_percent)}%</h1><p>{result.correct_answers} of {result.total_questions} correct</p><Button className="rivals-primary" onClick={onClose}>Return to library</Button></section>
  return <section className="card rival-arena community"><header><button onClick={onClose}><X /> Exit</button><span>{quiz.title}</span><b>{index + 1}/{quiz.items.length}</b></header><div className="rival-question-progress"><span style={{ width: `${(index + 1) / quiz.items.length * 100}%` }} /></div><main><small>{quiz.subject} · {quiz.level}</small><h1>{current.prompt}</h1><div className="rival-options">{current.options.map((option, optionIndex) => <button className={answers[index] === optionIndex ? 'selected' : ''} onClick={() => setAnswers({ ...answers, [index]: optionIndex })} key={optionIndex}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span></button>)}</div></main><footer><Button variant="ghost" disabled={!index} onClick={() => setIndex(value => value - 1)}><ChevronLeft /> Previous</Button><Button className="rivals-primary" loading={loading} disabled={answers[index] === undefined} onClick={() => index === quiz.items.length - 1 ? finish() : setIndex(value => value + 1)}>{index === quiz.items.length - 1 ? 'Submit quiz' : 'Next'} <ChevronRight /></Button></footer></section>
}

export function RivalMatch() {
  const { id } = useParams(), navigate = useNavigate()
  const [match, setMatch] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => { try { const result = await loadRivalMatch(id); setMatch(result.match); setError('') } catch (problem) { setError(problem.message) } finally { setLoading(false) } }, [id])
  useEffect(() => { document.title = 'Live Battle — Studentley Rivals'; load() }, [load])
  useEffect(() => { if (!match || match.status === 'completed' || match.status === 'cancelled') return; const timer = setInterval(load, 2000); return () => clearInterval(timer) }, [match?.status, load])
  useEffect(() => { if (!match || match.mode !== 'ranked' || match.status !== 'waiting') return; const timer = setTimeout(() => addPracticeRival(match.id).then(result => setMatch(result.match)).catch(problem => setError(problem.message)), 8000); return () => clearTimeout(timer) }, [match?.id, match?.mode, match?.status])
  if (loading && !match) return <Loader label="Entering the arena…" />
  if (error && !match) return <><ErrorState text={error} /><Button onClick={() => navigate('/rivals')}>Back to Rivals</Button></>
  if (!match) return null
  const me = match.players.find(player => player.is_current_user)
  if (match.mode === 'ranked' && ['waiting', 'generating'].includes(match.status)) return <MatchmakingPanel match={match} error={error} onCancel={async () => { await cancelRivalMatch(match.id); navigate('/rivals/ranked') }} />
  if (match.status === 'waiting') return <FriendLobby match={match} onStart={async () => { setLoading(true); try { setMatch((await startFriendRoom(match.id)).match) } catch (problem) { setError(problem.message) } finally { setLoading(false) } }} loading={loading} error={error} />
  if (match.status === 'generating') return <Loader label="Preparing the battle…" />
  if (match.status === 'completed') return <BattleResult match={match} onExit={() => navigate('/rivals')} />
  if (me?.submitted_at) return <section className="rivals-wait-result"><div className="matchmaking-radar compact"><span /><span /><span /><Check /></div><span className="rivals-kicker">Answers locked</span><h1>You finished with {me.correct_answers}/{match.question_count} correct.</h1><p>{match.finish_deadline ? 'Your opponents have up to 20 seconds to finish.' : 'Calculating the final result…'}</p><div className="rivals-player-pills">{match.players.map(player => <span className={player.submitted_at ? 'done' : ''} key={player.player_key}><ProfileAvatar name={player.display_name} path={player.avatar_path} bucket={player.avatar_bucket} />{player.display_name}<PracticeLabel player={player} />{player.submitted_at && <Check />}</span>)}</div></section>
  return <RivalArena match={match} onUpdate={setMatch} />
}

function FriendLobby({ match, onStart, loading, error }) {
  const copy = async () => { try { await navigator.clipboard.writeText(match.room_code) } catch { /* Clipboard may be blocked by the browser. */ } }
  return <section className="friend-lobby"><span className="rivals-kicker"><Users /> Friend Battle lobby</span><h1>{match.title}</h1><p>Share this code. Everyone receives the same {match.question_count}-question quiz when the host starts.</p><button className="room-code" onClick={copy}><span>{match.room_code}</span><Copy /> Copy</button><div className="lobby-details"><span>{match.subject}</span><span>{match.topic}</span><span>{match.level}</span></div><section className="card lobby-players"><header><h2>Players</h2><span>{match.players.length}/{match.max_players}</span></header><div>{match.players.map(player => <article key={player.player_key}><ProfileAvatar name={player.display_name} path={player.avatar_path} bucket={player.avatar_bucket} /><span><b>{player.display_name}{player.is_current_user && ' (You)'}</b><small>{player.user_id === match.players[0]?.user_id ? 'Room host' : 'Ready'}</small></span><Check /></article>)}{Array.from({ length: Math.max(0, match.max_players - match.players.length) }, (_, index) => <article className="empty" key={index}><span className="empty-avatar"><UserPlus /></span><span><b>Waiting for friend…</b><small>Share room code {match.room_code}</small></span></article>)}</div>{error && <ErrorState text={error} />}{match.is_host ? <Button className="rivals-primary full" loading={loading} disabled={match.players.length < 2} onClick={onStart}><Zap /> Start battle</Button> : <p className="waiting-host"><LoaderCircle className="spin" /> Waiting for the host to start…</p>}</section></section>
}

function RivalArena({ match, onUpdate }) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0), [answers, setAnswers] = useState({}), [submitting, setSubmitting] = useState(false), [now, setNow] = useState(Date.now()), submitted = useRef(false)
  const current = match.quiz[index]
  const finishRemaining = match.finish_deadline ? Math.max(0, new Date(match.finish_deadline).getTime() - now) : null
  const finishSeconds = finishRemaining === null ? null : Math.ceil(finishRemaining / 1000)
  const finishCritical = finishSeconds !== null && finishSeconds <= 5
  const elapsed = Math.max(0, now - new Date(match.started_at).getTime())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer) }, [])
  const submit = useCallback(async () => { if (submitted.current) return; submitted.current = true; setSubmitting(true); try { onUpdate((await submitRivalMatch(match.id, answers)).match) } catch { submitted.current = false } finally { setSubmitting(false) } }, [match.id, answers, onUpdate])
  useEffect(() => { if (finishRemaining === 0 && !submitted.current) submit() }, [finishRemaining, submit])
  return <section className={`card rival-arena ${finishRemaining !== null ? 'final-sprint' : ''} ${finishCritical ? 'critical' : ''}`}>
    <header><button onClick={async () => { if (submitted.current || !window.confirm('Forfeit this battle? Unanswered submission will be recorded.')) return; submitted.current = true; try { await submitRivalMatch(match.id, {}); navigate('/rivals') } catch { submitted.current = false } }}><X /> Forfeit / exit</button><div><span>{match.mode === 'ranked' ? 'Ranked Battle' : 'Friend Battle'}</span><b>{match.players.map(player => player.display_name).join(' vs ')}</b></div><div className={finishRemaining !== null ? 'sudden' : ''}><Clock3 /><span><small>{finishRemaining !== null ? 'Final sprint' : 'Time'}</small><b>{finishRemaining !== null ? `${finishSeconds}s` : formatTime(elapsed)}</b></span></div></header>
    <div className="rival-question-progress"><span style={{ width: `${(index + 1) / match.quiz.length * 100}%` }} /></div>
    <main>
      {finishRemaining !== null && <div className={`rivals-finish-countdown ${finishCritical ? 'critical' : ''}`} role="timer" aria-live={finishCritical ? 'assertive' : 'off'}><div><span>Opponent finished</span><strong key={finishSeconds}>{finishSeconds}</strong><p>seconds left · every correct answer selected before zero still counts</p></div><i aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, finishRemaining / 20000 * 100))}%` }} /></i></div>}
      <div className="arena-meta"><span>{match.subject}</span><span>{match.topic}</span><b>Question {index + 1} of {match.quiz.length}</b></div><h1 className="rival-question-enter" key={`prompt-${index}`}>{current.prompt}</h1><div className="rival-options rival-question-enter" key={`options-${index}`}>{current.options.map((option, optionIndex) => <button className={answers[index] === optionIndex ? 'selected' : ''} onClick={() => setAnswers({ ...answers, [index]: optionIndex })} key={optionIndex}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span></button>)}</div>
    </main>
    <footer><Button variant="ghost" disabled={!index} onClick={() => setIndex(value => value - 1)}><ChevronLeft /> Previous</Button><div className="arena-answer-count"><Check /> {Object.keys(answers).length}/{match.quiz.length} answered</div><Button className="rivals-primary" loading={submitting} disabled={answers[index] === undefined} onClick={() => index === match.quiz.length - 1 ? submit() : setIndex(value => value + 1)}>{index === match.quiz.length - 1 ? 'Lock answers' : 'Next'} <ChevronRight /></Button></footer>
  </section>
}

function BattleResult({ match, onExit }) {
  const sorted = [...match.players].sort((a, b) => (Number(b.correct_answers || 0) - Number(a.correct_answers || 0)) || (Number(a.elapsed_ms || Number.MAX_SAFE_INTEGER) - Number(b.elapsed_ms || Number.MAX_SAFE_INTEGER)))
  const me = match.players.find(player => player.is_current_user), won = match.winner_key === me?.player_key
  return <section className={`battle-result ${won ? 'victory' : ''}`}><div className="result-burst"><span><Trophy /></span></div><span className="rivals-kicker">{match.winner_key ? (won ? 'Victory' : 'Battle complete') : 'Draw'}</span><h1>{won ? 'You won the battle!' : match.winner_key ? `${sorted[0]?.display_name} takes the win` : 'Too close to separate'}</h1><p>{match.mode === 'ranked' && won ? '+100 Studentley Points have been added to your balance.' : match.mode === 'friend' && won ? '+35 Studentley Points have been added to your balance.' : 'Correct answers decide first. Speed only breaks a tie.'}</p><div className="result-scoreboard">{sorted.map((player, index) => <article className={`${player.is_current_user ? 'current' : ''} ${match.winner_key === player.player_key ? 'winner' : ''}`} key={player.player_key}><span className="result-position">{index === 0 ? <Crown /> : index + 1}</span><ProfileAvatar name={player.display_name} path={player.avatar_path} bucket={player.avatar_bucket} /><div><b>{player.display_name}{player.is_current_user && ' (You)'}<PracticeLabel player={player} /></b><small>{player.rating_after !== null && player.rating_before !== player.rating_after ? `${player.rating_after > player.rating_before ? '+' : ''}${player.rating_after - player.rating_before} rating` : match.mode === 'ranked' ? 'Rating unchanged' : 'Friend battle'}</small></div><strong>{player.correct_answers || 0}/{match.question_count}<small>{player.elapsed_ms === null ? 'Did not finish' : formatTime(player.elapsed_ms)}</small></strong></article>)}</div><div className="battle-result-actions"><Button className="rivals-primary" onClick={onExit}>Rivals dashboard</Button><Link className="button rivals-secondary" to={match.mode === 'ranked' ? '/rivals/ranked' : '/rivals/friends'}>Play again</Link></div></section>
}
