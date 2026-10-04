import React, { useEffect, useRef } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Check,
  CircleDot,
  Clock3,
  Crown,
  FileCheck2,
  FileText,
  Flame,
  GraduationCap,
  Mic,
  Radio,
  ScanLine,
  Sparkles,
  Swords,
  Target,
  Timer,
  Users,
  Volume2,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'

const signatureFeatures = [
  {
    number: '01',
    title: 'Proper exam generation',
    text: 'Full papers built for your subject, level and exam style — not another ten-question worksheet.',
    href: '#exam-generation',
    icon: FileCheck2,
  },
  {
    number: '02',
    title: 'Competitive studying',
    text: 'Ranked battles and friend challenges where everyone faces the exact same questions.',
    href: '#competitive-studying',
    icon: Swords,
  },
  {
    number: '03',
    title: 'AI-hosted Quiz Show',
    text: 'A live, voice-hosted game show with buzzers, streaks, comebacks and a final winner.',
    href: '#quiz-show',
    icon: Mic,
  },
]

export default function Landing() {
  const pageRef = useRef(null)

  useEffect(() => {
    const root = pageRef.current
    if (!root) return undefined

    document.body.classList.add('studentley-home-live')
    const items = [...root.querySelectorAll('[data-reveal]')]
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let observer

    if (!reducedMotion && 'IntersectionObserver' in window) {
      root.classList.add('scroll-reveal-ready')
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }), { threshold: 0.13, rootMargin: '0px 0px -55px' })
      items.forEach(item => observer.observe(item))
    } else {
      items.forEach(item => item.classList.add('is-visible'))
    }

    const moveLight = event => {
      root.style.setProperty('--home-pointer-x', `${(event.clientX / window.innerWidth) * 100}%`)
      root.style.setProperty('--home-pointer-y', `${(event.clientY / window.innerHeight) * 100}%`)
    }
    window.addEventListener('pointermove', moveLight, { passive: true })

    return () => {
      observer?.disconnect()
      window.removeEventListener('pointermove', moveLight)
      document.body.classList.remove('studentley-home-live')
      root.classList.remove('scroll-reveal-ready')
    }
  }, [])

  return <PublicLayout><main className="sl-home" ref={pageRef}>
    <section className="sl-hero">
      <div className="sl-contours" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="sl-hero-index" aria-hidden="true">STUDENTLEY / 2026</div>
      <div className="sl-hero-copy">
        <span className="sl-kicker"><Sparkles /> The study platform with a pulse</span>
        <h1>
          <span>THIS ISN&apos;T</span>
          <span>REVISION.</span>
          <span className="accent">IT&apos;S GAME TIME.</span>
        </h1>
        <p>Generate serious exam papers. Compete against students at your level. Turn a study session into a live AI-hosted Quiz Show.</p>
        <div className="sl-hero-actions">
          <Link className="sl-primary" to="/signup">Start playing free <ArrowRight /></Link>
          <a className="sl-text-link" href="#signature-features">Meet the three modes <ArrowDown /></a>
        </div>
      </div>

      <div className="sl-hero-stage" aria-label="Studentley's three signature study modes">
        <div className="sl-stage-orbit orbit-a" />
        <div className="sl-stage-orbit orbit-b" />
        <div className="sl-stage-beam" />
        <div className="sl-stage-core"><span>S</span><small>STUDENTLEY</small></div>
        <a href="#exam-generation" className="sl-stage-card exam"><span><FileCheck2 /></span><small>01</small><b>EXAM<br />LAB</b></a>
        <a href="#competitive-studying" className="sl-stage-card rivals"><span><Swords /></span><small>02</small><b>RIVALS<br />ARENA</b></a>
        <a href="#quiz-show" className="sl-stage-card show"><span><Mic /></span><small>03</small><b>QUIZ<br />SHOW</b></a>
      </div>

      <a className="sl-scroll-cue" href="#signature-features"><span>SCROLL TO ENTER</span><i><ArrowDown /></i></a>
    </section>

    <div className="sl-marquee" aria-hidden="true"><div>
      <span>REAL EXAM PAPERS <i>✦</i> RANKED STUDY BATTLES <i>✦</i> AI-HOSTED QUIZ SHOWS <i>✦</i> REAL EXAM PAPERS <i>✦</i> RANKED STUDY BATTLES <i>✦</i> AI-HOSTED QUIZ SHOWS <i>✦</i></span>
      <span>REAL EXAM PAPERS <i>✦</i> RANKED STUDY BATTLES <i>✦</i> AI-HOSTED QUIZ SHOWS <i>✦</i> REAL EXAM PAPERS <i>✦</i> RANKED STUDY BATTLES <i>✦</i> AI-HOSTED QUIZ SHOWS <i>✦</i></span>
    </div></div>

    <section className="sl-intro" id="signature-features">
      <div className="sl-wrap">
        <div className="sl-intro-heading" data-reveal="left">
          <span className="sl-kicker dark"><CircleDot /> Three signature experiences</span>
          <h2>Most study apps help you revise. <em>Studentley makes revision an event.</em></h2>
        </div>
        <p className="sl-intro-copy" data-reveal="right">One platform for focused solo practice, real competition and unforgettable group sessions. Every mode is built around what students actually need to learn.</p>
        <div className="sl-signature-grid">
          {signatureFeatures.map(({ number, title, text, href, icon: Icon }, index) => <a href={href} className="sl-signature-card" data-reveal key={title} style={{ '--delay': `${index * 90}ms` }}>
            <header><small>{number}</small><span><Icon /></span></header>
            <h3>{title}</h3>
            <p>{text}</p>
            <b>Explore mode <ArrowRight /></b>
          </a>)}
        </div>
      </div>
    </section>

    <section className="sl-feature sl-exam-section" id="exam-generation">
      <div className="sl-feature-number" aria-hidden="true">01</div>
      <div className="sl-wrap sl-feature-grid">
        <div className="sl-feature-copy" data-reveal="left">
          <span className="sl-kicker"><FileText /> Proper exam generation</span>
          <h2>Not a worksheet.<br /><em>A real paper.</em></h2>
          <p>Choose the subject, qualification, difficulty and focus. Studentley builds a proper multi-page exam with varied written questions, source material, diagrams, marks and space to work.</p>
          <ul>
            <li><Check /> Primary, GCSE, IGCSE, A Level, IB and Abitur styles</li>
            <li><Check /> Downloadable exam PDF with a matching mark scheme</li>
            <li><Check /> Upload your finished paper for AI marking and feedback</li>
          </ul>
          <Link className="sl-primary" to="/signup">Generate your first paper <ArrowRight /></Link>
        </div>
        <ExamPreview />
      </div>
      <div className="sl-feature-strip"><span>MULTI-PAGE PDF</span><span>VARIED QUESTIONS</span><span>MARK SCHEME</span><span>AI MARKING</span></div>
    </section>

    <section className="sl-feature sl-rivals-section" id="competitive-studying">
      <div className="sl-feature-number" aria-hidden="true">02</div>
      <div className="sl-wrap sl-feature-grid reverse">
        <RivalsArena />
        <div className="sl-feature-copy light" data-reveal="right">
          <span className="sl-kicker"><Swords /> Competitive studying</span>
          <h2>Same questions.<br /><em>Only one winner.</em></h2>
          <p>Pick a subject, find an opponent and go head-to-head under the same conditions. Accuracy wins. Speed breaks the tie. Your rank proves the rest.</p>
          <ul>
            <li><Check /> Ranked matchmaking from Bronze to Master</li>
            <li><Check /> Friend Battles built from shared study material</li>
            <li><Check /> Studently Points, streaks and live leaderboards</li>
          </ul>
          <Link className="sl-primary inverse" to="/signup">Enter the arena <ArrowRight /></Link>
        </div>
      </div>
      <div className="sl-rank-track" data-reveal>
        {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER'].map((rank, index) => <span key={rank} className={index === 3 ? 'active' : ''}><i />{rank}</span>)}
      </div>
    </section>

    <section className="sl-feature sl-show-section" id="quiz-show">
      <div className="sl-show-lights" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="sl-feature-number" aria-hidden="true">03</div>
      <div className="sl-wrap sl-show-heading" data-reveal>
        <span className="sl-kicker"><Radio /> AI-hosted Quiz Show</span>
        <h2>YOUR REVISION.<br /><em>THE MAIN EVENT.</em></h2>
        <p>Invite friends, switch on the host and let Studentley run the room with prime-time energy — questions, countdowns, buzzers, comebacks and all.</p>
      </div>
      <QuizShowPreview />
      <div className="sl-show-features sl-wrap" data-reveal>
        <article><Volume2 /><b>Live AI host</b><span>Questions read aloud with reactions between rounds.</span></article>
        <article><Zap /><b>Real virtual buzzer</b><span>Buzz first, answer first — or open the steal.</span></article>
        <article><Flame /><b>Game-changing rounds</b><span>Rapid Fire, the comeback wheel and Double or Nothing.</span></article>
        <article><Users /><b>Built for friends</b><span>Join instantly with a room code or invite link.</span></article>
      </div>
    </section>

    <section className="sl-three-modes">
      <div className="sl-wrap">
        <span className="sl-kicker dark" data-reveal><Target /> One platform. Three ways to win.</span>
        <div className="sl-three-heading" data-reveal>
          <h2>Study alone.<br />Battle one-on-one.<br />Host the whole room.</h2>
          <p>Your material and progress stay connected while the experience changes with what you need today.</p>
        </div>
        <div className="sl-mode-table" data-reveal>
          <div className="head"><span>MODE</span><span>BUILT FOR</span><span>THE MOMENT</span></div>
          <a href="#exam-generation"><b>01 / Exam Lab</b><span>Focused solo practice</span><em>“I need to know if I&apos;m ready.”</em><ArrowRight /></a>
          <a href="#competitive-studying"><b>02 / Rivals</b><span>Head-to-head competition</span><em>“Let&apos;s see who really knows it.”</em><ArrowRight /></a>
          <a href="#quiz-show"><b>03 / Quiz Show</b><span>Live group revision</span><em>“Make tonight&apos;s study session unforgettable.”</em><ArrowRight /></a>
        </div>
      </div>
    </section>

    <section className="sl-final-cta">
      <div className="sl-final-rings" aria-hidden="true"><i /><i /><i /></div>
      <div className="sl-final-inner" data-reveal="scale">
        <span><GraduationCap /></span>
        <small>READY WHEN YOU ARE</small>
        <h2>TURN REVISION<br />INTO GAME TIME.</h2>
        <p>Create your account and choose your first mode.</p>
        <div>
          <Link className="sl-primary white" to="/signup">Create a free account <ArrowRight /></Link>
          <Link className="sl-text-link white" to="/features">Explore every feature</Link>
        </div>
      </div>
    </section>
  </main></PublicLayout>
}

