import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, GraduationCap, PartyPopper, Rocket, School, Sparkles, Star, Target, Trophy, WandSparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { createRecord, saveProfile } from '../lib/data'
import { isIsrEmail } from '../lib/schools'
import { curriculaForGrade, GRADES, LEARNING_GOALS, LEARNING_LEVELS, subjectsForStudent } from '../lib/personalization'
import { supabase } from '../lib/supabase'
import { Button, ErrorState } from '../components/UI'

const subjectColors = ['#2692f5', '#2fc77b', '#9a5cf0', '#ffad2f', '#f04d92', '#16b8b1']
const LAST_STEP = 10

const readSavedProgress = (user, profile) => {
  const key = user?.id ? `studentley-onboarding-${user.id}` : ''
  let local = null
  try { local = key ? JSON.parse(localStorage.getItem(key) || 'null') : null } catch { local = null }
  const metadata = user?.user_metadata || {}
  const preferences = metadata.learning_preferences || {}
  const savedDraft = local?.form || metadata.onboarding_draft || {}
  const grade = savedDraft.grade || String(profile?.grade_year || '').match(/\d+/)?.[0] || ''
  return {
    key,
    step: Math.max(0, Math.min(LAST_STEP, Number(local?.step ?? metadata.onboarding_step ?? 0) || 0)),
    form: {
      grade: grade ? String(grade) : '',
      curriculum: savedDraft.curriculum || profile?.school_system || '',
      school: savedDraft.school ?? profile?.school ?? metadata.school ?? '',
      level: Number(savedDraft.level ?? preferences.level ?? 1),
      subjects: savedDraft.subjects || preferences.struggling_subjects || [],
      goals: savedDraft.goals || profile?.goals || preferences.goals || [],
    },
  }
}

