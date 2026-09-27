import React, { useEffect, useState } from 'react'
import { Check, LoaderCircle, XCircle } from 'lucide-react'
import { subscribeAIActivity } from '../services/ai'

export default function GenerationStatus() {
  const [activities, setActivities] = useState([])
  const [, setTick] = useState(0)

  useEffect(() => subscribeAIActivity(setActivities), [])
  useEffect(() => {
    if (!activities.some(item => item.status === 'running')) return undefined
    const timer = setInterval(() => setTick(value => value + 1), 1000)
    return () => clearInterval(timer)
  }, [activities])

  if (!activities.length) return null
  return <aside className="generation-stack" aria-live="polite" aria-label="AI generation progress">
    {activities.slice(0, 3).map(activity => {
      const seconds = Math.max(0, Math.floor(((activity.finishedAt || Date.now()) - activity.startedAt) / 1000))
      return <div className={`generation-popup ${activity.status}`} key={activity.id}>
        <span className="generation-status-icon">{activity.status === 'running' ? <LoaderCircle className="spin" /> : activity.status === 'complete' ? <Check /> : <XCircle />}</span>
        <span><b>{activity.status === 'running' ? activity.label : activity.status === 'complete' ? `${activity.label} complete` : `${activity.label} failed`}</b><small>{activity.status === 'running' ? `${seconds}s · You can keep using Studentley.` : activity.status === 'complete' ? `Finished in ${seconds}s.` : activity.message}</small></span>
      </div>
    })}
  </aside>
}
