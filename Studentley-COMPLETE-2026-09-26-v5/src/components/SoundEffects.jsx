import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { installGlobalSoundEffects, playSound } from '../lib/soundEffects'

export default function SoundEffects() {
  const location = useLocation()
  const { notice } = useApp()
  const previousPath = useRef(location.pathname)
  const previousNotice = useRef(null)

  useEffect(() => installGlobalSoundEffects(), [])

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname
      playSound('navigate')
    }
  }, [location.pathname])

  useEffect(() => {
    if (!notice || notice === previousNotice.current) return
    previousNotice.current = notice
    playSound(notice.type === 'error' ? 'error' : 'success')
  }, [notice])

  return null
}