export default function Onboarding() {
  const { user, profile, data, refresh } = useApp()
  const navigate = useNavigate()
  const initial = useMemo(() => readSavedProgress(user, profile), [user?.id])
  const [step, setStep] = useState(initial.step)
  const [form, setForm] = useState(initial.form)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const personalizationStarted = useRef(false)
  const curricula = useMemo(() => curriculaForGrade(form.grade), [form.grade])
  const subjects = useMemo(() => subjectsForStudent(form.grade, form.curriculum), [form.grade, form.curriculum])
  const progress = step === 0 ? 4 : Math.min(100, Math.round((step / LAST_STEP) * 100))

  useEffect(() => {
    if (!initial.key) return
    localStorage.setItem(initial.key, JSON.stringify({ step, form }))
  }, [form, initial.key, step])

  const persist = (nextStep, nextForm = form) => {
    if (initial.key) localStorage.setItem(initial.key, JSON.stringify({ step: nextStep, form: nextForm }))
    supabase.auth.updateUser({ data: { onboarding_required: true, onboarding_step: nextStep, onboarding_draft: nextForm } }).catch(() => {})
  }

  const move = nextStep => {
    setError('')
    setStep(nextStep)
    persist(nextStep)
  }

  const next = () => {
    if (step === 1 && !form.grade) return setError('Choose your grade to continue.')
    if (step === 2 && !form.curriculum) return setError('Choose the curriculum that fits you best.')
    if (step === 5 && !form.subjects.length) return setError('Choose at least one subject so Studentley knows where to help.')
    if (step === 6 && !form.goals.length) return setError('Choose at least one learning goal.')
    move(Math.min(7, step + 1))
  }

  const updateGrade = grade => {
    setForm({ ...form, grade: String(grade), curriculum: '', subjects: [] })
    setError('')
  }
  const toggle = (key, value) => setForm(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }))

  useEffect(() => {
    if (step !== 7) return undefined
    const timer = window.setTimeout(() => { setStep(8); persist(8) }, 1900)
    return () => window.clearTimeout(timer)
  }, [step])

  const personalize = async () => {
    if (personalizationStarted.current) return
    personalizationStarted.current = true
    setSaving(true); setError('')
    const startedAt = Date.now()
    try {
      const normalizedSchool = /^isr(?:\b|\s|-)/i.test(form.school.trim()) ? 'ISR' : form.school.trim()
      const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student'
      await saveProfile(user.id, {
        display_name: displayName,
        grade_year: `Grade ${form.grade}`,
        school_system: form.curriculum,
        school: normalizedSchool || null,
        goals: form.goals,
        onboarding_complete: false,
      })
      const existing = new Set((data?.subjects || []).map(subject => subject.name.toLowerCase()))
      await Promise.all(form.subjects.filter(subject => !existing.has(subject.toLowerCase())).map((name, index) => createRecord('subjects', { user_id: user.id, name, color: subjectColors[index % subjectColors.length], icon: 'book' })))
      await supabase.auth.updateUser({ data: {
        onboarding_required: true,
        onboarding_step: 9,
        onboarding_draft: { ...form, school: normalizedSchool },
        learning_preferences: { level: form.level, struggling_subjects: form.subjects, goals: form.goals },
      } })
      await refresh()
      await new Promise(resolve => window.setTimeout(resolve, Math.max(0, 1700 - (Date.now() - startedAt))))
      setStep(9); persist(9, { ...form, school: normalizedSchool })
    } catch (value) {
      personalizationStarted.current = false
      setError(value.message || 'We could not personalize your account. Please try again.')
    } finally { setSaving(false) }
  }

  useEffect(() => { if (step === 8) personalize() }, [step])

  const complete = async tutorial => {
    setSaving(true); setError('')
    try {
      if (tutorial) {
        localStorage.setItem(`studentley-product-tour-${user.id}`, 'active')
        localStorage.setItem(`studentley-product-tour-step-${user.id}`, '0')
        window.dispatchEvent(new CustomEvent('studentley:start-tutorial'))
      }
      await saveProfile(user.id, { onboarding_complete: true })
      await supabase.auth.updateUser({ data: { onboarding_required: false, onboarding_step: null, onboarding_draft: null } })
      if (initial.key) localStorage.removeItem(initial.key)
      await refresh()
      navigate('/app', { replace: true })
    } catch (value) { setError(value.message || 'We could not finish your setup. Please try again.') }
    finally { setSaving(false) }
  }

  return <main className="onboarding-page onboarding-v2">
    <header className="onboarding-topbar"><div className="onboarding-brand"><span>S</span><b>Studentley</b></div><div className="onboarding-progress-label"><b>{progress}%</b><span>Personal setup</span></div><button onClick={() => supabase.auth.signOut()}>Sign out</button></header>
    <div className="onboarding-progress" aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }} /></div>
    <div className="onboarding-stage">
      {step === 0 && <OnboardingScreen key="welcome" className="welcome" icon={Sparkles} eyebrow="Welcome to Studentley!" title="Let's create your perfect learning experience!" text="A few quick choices will shape your dashboard, practice, exams and recommendations around you."><Button className="onboarding-main-action" onClick={() => move(1)}>Let's Get Started! <ArrowRight /></Button></OnboardingScreen>}

      {step === 1 && <OnboardingScreen key="grade" icon={GraduationCap} eyebrow="First things first" title="Which grade are you in?" text="We'll only show content and exam choices that make sense for your level."><div className="onboarding-grade-grid">{GRADES.map(grade => <button className={form.grade === String(grade) ? 'selected' : ''} onClick={() => updateGrade(grade)} key={grade}><small>GRADE</small><strong>{grade}</strong>{form.grade === String(grade) && <Check />}</button>)}</div></OnboardingScreen>}

      {step === 2 && <OnboardingScreen key="curriculum" icon={BookOpen} eyebrow="Your learning path" title="What curriculum do you study?" text={`These options are matched to Grade ${form.grade}.`}><div className="onboarding-option-grid">{curricula.map(option => <button className={form.curriculum === option.value ? 'selected' : ''} onClick={() => setForm({ ...form, curriculum: option.value, subjects: [] })} key={option.value}><span><b>{option.label}</b><small>{option.detail}</small></span>{form.curriculum === option.value ? <Check /> : <ChevronRight />}</button>)}</div></OnboardingScreen>}

      {step === 3 && <OnboardingScreen key="school" icon={School} eyebrow="Optional" title="Which school do you attend?" text="This helps us understand your school context. You can skip this question."><div className="onboarding-school-entry"><input autoFocus value={form.school} onChange={event => setForm({ ...form, school: event.target.value })} placeholder="Type your school name" /><button className={form.school === 'ISR' ? 'selected' : ''} onClick={() => setForm({ ...form, school: 'ISR' })}><School /><span><b>ISR — International School on the Rhine</b><small>{isIsrEmail(user?.email) ? 'Your verified ISR email unlocks a free Plus School plan.' : 'Choose ISR and verify an eligible ISR school email to receive Plus for free.'}</small></span>{form.school === 'ISR' && <Check />}</button></div></OnboardingScreen>}

      {step === 4 && <OnboardingScreen key="level" icon={Target} eyebrow="You're halfway there!" title="How would you describe your level at school?" text="Slide to the answer that feels most honest. This changes difficulty—not your potential."><div className="onboarding-level"><div className="onboarding-level-result"><strong>{LEARNING_LEVELS[form.level]?.label}</strong><p>{LEARNING_LEVELS[form.level]?.detail}</p></div><input aria-label="School confidence level" type="range" min="0" max="3" step="1" value={form.level} onChange={event => setForm({ ...form, level: Number(event.target.value) })} style={{ '--level-progress': `${form.level / 3 * 100}%` }} /><div className="onboarding-level-labels">{LEARNING_LEVELS.map((item, index) => <button className={form.level === index ? 'active' : ''} onClick={() => setForm({ ...form, level: index })} key={item.value}>{index + 1}</button>)}</div></div></OnboardingScreen>}

      {step === 5 && <OnboardingScreen key="subjects" icon={Trophy} eyebrow="Focus your support" title="Which subjects do you struggle with?" text={`Choose as many as you need. These match Grade ${form.grade} and your ${form.curriculum} curriculum.`}><div className="onboarding-subject-grid">{subjects.map(subject => <button className={form.subjects.includes(subject) ? 'selected' : ''} onClick={() => toggle('subjects', subject)} key={subject}><span>{subject.slice(0, 1)}</span><b>{subject}</b>{form.subjects.includes(subject) && <Check />}</button>)}</div></OnboardingScreen>}

      {step === 6 && <OnboardingScreen key="goals" icon={Star} eyebrow="Make it yours" title="What are your learning goals?" text="Select every goal that matters to you."><div className="onboarding-goal-list">{LEARNING_GOALS.map((goal, index) => <button className={form.goals.includes(goal) ? 'selected' : ''} onClick={() => toggle('goals', goal)} key={goal}><span>{index + 1}</span><b>{goal}</b>{form.goals.includes(goal) && <Check />}</button>)}</div></OnboardingScreen>}

      {step === 7 && <OnboardingScreen key="almost" className="almost" icon={Rocket} eyebrow="Almost there!" title="You're doing amazing! Just one more moment..." text="We're organizing your choices into a learning experience built around you."><div className="onboarding-final-progress"><span /></div><b className="onboarding-final-percent">100%</b></OnboardingScreen>}

      {step === 8 && <OnboardingScreen key="personalizing" className="personalizing" icon={WandSparkles} eyebrow="Personalizing your experience" title="Studentley is becoming yours." text="We're aligning difficulty, exam formats, visual guides and recommendations with your profile."><div className="personalization-list">{['Grade-appropriate difficulty', `${form.curriculum} learning formats`, `Support for ${form.subjects.slice(0, 2).join(' and ')}`, 'Your learning goals'].map((item, index) => <div style={{ '--personalize-delay': `${index * .24}s` }} key={item}><Check /><span>{item}</span></div>)}</div>{error && <><ErrorState text={error} /><Button onClick={personalize} loading={saving}>Try again</Button></>}</OnboardingScreen>}

      {step === 9 && <OnboardingScreen key="celebration" className="celebration" icon={PartyPopper} eyebrow="Onboarding completed!" title="WELCOME TO STUDENTLEY!" text="Your personalized learning platform is ready."><Confetti /><div className="celebration-summary"><span>Grade {form.grade}</span><span>{form.curriculum}</span><span>{form.subjects.length} focus subjects</span></div><Button className="onboarding-main-action" onClick={() => move(10)}>Continue <ArrowRight /></Button></OnboardingScreen>}

      {step === 10 && <OnboardingScreen key="tutorial" icon={Sparkles} eyebrow="One last choice" title="Would you like a quick tutorial?" text="Take a guided tour now, or start exploring on your own. You can replay it later in Settings."><div className="tutorial-choice"><button onClick={() => complete(true)} disabled={saving}><span><Rocket /></span><b>Yes, Show Me Around!</b><small>See the dashboard, exams, visual guides, Rivals, Quiz Show and leaderboard.</small><ArrowRight /></button><button onClick={() => complete(false)} disabled={saving}><span><Sparkles /></span><b>No Thanks, I'll Explore Myself!</b><small>Open your personalized dashboard immediately.</small><ArrowRight /></button></div></OnboardingScreen>}

      {error && step !== 8 && <ErrorState text={error} />}
      {step >= 1 && step <= 6 && <footer className="onboarding-actions-v2"><Button variant="ghost" onClick={() => move(step - 1)}><ArrowLeft /> Back</Button><div><small>{step === 3 ? 'Optional — you can skip' : step === 4 ? 'There is no wrong answer' : `${step} of 6 questions`}</small><Button onClick={next}>{step === 3 && !form.school.trim() ? 'Skip' : 'Continue'} <ArrowRight /></Button></div></footer>}
    </div>
  </main>
}

function OnboardingScreen({ icon: Icon, eyebrow, title, text, className = '', children }) {
  return <section className={`onboarding-screen ${className}`}><div className="onboarding-screen-glow" /><span className="onboarding-screen-icon"><Icon /></span><span className="onboarding-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p><div className="onboarding-screen-content">{children}</div></section>
}

function Confetti() {
  return <div className="onboarding-confetti" aria-hidden="true">{Array.from({ length: 34 }, (_, index) => <i style={{ '--confetti-index': index, '--confetti-left': `${(index * 37) % 100}%`, '--confetti-delay': `${(index % 9) * .08}s` }} key={index} />)}</div>
}
