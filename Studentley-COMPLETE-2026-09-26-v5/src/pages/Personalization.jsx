import React, { useEffect, useRef, useState } from 'react'
import { Ban, Bell, BrainCircuit, CheckCircle2, Clock3, Crown, Lock, Pencil, Plus, Save, Trash2, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { createScheduleEntry, loadPersonalization, removeScheduleEntry, savePersonalContext, saveProfile, updateScheduleEntry } from '../lib/data'
import { Button, EmptyState, ErrorState, Field, Loader, Modal, PageHeading } from '../components/UI'

const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const categories = [['school', 'School'], ['sleep', 'Sleep'], ['sport', 'Sport'], ['meal', 'Meal'], ['travel', 'Travel'], ['other', 'Other']]
const blankContext = { about_me: '', learning_preferences: '', study_goals: '', routine_notes: '' }
const blankEntry = { title: '', category: 'school', availability_kind: 'busy', day_of_week: 1, start_time: '08:00', end_time: '15:00', notes: '' }

export default function Personalization() {
  const { user, profile, refresh, notify } = useApp()
  const isPro = profile?.subscription_plan === 'pro'
  const [loading, setLoading] = useState(isPro), [error, setError] = useState(''), [migrationRequired, setMigrationRequired] = useState(false)
  const [context, setContext] = useState(blankContext), [schedule, setSchedule] = useState([]), [saving, setSaving] = useState(false), [entry, setEntry] = useState(null)
  const importInput = useRef()

  const load = async () => {
    if (!isPro) return
    setLoading(true); setError('')
    try {
      const value = await loadPersonalization()
      setMigrationRequired(value.migrationRequired)
      setContext({ ...blankContext, ...(value.context || {}) })
      setSchedule(value.schedule || [])
    } catch (problem) { setError(problem.message || 'Your personalization settings could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { document.title = 'Studio — Studentley'; load() }, [isPro])

  if (!isPro) return <>
    <PageHeading eyebrow="Pro Studio" title="A study experience built around you" text="Personal routines and intelligent study reminders are reserved for Pro members." />
    <section className="card pro-locked-page"><span className="pro-lock-orb"><Crown /></span><span className="pro-exclusive-label"><Crown /> Studentley Pro</span><h2>Unlock Studio</h2><p>Tell Studentley how you learn, when you are free and when real life keeps you busy. Your personal AI can then explain, plan and add work around your actual routine.</p><div className="pro-feature-grid"><article><BrainCircuit /><b>Personal AI context</b><small>Adapt explanations, pacing and methods.</small></article><article><Clock3 /><b>Free and blocked times</b><small>Place study sessions inside realistic windows.</small></article><article><Bell /><b>Study reminders</b><small>Get reminded before planned sessions.</small></article></div><Link className="button violet" to="/plans"><Crown /> View Pro plan</Link></section>
  </>

  if (loading) return <Loader label="Loading your Pro personalization…" />
  return <>
    <PageHeading eyebrow="Pro exclusive" title="Studio" text="Shape your personal AI with your learning style, goals, free study windows and times that must stay blocked." actions={<span className="pro-page-badge"><Crown /> Pro</span>} />
    {error && <ErrorState text={error} />}
    {migrationRequired && <ErrorState text="The Pro personalization database update still needs to be applied before this page can save changes." />}
    <div className="personalization-grid">
      <section className="card personal-context-card"><div className="settings-title"><span className="icon-bubble violet"><BrainCircuit /></span><div><h2>How your personal AI should adapt</h2><p>This private context shapes every Pro personal AI request.</p></div></div><div className="personal-data-note"><Lock /><p><b>Private by default</b><br />These details never appear on your leaderboard profile.</p></div><Field label="About you" hint="For example: subjects you enjoy, interests, or anything that makes examples more useful."><textarea value={context.about_me} onChange={event => setContext({ ...context, about_me: event.target.value })} maxLength={4000} placeholder="I enjoy tennis and learn best with practical examples…" /></Field><Field label="How you learn best"><textarea value={context.learning_preferences} onChange={event => setContext({ ...context, learning_preferences: event.target.value })} maxLength={4000} placeholder="Short explanations first, then worked examples and retrieval questions…" /></Field><Field label="Goals"><textarea value={context.study_goals} onChange={event => setContext({ ...context, study_goals: event.target.value })} maxLength={4000} placeholder="Improve algebra confidence and prepare for my IGCSE exams…" /></Field><Field label="Routine or accessibility notes"><textarea value={context.routine_notes} onChange={event => setContext({ ...context, routine_notes: event.target.value })} maxLength={4000} placeholder="I need a short break after school and prefer quiet evening sessions…" /></Field><div className="personal-context-actions"><Button variant="secondary" type="button" onClick={() => importInput.current?.click()}><UploadCloud /> Import .txt</Button><input ref={importInput} hidden type="file" accept="text/plain,.txt" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 100000) return notify('Choose a text file smaller than 100 KB.', 'error'); const text = await file.text(); setContext(value => ({ ...value, about_me: [value.about_me, text].filter(Boolean).join('\n\n').slice(0, 4000) })); event.target.value = '' }} /><Button loading={saving} disabled={migrationRequired} onClick={async () => { setSaving(true); try { await savePersonalContext(user.id, { about_me: context.about_me.trim(), learning_preferences: context.learning_preferences.trim(), study_goals: context.study_goals.trim(), routine_notes: context.routine_notes.trim() }); notify('Personal AI context saved.') } catch (problem) { notify(problem.message || 'Could not save your personal context.', 'error') } finally { setSaving(false) } }}><Save /> Save context</Button></div></section>
      <section className="card schedule-card"><div className="section-heading"><div className="settings-title"><span className="icon-bubble blue"><Clock3 /></span><div><h2>Availability & weekly routine</h2><p>Add times when you are free to study and times your personal AI must keep clear.</p></div></div><Button variant="secondary" disabled={migrationRequired} onClick={() => setEntry({ ...blankEntry })}><Plus /> Add time</Button></div>{schedule.length ? <div className="personal-schedule">{days.slice(1).map((day, index) => { const items = schedule.filter(item => Number(item.day_of_week) === index + 1); if (!items.length) return null; return <section key={day}><h3>{day}</h3>{items.map(item => { const available = item.availability_kind === 'free'; return <article className={available ? 'available' : 'busy'} key={item.id}><span className={`schedule-availability ${available ? 'free' : 'busy'}`}>{available ? <CheckCircle2 /> : <Ban />}{available ? 'Free' : categories.find(option => option[0] === item.category)?.[1] || 'Busy'}</span><div><b>{item.title}</b><small>{String(item.start_time).slice(0, 5)}–{String(item.end_time).slice(0, 5)}{item.notes ? ` · ${item.notes}` : ''}</small></div><button onClick={() => setEntry({ ...item, availability_kind: item.availability_kind || 'busy', start_time: String(item.start_time).slice(0, 5), end_time: String(item.end_time).slice(0, 5) })} aria-label={`Edit ${item.title}`}><Pencil /></button><button className="danger" onClick={async () => { if (!window.confirm(`Delete “${item.title}”?`)) return; try { await removeScheduleEntry(item.id); await load(); notify('Schedule entry deleted.') } catch (problem) { notify(problem.message, 'error') } }} aria-label={`Delete ${item.title}`}><Trash2 /></button></article> })}</section> })}</div> : <EmptyState compact icon={Clock3} title="Add free and blocked times" text="Tell your AI when studying works well and when school, sleep, sport or travel makes you unavailable." />}</section>
    </div>
    <section className="card pro-reminders-card"><span className="icon-bubble green"><Bell /></span><div><h2>Pro study reminders</h2><p>When Studentley is open, a notification appears 30 minutes before your next planned study session.</p></div><button role="switch" aria-checked={Boolean(profile?.study_reminders)} className={`pro-reminder-switch ${profile?.study_reminders ? 'on' : ''}`} onClick={async () => { try { await saveProfile(user.id, { study_reminders: !profile?.study_reminders }); await refresh(); notify(`Study reminders ${profile?.study_reminders ? 'disabled' : 'enabled'}.`) } catch (problem) { notify(problem.message, 'error') } }}><i /></button></section>
    {entry && <ScheduleModal entry={entry} setEntry={setEntry} userId={user.id} onClose={() => setEntry(null)} onSaved={async message => { setEntry(null); await load(); notify(message) }} />}
  </>
}

function ScheduleModal({ entry, setEntry, userId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const submit = async event => {
    event.preventDefault(); setError('')
    if (entry.start_time === entry.end_time) return setError('Start and end time must be different.')
    setSaving(true)
    const payload = { title: entry.title.trim(), category: entry.availability_kind === 'free' ? 'other' : entry.category, availability_kind: entry.availability_kind || 'busy', day_of_week: Number(entry.day_of_week), start_time: entry.start_time, end_time: entry.end_time, notes: entry.notes.trim() }
    try { if (entry.id) await updateScheduleEntry(entry.id, payload); else await createScheduleEntry({ user_id: userId, ...payload }); await onSaved(entry.id ? 'Schedule entry updated.' : 'Schedule entry added.') }
    catch (problem) { setError(problem.message || 'The schedule entry could not be saved.') }
    finally { setSaving(false) }
  }
  return <Modal title={entry.id ? 'Edit weekly time' : 'Add weekly time'} description="Free windows guide your personal AI. Blocked times are never used for study sessions. Overnight times such as 22:30–07:00 are supported." onClose={onClose}><form onSubmit={submit}><Field label="This time is"><select value={entry.availability_kind || 'busy'} onChange={event => setEntry({ ...entry, availability_kind: event.target.value })}><option value="free">Free for studying</option><option value="busy">Unavailable / keep blocked</option></select></Field><Field label={entry.availability_kind === 'free' ? 'Name this study window' : 'What happens?'}><input required maxLength={120} value={entry.title} onChange={event => setEntry({ ...entry, title: event.target.value })} placeholder={entry.availability_kind === 'free' ? 'Morning study window' : 'School, sleep, tennis…'} /></Field><div className="form-grid"><Field label="Day"><select value={entry.day_of_week} onChange={event => setEntry({ ...entry, day_of_week: Number(event.target.value) })}>{days.slice(1).map((day, index) => <option value={index + 1} key={day}>{day}</option>)}</select></Field>{entry.availability_kind !== 'free' && <Field label="Type"><select value={entry.category} onChange={event => setEntry({ ...entry, category: event.target.value })}>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>}<Field label="Starts"><input required type="time" value={entry.start_time} onChange={event => setEntry({ ...entry, start_time: event.target.value })} /></Field><Field label="Ends"><input required type="time" value={entry.end_time} onChange={event => setEntry({ ...entry, end_time: event.target.value })} /></Field></div><Field label="Notes (optional)"><input maxLength={400} value={entry.notes} onChange={event => setEntry({ ...entry, notes: event.target.value })} placeholder="Energy level, preferred subjects, travel time…" /></Field>{error && <p className="ai-error">{error}</p>}<Button className="full" loading={saving}><Save /> Save time</Button></form></Modal>
}
