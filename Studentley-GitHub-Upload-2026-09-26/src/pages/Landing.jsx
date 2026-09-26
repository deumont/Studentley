import React, { useEffect } from 'react'
import { ArrowDown, ArrowRight, BarChart3, BookOpen, Brain, CalendarDays, Check, Clock3, FileQuestion, FileText, Flag, GraduationCap, Layers3, MessageCircle, Sparkles, Target, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'

const studentFacts = [
  ['Different material', 'PowerPoints, worksheets, notes and textbooks all demand a different approach.'],
  ['Different pressure', 'Five approaching exams is a different week from one difficult topic.'],
  ['Different rhythm', 'Your time, pace and study habits should shape the plan—not the other way around.'],
]

const features = [
  [UploadCloud, 'Document uploads', 'Turn your actual notes, PDFs, presentations, worksheets and images into an organised study library.', 'blue'],
  [CalendarDays, 'Personalized study plan', 'Plan around exams, available time, subjects and the way you prefer to work.', 'green'],
  [MessageCircle, 'AI Tutor', 'Get contextual explanations grounded in your learning material when secure AI is enabled.', 'violet'],
  [FileQuestion, 'Quizzes & mock exams', 'Build serious practice from the content you are genuinely expected to learn.', 'orange'],
  [BookOpen, 'Flashcards', 'Transform your own learning content into focused recall practice.', 'blue'],
  [BarChart3, 'Progress that means something', 'Keep study activity, preparation and results connected to real subjects and exams.', 'green'],
]

export default function Landing() {
  useEffect(() => { document.title = 'Studentley — Built around the student' }, [])
  return <PublicLayout><main>
    <section className="public-hero"><div className="public-container hero-grid"><div className="hero-copy"><span className="public-pill"><Sparkles /> Built around the student</span><h1>School isn’t personalized. <em>Studentley is.</em></h1><p>Bring your material, exams and schedule into one focused system. Studentley helps you organise what matters and build study tools around your real school life.</p><div className="hero-actions"><Link className="public-cta large" to="/signup">Create your account <ArrowRight /></Link><a className="public-secondary" href="#how">Explore Studentley <ArrowDown /></a></div><div className="hero-proof"><span><Check /> Your own material</span><span><Check /> Your own schedule</span><span><Check /> No invented progress</span></div></div><ProductPreview /></div></section>

    <section className="student-first"><div className="public-container student-grid"><div><span className="section-kicker">Built for students</span><h2>Most platforms start with the system. We start with you.</h2><p>Two students in the same class can need completely different support. Studentley is designed to understand that context before it tries to help.</p></div><div className="fact-stack">{studentFacts.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div></section>

    <section className="how-section" id="how"><div className="public-container"><div className="section-heading-public"><span className="section-kicker">How it works</span><h2>From scattered schoolwork to a system that makes sense.</h2></div><div className="workflow"><WorkflowStep number="01" icon={UploadCloud} title="Upload your material" text="Notes, PDFs, slides, worksheets, textbook pages, timetables and exam schedules." /><span className="flow-line" /><WorkflowStep number="02" icon={Layers3} title="Organise your school life" text="Connect material with subjects, exams, tasks and the time you actually have." /><span className="flow-line" /><WorkflowStep number="03" icon={Brain} title="Build study tools" text="Secure AI will create quizzes, summaries, flashcards and mock exams when enabled." /><span className="flow-line" /><WorkflowStep number="04" icon={Target} title="Focus where it matters" text="Use real activity and results to find priorities and improve your next session." /></div><p className="ai-honesty"><Sparkles /> AI-powered generation remains clearly unavailable until the secure server integration is enabled. Studentley never fakes a result.</p></div></section>

    <section className="feature-section" id="features"><div className="public-container"><div className="section-heading-public split"><div><span className="section-kicker">The Studentley workspace</span><h2>Every part of studying, connected.</h2></div><p>Not another generic course catalogue. Your files, deadlines, plan and practice live in the same student-first context.</p></div><div className="feature-showcase">{features.map(([Icon, title, text, tone], index) => <article className={`feature-story ${tone} ${index < 2 ? 'wide' : ''}`} key={title}><span><Icon /></span><small>{String(index + 1).padStart(2, '0')}</small><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section className="context-section"><div className="public-container context-grid"><div className="context-visual"><div className="context-orbit"><span><FileText /></span><span><GraduationCap /></span><span><Clock3 /></span><strong>You</strong></div></div><div><span className="section-kicker">Context changes everything</span><h2>Your study platform should know what this week looks like.</h2><p>One teacher shares slides. Another expects textbook revision. One exam needs practice questions; another needs vocabulary recall. Fixed learning paths cannot reflect all of that.</p><p>Studentley is built to use the material, schedule and priorities you bring—without inventing statistics or pretending every student learns the same way.</p></div></div></section>

    <section className="public-final"><div className="public-container final-panel"><span className="section-kicker">Your system, your way</span><h2>Studying should work around your life.</h2><p>Start with the schoolwork you already have. Build a clearer way forward from there.</p><div><Link className="public-cta large" to="/signup">Create your account <ArrowRight /></Link><Link className="public-secondary" to="/plans">Compare plans</Link></div></div></section>
  </main></PublicLayout>
}

function WorkflowStep({ number, icon: Icon, title, text }) { return <article className="workflow-step"><small>{number}</small><span><Icon /></span><h3>{title}</h3><p>{text}</p></article> }

function ProductPreview() {
  return <div className="product-preview" aria-label="Preview of the Studentley dashboard"><div className="preview-chrome"><i /><i /><i /><span>app.studently.com</span></div><div className="preview-shell"><aside><div className="preview-logo">S</div>{[0,1,2,3].map(item => <i className={item === 0 ? 'active' : ''} key={item} />)}</aside><div className="preview-main"><header><span>Good morning, Paul</span><i /></header><div className="preview-metrics"><article><small>Today’s tasks</small><b>3</b></article><article><small>Study progress</small><b>68%</b></article><article><small>Streak</small><b>5 days</b></article></div><div className="preview-panels"><article><h3>Today’s schedule</h3><p><i className="dot blue" /> Mathematics <span>08:00</span></p><p><i className="dot green" /> English <span>10:00</span></p><p><i className="dot orange" /> Physics <span>13:30</span></p></article><article><h3>Upcoming exams</h3><p><b>25</b> Mathematics <span>3 days</span></p><p><b>02</b> English <span>10 days</span></p><p><b>08</b> Physics <span>16 days</span></p></article></div></div></div></div>
}
