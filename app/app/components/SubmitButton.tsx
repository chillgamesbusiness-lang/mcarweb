'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  children: React.ReactNode
  /** Text shown while the form is pending. Defaults to children with a spinner. */
  loadingText?: string
  className?: string
  /** Additional disabled condition (e.g. validation state). */
  disabled?: boolean
}

/**
 * A submit button that automatically disables and shows a loading label
 * while its parent <form>'s server action is in-flight.
 *
 * Must be rendered as a direct or nested child of a <form> element.
 * Uses React's useFormStatus hook (react-dom) — no extra state needed.
 */
export function SubmitButton({
  children,
  loadingText,
  className = '',
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className={className}
    >
      {pending && loadingText ? loadingText : children}
    </button>
  )
}
