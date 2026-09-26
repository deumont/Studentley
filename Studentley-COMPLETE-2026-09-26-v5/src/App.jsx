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
import ResetPassword from './pages/ResetPassword'
import AiTutor from './pages/AiTutor'
import Leaderboard from './pages/Leaderboard'
import { Loader } from './components/UI'

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
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/plans" element={<Plans />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />
      <Route path="/welcome" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/reset" element={<ResetPassword />} />
      <Route path="/auth/*" element={<Auth />} />
      <Route path="/legal/:document" element={<Legal />} />
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/app" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/study-plan" element={<StudyPlan />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/ai-tutor" element={<AiTutor />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {notice && <div className={`toast ${notice.type}`} role="status">{notice.type === 'error' ? '!' : '✓'} {notice.text}</div>}
  </>
}
