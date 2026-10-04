import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const siteUrl = 'https://www.studentley.com'
const defaultSeo = {
  title: 'Studentley — AI Study Planner, Exam Practice & Rivals',
  description: 'Studentley combines AI study tools with Rivals: upload notes, build study plans, create exam practice, and compete or study with friends.',
}

const pages = {
  '/': defaultSeo,
  '/features': {
    title: 'Studentley Features — AI Study Plans, Practice & Mock Exams',
    description: 'Explore Studentley features for document-based study plans, visual explanations, quizzes, flashcards, realistic mock exams and study progress.',
  },
  '/plans': {
    title: 'Studentley Plans — Free, Plus & Pro',
    description: 'Compare Studentley Free, Plus and Pro plans for document uploads, AI study plans, practice tools and mock exams.',
  },
  '/legal/privacy': {
    title: 'Privacy Policy — Studentley',
    description: 'Learn how Studentley handles account, study, document, AI and subscription data under the GDPR.',
  },
  '/legal/terms': {
    title: 'Terms & Conditions — Studentley',
    description: 'Read the terms that apply when you create an account, study with Studentley or purchase a subscription.',
  },
  '/legal/imprint': {
    title: 'Legal Notice — Studentley',
    description: 'Provider and contact information for Studentley in Germany.',
  },
}

function setMeta(selector, attribute, value) {
  const element = document.head.querySelector(selector)
  if (element) element.setAttribute(attribute, value)
}

export default function SeoManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const seo = pages[pathname]
    const indexable = Boolean(seo)
    const current = seo || defaultSeo
    const canonical = `${siteUrl}${indexable ? pathname : '/'}`

    document.title = current.title
    setMeta('meta[name="description"]', 'content', current.description)
    setMeta('meta[name="robots"]', 'content', indexable ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,nofollow')
    setMeta('meta[property="og:title"]', 'content', current.title)
    setMeta('meta[property="og:description"]', 'content', current.description)
    setMeta('meta[property="og:url"]', 'content', canonical)
    setMeta('meta[name="twitter:title"]', 'content', current.title)
    setMeta('meta[name="twitter:description"]', 'content', current.description)
    setMeta('link[rel="canonical"]', 'href', canonical)
  }, [pathname])

  return null
}
