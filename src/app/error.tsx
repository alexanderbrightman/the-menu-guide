'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#F4F2EE]">
      <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="text-gray-600 max-w-md">
        An unexpected error occurred. Please try again, and if the problem
        persists, contact support.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
