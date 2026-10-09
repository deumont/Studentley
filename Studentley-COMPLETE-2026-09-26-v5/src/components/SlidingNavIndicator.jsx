import React, { useLayoutEffect, useState } from 'react'

export default function SlidingNavIndicator({ navRef, route, className }) {
  const [position, setPosition] = useState({ top: 0, height: 0, visible: false })

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined
    const update = () => {
      const active = nav.querySelector('a.active')
      setPosition(active
        ? { top: active.offsetTop, height: active.offsetHeight, visible: true }
        : { top: 0, height: 0, visible: false })
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(nav)
    window.addEventListener('resize', update)
    return () => { observer?.disconnect(); window.removeEventListener('resize', update) }
  }, [navRef, route])

  return <span
    aria-hidden="true"
    className={`${className} ${position.visible ? 'visible' : ''}`}
    style={{ height: `${position.height}px`, transform: `translate3d(0, ${position.top}px, 0)` }}
  />
}
