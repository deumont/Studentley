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
import { Loader } from './components/UI'

function Protected({ children }) {
  const { configured, session, authLoading, profile } = useApp()
  const location = useLocation()
  if (authLoading) return <Loader full label="Loading iStudent…" />
  if (!configured || !session) return <Navigate to="/welcome" replace state={{ from: location }} />
  if (profile && !profile.onboarding_complete && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const { notice } = useApp()
  return <>
    <Routes>
      <Route path="/welcome" element={<Auth />} />
      <Route path="/auth/*" element={<Auth />} />
      <Route path="/legal/:document" element={<Legal />} />
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/study-plan" element={<StudyPlan />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/plans" element={<Plans />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {notice && <div className={`toast ${notice.type}`} role="status">{notice.type === 'error' ? '!' : '✓'} {notice.text}</div>}
  </>
}
