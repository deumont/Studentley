import React from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Layout from './components/Layout'
import Home from './pages/Home'
import Upload from './pages/Upload'
import StudyPlan from './pages/StudyPlan'
import Practice from './pages/Practice'
import Settings from './pages/Settings'
import Plans from './pages/Plans'
import Legal from './pages/Legal'
import Landing from './pages/Landing'
import Features from './pages/Features'
import ResetPassword from './pages/ResetPassword'
import PersonalAI from './pages/PersonalAI'
import Leaderboard from './pages/Leaderboard'
import { Loader } from './components/UI'
import GenerationStatus from './components/GenerationStatus'
import SeoManager from './components/SeoManager'
import RivalsLayout from './components/RivalsLayout'
import RivalsDashboard, { FriendRivals, RankedRivals, RivalMatch, RivalQuizLibrary } from './pages/Rivals'
import StudyPartyHome, { StudyPartyRoom } from './pages/StudyParty'
import ActiveQuizShowRejoin from './components/ActiveQuizShowRejoin'

function Protected({ children }) {
  const { configured, session, authLoading, profile, workspaceLoaded } = useApp()
  const location = useLocation()
  const path = location.pathname
  const skeletonVariant = path === '/app' ? 'dashboard' : path === '/upload' ? 'documents' : path === '/study-plan' ? 'planner' : path === '/practice' ? 'practice' : path === '/leaderboard' ? 'leaderboard' : path === '/settings' ? 'settings' : path === '/personal-ai' ? 'ai' : path === '/onboarding' ? 'onboarding' : path.startsWith('/quiz-show/') ? 'quiz-show' : path.startsWith('/rivals/ranked') ? 'ranked' : path.startsWith('/rivals/friends') ? 'friends' : path.startsWith('/rivals/party') ? 'party' : path.startsWith('/rivals/quizzes') ? 'library' : path.startsWith('/rivals/match') ? 'arena' : path.startsWith('/rivals') ? 'rivals' : 'generic'
  const standalone = skeletonVariant === 'quiz-show' || skeletonVariant === 'onboarding'
  if (authLoading || (session && !workspaceLoaded)) return <Loader full shell={!standalone} variant={skeletonVariant} label="Loading Studentley…" />
  if (!configured || !session) return <Navigate to="/login" replace state={{ from: location }} />
  const loginBypassesOnboarding = sessionStorage.getItem('studentley-login-bypass-onboarding') === session.user.id
  const onboardingRequired = !loginBypassesOnboarding && session.user?.user_metadata?.onboarding_required === true && profile?.onboarding_complete === false
  if (onboardingRequired && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  if (profile && location.pathname === '/onboarding' && !onboardingRequired) return <Navigate to="/app" replace />
  return children
}

function LegacyQuizShowRedirect() {
  const { id } = useParams()
  return <Navigate to={`/quiz-show/${id}`} replace />
}

export default function App() {
  const { notice, session } = useApp()
  const location = useLocation()
  const gameMode = location.pathname.startsWith('/quiz-show/')
  return <>
    <SeoManager />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/features" element={<Features />} />
      <Route path="/plans" element={<Plans />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />
      <Route path="/welcome" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/reset" element={<ResetPassword />} />
      <Route path="/auth/*" element={<Auth />} />
      <Route path="/legal/:document" element={<Legal />} />
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route path="/quiz-show/:id" element={<Protected><StudyPartyRoom /></Protected>} />
      <Route path="/rivals" element={<Protected><RivalsLayout /></Protected>}>
        <Route index element={<RivalsDashboard />} />
        <Route path="ranked" element={<RankedRivals />} />
        <Route path="friends" element={<FriendRivals />} />
        <Route path="party" element={<StudyPartyHome />} />
        <Route path="party/:id" element={<LegacyQuizShowRedirect />} />
        <Route path="quizzes" element={<RivalQuizLibrary />} />
        <Route path="match/:id" element={<RivalMatch />} />
      </Route>
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/app" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/study-plan" element={<StudyPlan />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/personal-ai" element={<PersonalAI />} />
        <Route path="/ai-tutor" element={<Navigate to="/personal-ai" replace />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/personalization" element={<Navigate to="/personal-ai" replace />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {!gameMode && <GenerationStatus />}
    {!gameMode && session && <ActiveQuizShowRejoin />}
    {!gameMode && notice && <div className={`toast ${notice.type}`} role="status">{notice.type === 'error' ? '!' : '✓'} {notice.text}</div>}
  </>
}
