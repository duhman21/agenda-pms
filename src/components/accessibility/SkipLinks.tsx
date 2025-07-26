'use client'

import { useAccessibility } from './AccessibilityProvider'

interface SkipLink {
  href: string
  label: string
}

interface SkipLinksProps {
  links?: SkipLink[]
}

const defaultLinks: SkipLink[] = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#footer', label: 'Skip to footer' }
]

export function SkipLinks({ links = defaultLinks }: SkipLinksProps) {
  const { announceToScreenReader } = useAccessibility()

  const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>, label: string) => {
    e.preventDefault()
    const href = e.currentTarget.getAttribute('href')
    if (href) {
      const targetId = href.substring(1) // Remove the #
      const target = document.getElementById(targetId)
      if (target) {
        target.focus()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        announceToScreenReader(`Skipped to ${label}`)
      }
    }
  }

  return (
    <div className="skip-links">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="skip-link"
          onClick={(e) => handleSkipClick(e, link.label)}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

// CSS for skip links (will be added to globals.css)
export const skipLinkStyles = `
.skip-links {
  position: absolute;
  top: -100px;
  left: 0;
  z-index: 9999;
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 8px;
  background: #000;
  color: #fff;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  transition: top 0.2s ease-in-out;
}

.skip-link:focus {
  top: 8px;
}

.skip-link:hover,
.skip-link:focus {
  background: #333;
  outline: 2px solid #fff;
  outline-offset: 2px;
}
`