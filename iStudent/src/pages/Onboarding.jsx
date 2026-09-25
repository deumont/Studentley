import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Clock3, Flag, GraduationCap, Sparkles, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { createRecord, saveProfile } from '../lib/data'
import { Button, ErrorState, Field } from '../components/UI'

const schoolSystems = ['IGCSE', 'GCSE', 'IB', 'A-Level', 'AP', 'Other']
const starterSubjects = ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Computer Science', 'Spanish', 'French']
const studyTimes = ['15 minutes', '30 minutes', '45 minutes', '1 hour', '1.5 hours', '2+ hours']
const preferences = ['Morning', 'Afternoon', 'Evening', 'Flexible']
const goals = ['Improve my grades', 'Prepare for exams', 'Stay organised', 'Build better study habits', 'Catch up', 'Reduce last-minute revision']
const colors = ['#2692f5', '#2fc77b', '#9a5cf0', '#ffad2f', '#f04d92', '#16b8b1']

export default function Onboarding() {
  const { user, profile, refresh } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(0), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const [form, setForm] = useState({ name: profile?.display_name || user?.user_metadata?.display_name || '', grade: '', system: '', subjects: [], custom: '', daily: '45 minutes', preferred: 'Flexible', goals: [] })
  const toggle = (key, value) => setForm(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }))
  const next = () => { setError(''); if (step === 0 && (!form.name.trim() || !form.grade || !form.system)) return setError('Complete each field to continue.'); if (step === 1 && !form.subjects.length) return setError('Choose at least one subject.'); setStep(value => Math.min(4, value + 1)) }
  const finish = async () => {
    setSaving(true); setError('')
    try {
      await saveProfile(user.id, { display_name: form.name.trim(), grade_year: form.grade, school_system: form.system, daily_study_minutes: Number.parseInt(form.daily) || 120, preferred_study_time: form.preferred.toLowerCase(), goals: form.goals, onboarding_complete: true })
      await Promise.all(form.subjects.map((name, index) => createRecord('subjects', { user_id: user.id, name, color: colors[index % colors.length], icon: 'book' })))
      await refresh(); setStep(4)
    } catch (value) { setError(value.message || 'We could not save your setup.') }
    finally { setSaving(false) }
  }
  const addCustom = () => { const value = form.custom.trim(); if (value && !form.subjects.includes(value)) setForm({ ...form, subjects: [...form.subjects, value], custom: '' }) }
  return <main className="onboarding-page"><header><a className="brand"><span>iS</span><b>iStudent</b></a>{step < 4 && <span>Step {step + 1} of 4</span>}</header><div className="onboarding-shell"><div className="progress-track"><span style={{ width: `${step === 4 ? 100 : (step + 1) * 25}%` }} /></div>
    {step === 0 && <Step icon={GraduationCap} eyebrow="Let’s get to know you" title="Build your school profile" text="This makes iStudent useful from your very first day."><div className="form-grid"><Field label="What should we call you?"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your first name" /></Field><Field label="Grade or year"><input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="e.g. Grade 8 or Year 11" /></Field><Field label="School system" className="span-2"><div className="choice-grid small">{schoolSystems.map(item => <Choice key={item} selected={form.system === item} onClick={() => setForm({ ...form, system: item })}>{item}</Choice>)}</div></Field></div></Step>}
    {step === 1 && <Step icon={BookOpen} eyebrow="Your learning world" title="What subjects are you studying?" text="Choose only your real subjects. You can change these later."><div className="choice-grid subjects">{starterSubjects.map(item => <Choice key={item} selected={form.subjects.includes(item)} onClick={() => toggle('subjects', item)}>{item}</Choice>)}</div><div className="add-custom"><input value={form.custom} onChange={e => setForm({ ...form, custom: e.target.value })} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())} placeholder="Add another subject" /><Button variant="secondary" onClick={addCustom}>Add</Button></div></Step>}
    {step === 2 && <Step icon={Clock3} eyebrow="Find your rhythm" title="When and how long do you want to study?" text="Set an ideal pace—not a perfect one."><Field label="Daily study goal"><div className="choice-grid small">{studyTimes.map(item => <Choice key={item} selected={form.daily === item} onClick={() => setForm({ ...form, daily: item })}>{item}</Choice>)}</div></Field><Field label="Preferred study time"><div className="choice-grid small">{preferences.map(item => <Choice key={item} selected={form.preferred === item} onClick={() => setForm({ ...form, preferred: item })}>{item}</Choice>)}</div></Field></Step>}
    {step === 3 && <Step icon={Flag} eyebrow="One last step" title="What do you want to achieve?" text="Choose everything that matters to you."><div className="choice-grid goals">{goals.map(item => <Choice key={item} selected={form.goals.includes(item)} onClick={() => toggle('goals', item)}>{item}</Choice>)}</div></Step>}
    {step === 4 && <section className="onboarding-card finish"><span className="finish-icon"><Sparkles /></span><span className="eyebrow">You’re ready</span><h1>Your iStudent space is yours.</h1><p>Start clean, then add the school information that matters to you.</p><div className="optional-setup"><button onClick={() => navigate('/study-plan')}><CalendarDays /><span><b>Create your timetable</b><small>Add classes manually now</small></span><ArrowRight /></button><button onClick={() => navigate('/practice')}><GraduationCap /><span><b>Add your first exam</b><small>Keep every deadline visible</small></span><ArrowRight /></button><button onClick={() => navigate('/upload')}><Upload /><span><b>Upload study material</b><small>Store a document securely</small></span><ArrowRight /></button></div><Button className="full" onClick={() => navigate('/')}>Go to my dashboard</Button></section>}
    {error && <ErrorState text={error} />}{step < 4 && <footer className="onboarding-actions">{step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft /> Back</Button> : <span />}{step === 3 ? <Button loading={saving} onClick={finish}>Finish setup <Check /></Button> : <Button onClick={next}>Continue <ArrowRight /></Button>}</footer>}
  </div></main>
}

function Step({ icon: Icon, eyebrow, title, text, children }) { return <section className="onboarding-card"><span className="step-icon"><Icon /></span><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p><div className="step-content">{children}</div></section> }
function Choice({ selected, onClick, children }) { return <button type="button" className={`choice ${selected ? 'selected' : ''}`} onClick={onClick}>{children}{selected && <Check />}</button> }
