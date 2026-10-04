import { useEffect } from 'react'

export default function usePublicPageMotion(pageRef, pageClass) {
  useEffect(() => {
    const root = pageRef.current
    if (!root) return undefined

    document.body.classList.add('studentley-editorial-public', pageClass)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const items = [...root.querySelectorAll('[data-reveal]')]
    let observer

    if (!reducedMotion && 'IntersectionObserver' in window) {
      root.classList.add('scroll-reveal-ready')
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        entry.target.classList.toggle('is-visible', entry.isIntersecting)
      }), { threshold: 0.1, rootMargin: '-5% 0px -8% 0px' })
      items.forEach(item => observer.observe(item))
    } else {
      items.forEach(item => item.classList.add('is-visible'))
    }

    let lastScrollY = window.scrollY
    let scrollFrame
    const updateNavigation = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY
      document.body.classList.toggle('home-nav-scrolled', currentScrollY > 24)
      document.body.classList.toggle('home-scroll-down', scrollingDown && currentScrollY > 24)
      document.body.classList.toggle('home-scroll-up', !scrollingDown && currentScrollY > 24)
      if (currentScrollY <= 24) document.body.classList.remove('home-nav-hidden')
      else if (scrollingDown && currentScrollY > 110) document.body.classList.add('home-nav-hidden')
      else document.body.classList.remove('home-nav-hidden')
      lastScrollY = currentScrollY
      scrollFrame = undefined
    }
    const handleScroll = () => {
      if (scrollFrame) return
      scrollFrame = window.requestAnimationFrame(updateNavigation)
    }
    const moveLight = event => {
      root.style.setProperty('--page-pointer-x', `${(event.clientX / window.innerWidth) * 100}%`)
      root.style.setProperty('--page-pointer-y', `${(event.clientY / window.innerHeight) * 100}%`)
    }

    updateNavigation()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('pointermove', moveLight, { passive: true })

    return () => {
      observer?.disconnect()
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('pointermove', moveLight)
      document.body.classList.remove('studentley-editorial-public', pageClass, 'home-nav-hidden', 'home-nav-scrolled', 'home-scroll-down', 'home-scroll-up')
      root.classList.remove('scroll-reveal-ready')
    }
  }, [pageClass, pageRef])
}
