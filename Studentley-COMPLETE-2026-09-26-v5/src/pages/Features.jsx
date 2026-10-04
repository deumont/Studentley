import React, { useRef } from 'react'
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  FileCheck2,
  FileQuestion,
  FileText,
  GraduationCap,
  Library,
  Mic,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UploadCloud,
  Users,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import usePublicPageMotion from '../lib/usePublicPageMotion'

const connectedFeatures = [
  [UploadCloud, 'Your material', 'Upload notes, worksheets, presentations, textbook pages and images. Everything generated stays connected to its source.', 'blue'],
  [CalendarDays, 'Study planning', 'Build a plan around subjects, exams, deadlines and the time that actually exists in your week.', 'cyan'],
  [Brain, 'Visual guides', 'Turn a difficult topic into a clear illustrated explanation with examples, diagrams and review prompts.', 'violet'],
  [BookOpen, 'Flashcards', 'Transform selected material into focused recall cards you can return to whenever you need them.', 'blue'],
  [FileText, 'Saved analysis', 'Keep summaries and document analysis directly under the material that produced them.', 'cyan'],
  [BarChart3, 'Real progress', 'Track completed sessions, scores, streaks and Studently Points across the work you actually do.', 'violet'],
]

const signatureModes = [
  {
    number: '01',
    icon: FileCheck2,
    title: 'Exam Lab',
    headline: 'Practice on a paper that feels real.',
    text: 'Generate multi-page exams for your subject, grade and qualification. Download the paper and mark scheme, then upload your completed work for AI feedback.',
    bullets: ['Written and varied question formats', 'Diagrams, sources and working space', 'AI marking after completion'],
    className: 'exam',
  },
  {
    number: '02',
    icon: Swords,
    title: 'Rivals',
    headline: 'Turn knowledge into a competition.',
    text: 'Face students at your level under identical conditions, challenge friends on shared material and climb from Bronze to Master.',
    bullets: ['Accuracy-first ranked battles', 'Friend rooms and shared quizzes', 'SP, ranks and live leaderboards'],
    className: 'rivals',
  },
  {
    number: '03',
    icon: Mic,
    title: 'Quiz Show',
    headline: 'Make the whole room want to play.',
    text: 'An AI host runs the session with spoken questions, dramatic countdowns, buzzers, streaks, comeback moments and a final winner.',
    bullets: ['Live AI voice host', 'Multiple rounds and virtual buzzer', 'Room code for up to eight players'],
    className: 'show',
  },
]

