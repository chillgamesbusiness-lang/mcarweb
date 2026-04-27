'use client'

import { useEffect, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

let currentTheme: Theme = 'light'
const listeners = new Set<() => void>()

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.style.colorScheme = theme
}

function readPreferredTheme(): Theme {
  const storedTheme = window.localStorage.getItem('mcar-theme') as Theme | null
  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : getSystemTheme()
}

function updateTheme(theme: Theme, persist = false) {
  currentTheme = theme
  applyTheme(theme)
  if (persist) window.localStorage.setItem('mcar-theme', theme)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return currentTheme
}

function getServerSnapshot() {
  return 'light' as Theme
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    updateTheme(readPreferredTheme())

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (!window.localStorage.getItem('mcar-theme')) updateTheme(getSystemTheme())
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    updateTheme(nextTheme, true)
  }

  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className="theme-toggle fixed bottom-4 right-4 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-gold shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold hover:text-gold focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 sm:bottom-5 sm:right-5"
    >
      <span className="sr-only">{label}</span>
      {isDark ? (
        // Sun (solid) — currently dark, click to go light
        <svg
          className="h-[22px] w-[22px]"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.25" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2.5" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="21.5" />
            <line x1="2.5" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="21.5" y2="12" />
            <line x1="5.1" y1="5.1" x2="6.9" y2="6.9" />
            <line x1="17.1" y1="17.1" x2="18.9" y2="18.9" />
            <line x1="5.1" y1="18.9" x2="6.9" y2="17.1" />
            <line x1="17.1" y1="6.9" x2="18.9" y2="5.1" />
          </g>
        </svg>
      ) : (
        // Moon (solid crescent) — currently light, click to go dark
        <svg
          className="h-[22px] w-[22px]"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M21 13.4A8.6 8.6 0 1 1 10.6 3a7 7 0 0 0 10.4 10.4z" />
        </svg>
      )}
    </button>
  )
}