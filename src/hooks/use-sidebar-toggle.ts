import * as React from "react"

// Breakpoints for sidebar behavior
const LARGE_DESKTOP_BREAKPOINT = 1280 // xl breakpoint in Tailwind

export function useSidebarToggle() {
  const [shouldShowToggle, setShouldShowToggle] = React.useState<boolean>(true)

  React.useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth

      // Show toggle on mobile (< 768px) or when desktop width is insufficient (768px to 1279px)
      // Hide toggle on large desktop (>= 1280px) where sidebar should always be visible
      const showToggle = width < LARGE_DESKTOP_BREAKPOINT

      setShouldShowToggle(showToggle)
    }

    // Check on mount
    checkScreenSize()

    // Listen for resize events
    const mql = window.matchMedia(`(min-width: ${LARGE_DESKTOP_BREAKPOINT}px)`)
    const onChange = () => checkScreenSize()

    mql.addEventListener("change", onChange)
    window.addEventListener("resize", onChange)

    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener("resize", onChange)
    }
  }, [])

  return shouldShowToggle
}