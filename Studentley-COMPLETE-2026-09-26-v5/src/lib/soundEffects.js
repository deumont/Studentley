const SOUND_SETTING_KEY = 'studentley-sound-effects'
const SOUND_SETTING_EVENT = 'studentley-sound-setting'

let audioContext = null
let hasInteracted = false
let lastPlayedAt = 0
let removeGlobalListeners = null

function getContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

export function soundEffectsEnabled() {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(SOUND_SETTING_KEY) !== 'off'
}

export function setSoundEffectsEnabled(enabled) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SOUND_SETTING_KEY, enabled ? 'on' : 'off')
  window.dispatchEvent(new CustomEvent(SOUND_SETTING_EVENT, { detail: { enabled } }))
}

export function subscribeSoundSetting(listener) {
  if (typeof window === 'undefined') return () => {}
  const handle = event => listener(Boolean(event.detail?.enabled))
  window.addEventListener(SOUND_SETTING_EVENT, handle)
  return () => window.removeEventListener(SOUND_SETTING_EVENT, handle)
}

function tone(context, { frequency, endFrequency = frequency, delay = 0, duration = 0.055, volume = 0.018, wave = 'sine' }) {
  const start = context.currentTime + delay
  const comfortVolume = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? volume * 0.65 : volume
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = wave
  oscillator.frequency.setValueAtTime(frequency, start)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(comfortVolume, start + Math.min(0.012, duration / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.01)
}

const cues = {
  tap: context => tone(context, { frequency: 410, endFrequency: 485, duration: 0.038, volume: 0.011 }),
  select: context => tone(context, { frequency: 390, endFrequency: 570, duration: 0.055, volume: 0.014 }),
  navigate: context => {
    tone(context, { frequency: 350, endFrequency: 460, duration: 0.065, volume: 0.012 })
    tone(context, { frequency: 540, endFrequency: 690, delay: 0.035, duration: 0.075, volume: 0.011 })
  },
  open: context => {
    tone(context, { frequency: 440, endFrequency: 540, duration: 0.08, volume: 0.012 })
    tone(context, { frequency: 610, endFrequency: 720, delay: 0.035, duration: 0.09, volume: 0.01 })
  },
  close: context => tone(context, { frequency: 520, endFrequency: 330, duration: 0.07, volume: 0.013 }),
  action: context => {
    tone(context, { frequency: 310, endFrequency: 520, duration: 0.07, volume: 0.016 })
    tone(context, { frequency: 620, endFrequency: 760, delay: 0.045, duration: 0.085, volume: 0.012 })
  },
  success: context => {
    tone(context, { frequency: 510, duration: 0.08, volume: 0.015 })
    tone(context, { frequency: 650, delay: 0.055, duration: 0.09, volume: 0.014 })
    tone(context, { frequency: 820, delay: 0.11, duration: 0.12, volume: 0.012 })
  },
  error: context => {
    tone(context, { frequency: 265, endFrequency: 220, duration: 0.09, volume: 0.017, wave: 'triangle' })
    tone(context, { frequency: 205, endFrequency: 170, delay: 0.07, duration: 0.12, volume: 0.014, wave: 'triangle' })
  },
  caution: context => tone(context, { frequency: 330, endFrequency: 245, duration: 0.1, volume: 0.015, wave: 'triangle' }),
  buzzer: context => {
    tone(context, { frequency: 145, endFrequency: 115, duration: 0.12, volume: 0.027, wave: 'triangle' })
    tone(context, { frequency: 430, endFrequency: 610, delay: 0.025, duration: 0.1, volume: 0.019, wave: 'square' })
  },
}

export function playSound(name = 'tap', { force = false } = {}) {
  if (!soundEffectsEnabled() || (!hasInteracted && !force) || typeof document === 'undefined' || document.visibilityState === 'hidden') return
  const now = performance.now()
  if (!force && now - lastPlayedAt < 42) return
  lastPlayedAt = now
  const context = getContext()
  if (!context) return
  const cue = cues[name] || cues.tap
  try { cue(context) } catch { /* Audio feedback should never interrupt the interface. */ }
}

function classifyControl(control) {
  const sound = control.closest('[data-sound]')?.dataset.sound
  if (sound) return sound
  if (control.matches('.study-party-buzzer, [aria-label*="buzzer" i]')) return 'buzzer'
  if (control.matches('.modal-close, .close-nav, [aria-label^="close" i]')) return 'close'
  if (control.matches('.danger, .subject-delete, .delete-button, [aria-label*="delete" i], [aria-label*="forfeit" i], [aria-label*="quit" i]')) return 'caution'
  if (control.matches('a, [role="tab"], nav a, .tabs button, .theme-options button, [role="switch"], select')) return 'select'
  if (control.matches('.primary, .violet, .rivals-primary, .home-primary-action, [type="submit"]')) return 'action'
  return 'tap'
}

export function installGlobalSoundEffects() {
  if (typeof document === 'undefined') return () => {}
  if (removeGlobalListeners) return removeGlobalListeners

  const handlePointer = event => {
    hasInteracted = true
    const target = event.target instanceof Element ? event.target : null
    const control = target?.closest('button, a, select, [role="button"], [role="tab"], [role="switch"], input[type="checkbox"], input[type="radio"]')
    if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest('[data-sound="none"]')) return
    playSound(classifyControl(control))
  }
  const handleKeyboard = event => {
    hasInteracted = true
    if (!['Enter', ' '].includes(event.key)) return
    const target = event.target instanceof Element ? event.target : null
    const control = target?.closest('button, a, select, [role="button"], [role="tab"], [role="switch"]')
    if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest('[data-sound="none"]')) return
    playSound(classifyControl(control))
  }

  document.addEventListener('pointerdown', handlePointer, true)
  document.addEventListener('keydown', handleKeyboard, true)
  removeGlobalListeners = () => {
    document.removeEventListener('pointerdown', handlePointer, true)
    document.removeEventListener('keydown', handleKeyboard, true)
    removeGlobalListeners = null
  }
  return removeGlobalListeners
}
