import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="retro-footer mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-1">
          <Link href="/" className="hover:underline">Inicio</Link>
          <span className="opacity-40">|</span>
          <Link href="/rooms" className="hover:underline">Salas</Link>
          <span className="opacity-40">|</span>
          <Link href="/register" className="hover:underline">Registrarse</Link>
          <span className="opacity-40">|</span>
          <span className="opacity-60">Sobre nosotros</span>
          <span className="opacity-40">|</span>
          <span className="opacity-60">Reglas</span>
          <span className="opacity-40">|</span>
          <span className="opacity-60">Contacto</span>
          <span className="opacity-40">|</span>
          <span className="opacity-60">Términos</span>
        </div>
        <p className="text-center opacity-50 text-xs">
          © {year} RetroChat 2009 · Hecho con ❤️ y nostalgia ·{' '}
          <span className="opacity-70">Mejor visto en Internet Explorer 7 a 800x600</span>
        </p>
      </div>
    </footer>
  )
}
