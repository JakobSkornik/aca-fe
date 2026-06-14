import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

/** Reads/writes the `data-theme` attribute applied by _document's init script. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    setTheme(current === 'light' ? 'light' : 'dark')
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem('aca_theme', next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
