'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main role="alert">
      <h1>Algo salió mal</h1>
      <p>Hubo un error inesperado.</p>
      <button type="button" onClick={reset}>Intentar de nuevo</button>
    </main>
  )
}
