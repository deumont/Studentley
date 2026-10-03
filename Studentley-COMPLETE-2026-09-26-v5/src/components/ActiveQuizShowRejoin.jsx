import React, { useEffect, useState } from 'react'
import { ArrowRight, PartyPopper } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { openQuizShowTab, readActiveQuizShow, subscribeActiveQuizShow } from '../lib/activeQuizShow'

export default function ActiveQuizShowRejoin() {
  const location = useLocation()
  const [active, setActive] = useState(readActiveQuizShow)
  useEffect(() => subscribeActiveQuizShow(setActive), [])
  if (!active || location.pathname.startsWith('/quiz-show/')) return null
  return <button className="active-quiz-rejoin" onClick={() => openQuizShowTab(active.id)}><span><PartyPopper /></span><div><small>Live game still running</small><b>Rejoin {active.title}</b>{active.roomCode && <em>Room {active.roomCode}</em>}</div><ArrowRight /></button>
}
