import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <main>
      <h1>Pagina no encontrada</h1>
      <p>El contenido que buscas no existe o fue movido.</p>
      <Link href="/">Volver al inicio</Link>
    </main>
  )
}
