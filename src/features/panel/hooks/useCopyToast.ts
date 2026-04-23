'use client'
import { useCallback, useState } from 'react'

export function useCopyToast() {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const show = useCallback((msg: string, err = false) => {
    setMessage(msg)
    setIsError(err)
    window.setTimeout(() => setMessage(null), 1600)
  }, [])

  return { message, isError, show }
}
