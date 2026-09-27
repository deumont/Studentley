import React, { useEffect, useState } from 'react'
import { BookOpenCheck, Coins, Crown, Flame, Medal, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import { loadLeaderboard } from '../lib/data'
import { Button, EmptyState, ErrorState, Loader, PageHeading, ProfileAvatar, formatDate } from '../components/UI'
import { useApp } from '../context/AppContext'

const medals = [Crown, Medal, Medal]

export default function Leaderboard() {
  const { user } = useApp()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true); setError('')
    try { setBoard(await loadLeaderboard()) }
    catch (value) { setError(value.message || 'The leaderboard could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { document.title = 'Leaderboard — Studentley'; load() }, [])
  if (loading && !board) return <Loader label="Loading the leaderboard…" />
  const stats = board?.stats || {}
  return <>
    <PageHeading eyebrow="Multiplayer leaderboard" title="Turn focused study into momentum" text="Earn Studentley Points from completed study sessions, quizzes, and mock exams." actions={<Button variant="secondary" onClick={load} loading={loading}><RefreshCw /> Refresh</Button>} />
    {error && <ErrorState text={error} />}
    <section className="points-overview">
      <article className="card points-balance"><span><Coins /></span><div><small>Your balance</small><strong>{Number(stats.study_points || 0).toLocaleString()}</strong><b>Studentley Points</b></div></article>
      <article className="card points-stat"><Flame /><span><strong>{stats.current_streak || 0}</strong><small>day streak</small></span></article>
      <article className="card points-stat"><Trophy /><span><strong>{stats.leaderboard_rank ? `#${stats.leaderboard_rank}` : '—'}</strong><small>global rank</small></span></article>
      <article className="card points-stat"><Sparkles /><span><strong>{stats.longest_streak || 0}</strong><small>best streak</small></span></article>
    </section>
    <div className="leaderboard-layout">
      <section className="card leaderboard-card"><header><span className="icon-bubble orange"><Trophy /></span><div><h2>Studentley League</h2><p>Students ranked by earned points</p></div></header>
        {board?.leaderboard?.length ? <div className="leaderboard-list">{board.leaderboard.map(entry => { const MedalIcon = medals[entry.position - 1]; const avatarPath = entry.is_current_user ? (user?.user_metadata?.avatar_path || entry.avatar_path) : entry.avatar_path; const avatarBucket = entry.is_current_user ? (user?.user_metadata?.avatar_bucket || entry.avatar_bucket || 'documents') : (entry.avatar_bucket || 'avatars'); return <article className={`${entry.is_current_user ? 'current' : ''} ${entry.position <= 3 ? `top-${entry.position}` : ''}`} key={`${entry.position}-${entry.display_name}`}><span className="leaderboard-position">{MedalIcon ? <MedalIcon /> : entry.position}</span><ProfileAvatar name={entry.display_name} path={avatarPath || ''} bucket={avatarBucket} className="leaderboard-avatar" /><div><b>{entry.display_name}{entry.is_current_user && <em>You</em>}</b><small><Flame /> {entry.current_streak} day streak</small></div><strong>{Number(entry.study_points).toLocaleString()} <small>SP</small></strong></article>})}</div> : <EmptyState icon={Trophy} title="The league is ready" text="Complete a study session to become the first ranked student." />}
      </section>
      <aside className="leaderboard-side">
        <section className="card earn-points"><h2>How points work</h2><div><span className="blue"><BookOpenCheck /></span><p><b>Study sessions</b><small>10 SP + 1 SP per 5 focused minutes</small></p></div><div><span className="green"><Sparkles /></span><p><b>Quizzes</b><small>25–50 SP based on your result</small></p></div><div><span className="violet"><Trophy /></span><p><b>Mock exams</b><small>75–150 SP based on your result</small></p></div><p className="points-rule">Each activity awards points once. Reopening a completed session cannot create extra points.</p></section>
        <section className="card points-history"><h2>Recent earnings</h2>{board?.history?.length ? board.history.map(event => <div key={event.id}><span className="history-coin"><Coins /></span><p><b>{event.description}</b><small>{formatDate(event.created_at, { hour: 'numeric', minute: '2-digit' })}</small></p><strong>+{event.points}</strong></div>) : <p className="muted">Your completed activities will appear here.</p>}</section>
      </aside>
    </div>
  </>
}
