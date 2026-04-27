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

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={theme === 'dark'}
      className="theme-toggle fixed bottom-4 right-4 z-[80] flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-foreground shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 sm:bottom-5 sm:right-5"
    >
      <span className="sr-only">{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
      {theme === 'dark' ? (
        <svg className="h-5 w-5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.25-9h-2.25M6 12H3.75m13.72-5.47-1.59 1.59M8.12 15.88l-1.59 1.59m10.94 0-1.59-1.59M8.12 8.12 6.53 6.53M12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5z" />
        </svg>
      ) : (
        <svg className="h-5 w-5 text-gold-dark dark:text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 15.25A8.25 8.25 0 0 1 8.75 2.25 6.75 6.75 0 1 0 21.75 15.25z" />
        </svg>
      )}
    </button>
  )
}