export default function Features() {
  const pageRef = useRef(null)
  usePublicPageMotion(pageRef, 'studentley-features-page')

  return <PublicLayout><main className="editorial-page features-editorial" ref={pageRef}>
    <section className="editorial-hero features-editorial-hero">
      <div className="editorial-contours" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="editorial-hero-copy">
        <span className="sl-kicker"><Sparkles /> The complete Studentley system</span>
        <h1><span>TOOLS THAT</span><span>DON&apos;T JUST</span><span className="outline">SIT THERE.</span></h1>
        <p>Studentley turns your material into action: serious practice, real competition and live study experiences people actually want to join.</p>
        <div>
          <Link className="sl-primary" to="/signup">Start with your material <ArrowRight /></Link>
          <a className="sl-text-link" href="#signature-modes">See every mode <ArrowDown /></a>
        </div>
      </div>
      <FeatureSystemPreview />
    </section>

    <div className="editorial-page-marquee" aria-hidden="true"><div><span>EXAM LAB <i>✦</i> RIVALS <i>✦</i> QUIZ SHOW <i>✦</i> VISUAL GUIDES <i>✦</i> STUDY PLANS <i>✦</i> EXAM LAB <i>✦</i> RIVALS <i>✦</i> QUIZ SHOW <i>✦</i> VISUAL GUIDES <i>✦</i> STUDY PLANS <i>✦</i></span><span>EXAM LAB <i>✦</i> RIVALS <i>✦</i> QUIZ SHOW <i>✦</i> VISUAL GUIDES <i>✦</i> STUDY PLANS <i>✦</i> EXAM LAB <i>✦</i> RIVALS <i>✦</i> QUIZ SHOW <i>✦</i> VISUAL GUIDES <i>✦</i> STUDY PLANS <i>✦</i></span></div></div>

    <section className="signature-modes-section" id="signature-modes">
      <div className="editorial-wrap">
        <header className="editorial-section-heading" data-reveal>
          <span className="sl-kicker dark"><Target /> Three signature modes</span>
          <h2>Choose the way you want to learn today.</h2>
          <p>Focused practice, one-on-one competition or a full-room event. The content stays relevant because it starts with your subject and level.</p>
        </header>
        <div className="signature-mode-list">
          {signatureModes.map((mode, index) => <article className={`signature-mode-row ${mode.className}`} data-reveal={index % 2 ? 'right' : 'left'} key={mode.title}>
            <div className="signature-mode-index"><small>{mode.number}</small><span><mode.icon /></span></div>
            <div className="signature-mode-copy"><em>{mode.title}</em><h3>{mode.headline}</h3><p>{mode.text}</p><ul>{mode.bullets.map(item => <li key={item}><Check />{item}</li>)}</ul></div>
            <ModeVisual type={mode.className} />
          </article>)}
        </div>
      </div>
    </section>

    <section className="connected-workspace-section">
      <div className="editorial-wrap">
        <header className="editorial-section-heading split" data-reveal>
          <div><span className="sl-kicker dark"><Library /> One connected workspace</span><h2>The useful things are connected too.</h2></div>
          <p>Documents, plans, explanations and progress should support the headline experiences—not live in six unrelated tools.</p>
        </header>
        <div className="connected-feature-grid">
          {connectedFeatures.map(([Icon, title, text, tone], index) => <article className={tone} data-reveal key={title} style={{ '--feature-delay': `${(index % 3) * 80}ms` }}><header><span><Icon /></span><small>{String(index + 4).padStart(2, '0')}</small></header><h3>{title}</h3><p>{text}</p><i><ArrowRight /></i></article>)}
        </div>
      </div>
    </section>

    <section className="feature-flow-section">
      <div className="editorial-wrap feature-flow-grid">
        <div className="feature-flow-copy" data-reveal="left"><span className="sl-kicker"><Zap /> From upload to momentum</span><h2>One source.<br /><em>Every next move.</em></h2><p>Start with the thing you need to learn. Studentley keeps the context connected while you move from understanding to practice to competition.</p><Link className="sl-primary inverse" to="/signup">Build your workspace <ArrowRight /></Link></div>
        <div className="feature-flow-steps" data-reveal="right">
          <article><small>01</small><span><UploadCloud /></span><div><b>Bring the material</b><p>Notes, PDFs, slides, images or a topic.</p></div></article>
          <article><small>02</small><span><Brain /></span><div><b>Understand it</b><p>Analyse, summarise or generate a visual guide.</p></div></article>
          <article><small>03</small><span><FileQuestion /></span><div><b>Practise it</b><p>Use flashcards, quizzes or a complete exam paper.</p></div></article>
          <article><small>04</small><span><Trophy /></span><div><b>Prove it</b><p>Enter Rivals or host a Quiz Show with friends.</p></div></article>
        </div>
      </div>
    </section>

    <section className="editorial-final">
      <div className="editorial-final-rings" aria-hidden="true"><i /><i /><i /></div>
      <div data-reveal="scale"><span><GraduationCap /></span><small>ONE PLATFORM. YOUR NEXT MOVE.</small><h2>OPEN STUDENTLEY.<br />START SOMEWHERE REAL.</h2><p>Bring the exam, document or topic already on your mind.</p><div><Link className="sl-primary white" to="/signup">Create your account <ArrowRight /></Link><Link className="sl-text-link white" to="/plans">Compare plans</Link></div></div>
    </section>
  </main></PublicLayout>
}

function FeatureSystemPreview() {
  return <div className="feature-system-preview" aria-label="Studentley's connected feature system">
    <div className="feature-system-orbit orbit-one" /><div className="feature-system-orbit orbit-two" />
    <div className="feature-system-core"><Sparkles /><b>YOUR<br />MATERIAL</b><small>CONNECTED</small></div>
    <article className="exam"><FileCheck2 /><span><small>GENERATE</small><b>EXAM PAPER</b></span></article>
    <article className="rivals"><Swords /><span><small>COMPETE</small><b>RIVALS</b></span></article>
    <article className="show"><Mic /><span><small>HOST</small><b>QUIZ SHOW</b></span></article>
    <article className="plan"><CalendarDays /><span><small>ORGANISE</small><b>STUDY PLAN</b></span></article>
  </div>
}

function ModeVisual({ type }) {
  if (type === 'exam') return <div className="mode-visual exam-paper"><div><small>MATHEMATICS · IGCSE</small><b>Paper 2</b><span>1&nbsp;&nbsp; Solve 2x + y = 11</span><i /><i /><span>2&nbsp;&nbsp; Study the graph below.</span><em /></div><strong>12 pages</strong></div>
  if (type === 'rivals') return <div className="mode-visual rivals-battle"><header><i /> LIVE MATCH</header><div><span>MK<small>7</small></span><b>VS</b><span>AR<small>6</small></span></div><footer><Zap /> Accuracy first. Speed second.</footer></div>
  return <div className="mode-visual quiz-stage"><header><Mic /> AI HOST LIVE</header><h4>FINAL ANSWER?</h4><div><span>A</span><span>B</span><span>C</span><span>D</span></div><footer><Users /> 6 players connected</footer></div>
}
