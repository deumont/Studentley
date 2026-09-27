import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
import Personalization from './pages/Personalization'
import { Loader } from './components/UI'
import GenerationStatus from './components/GenerationStatus'
import SeoManager from './components/SeoManager'
import RivalsLayout from './components/RivalsLayout'
import RivalsDashboard, { FriendRivals, RankedRivals, RivalMatch, RivalQuizLibrary } from './pages/Rivals'

function Protected({ children }) {
  const { configured, session, authLoading, profile } = useApp()
  const location = useLocation()
  if (authLoading) return <Loader full label="Loading Studentley…" />
  if (!configured || !session) return <Navigate to="/login" replace state={{ from: location }} />
  if (profile && !profile.onboarding_complete && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const { notice } = useApp()
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
      <Route path="/rivals" element={<Protected><RivalsLayout /></Protected>}>
        <Route index element={<RivalsDashboard />} />
        <Route path="ranked" element={<RankedRivals />} />
        <Route path="friends" element={<FriendRivals />} />
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
        <Route path="/personalization" element={<Personalization />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <GenerationStatus />
    {notice && <div className={`toast ${notice.type}`} role="status">{notice.type === 'error' ? '!' : '✓'} {notice.text}</div>}
  </>
}