function ExamPreview() {
  return <div className="sl-exam-visual" data-reveal="right" aria-label="Preview of a generated Studentley exam paper">
    <div className="sl-exam-page page-back-two" />
    <div className="sl-exam-page page-back-one"><span>MARK SCHEME</span></div>
    <article className="sl-exam-page page-front">
      <header><div><small>STUDENTLEY EXAM LAB</small><b>Mathematics · IGCSE</b></div><span><ScanLine /></span></header>
      <div className="sl-exam-meta"><span>Paper 2</span><span>90 minutes</span><span>80 marks</span></div>
      <section><b>1</b><p>Solve the simultaneous equations.<br /><strong>Show all your working.</strong></p><em>[4]</em></section>
      <div className="sl-working-lines"><i /><i /><i /></div>
      <section><b>2</b><p>The graph shows the journey of a train. Calculate its average speed.</p><em>[5]</em></section>
      <div className="sl-mini-graph"><i /><span /><b /></div>
      <footer><small>Page 1 of 12</small><b>Turn over →</b></footer>
    </article>
    <div className="sl-exam-scan"><span><ScanLine /> Building question paper</span></div>
  </div>
}

function RivalsArena() {
  return <div className="sl-rivals-visual" data-reveal="left" aria-label="Preview of a Studentley Rivals match">
    <div className="sl-arena-grid" aria-hidden="true" />
    <header><span><i /> RANKED MATCH</span><b>ALGEBRA · GCSE</b><time><Clock3 /> 00:18</time></header>
    <div className="sl-versus">
      <article className="player-one"><span>MK</span><small>GOLD III</small><b>MAYA</b><strong>7</strong></article>
      <div><i>VS</i><small>QUESTION 8 / 10</small></div>
      <article className="player-two"><span>AR</span><small>GOLD II</small><b>ALEX</b><strong>6</strong></article>
    </div>
    <div className="sl-battle-question">
      <small>FIRST CORRECT ANSWER WINS THE ROUND</small>
      <h3>Factorise&nbsp; 6x² + 13x + 6</h3>
      <div><span>A&nbsp; (3x + 2)(2x + 3)</span><span>B&nbsp; (6x + 1)(x + 6)</span></div>
    </div>
    <footer><span><Zap /> +120 SP</span><b>ACCURACY FIRST · SPEED SECOND</b></footer>
  </div>
}

function QuizShowPreview() {
  return <div className="sl-show-stage sl-wrap" data-reveal="scale" aria-label="Preview of the Studentley Quiz Show">
    <div className="sl-show-status"><span><i /> LIVE</span><b><Mic /> STUDENTLEY AI HOST</b><time><Timer /> 12</time></div>
    <div className="sl-question-value"><span>QUESTION 09</span><b>500 POINTS</b></div>
    <h3>Which process allows plants to convert light energy into chemical energy?</h3>
    <div className="sl-show-options">
      <button><b>A</b><span>Respiration</span></button>
      <button><b>B</b><span>Photosynthesis</span></button>
      <button><b>C</b><span>Transpiration</span></button>
      <button><b>D</b><span>Fermentation</span></button>
    </div>
    <div className="sl-final-answer"><span><Radio /></span><p><small>THE HOST IS LISTENING</small><b>“Is that your final answer?”</b></p><i /></div>
    <aside className="sl-prize-ladder">
      {[1000, 800, 650, 500, 350, 250, 150].map(points => <span className={points === 500 ? 'active' : ''} key={points}><small>{points === 1000 ? <Crown /> : '•'}</small><b>{points.toLocaleString()} SP</b></span>)}
    </aside>
  </div>
}
