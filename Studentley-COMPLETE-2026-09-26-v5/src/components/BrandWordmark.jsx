import React from 'react'

export default function BrandWordmark({ variant = 'theme', className = '' }) {
  return <span className={`studentley-wordmark ${variant} ${className}`.trim()} role="img" aria-label="Studentley">
    <img className="wordmark-base" src="/studentley-wordmark.png" alt="" />
    <img className="wordmark-blue" src="/studentley-wordmark.png" alt="" aria-hidden="true" />
  </span>
}
