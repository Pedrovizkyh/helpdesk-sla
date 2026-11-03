import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Tema = 'light' | 'dark' | 'system'
const CHAVE = 'helpdesk.tema'

const TemaContext = createContext<{ tema: Tema; resolvido: 'light' | 'dark'; setTema: (t: Tema) => void } | null>(null)

const lerTema = (): Tema => {
  try {
    const t = localStorage.getItem(CHAVE)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}
const mql = () => window.matchMedia('(prefers-color-scheme: dark)')

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(lerTema)
  const [sistemaEscuro, setSistemaEscuro] = useState(() => mql().matches)

  useEffect(() => {
    const m = mql()
    const ouvir = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches)
    m.addEventListener('change', ouvir)
    return () => m.removeEventListener('change', ouvir)
  }, [])

  const resolvido = tema === 'system' ? (sistemaEscuro ? 'dark' : 'light') : tema
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvido === 'dark')
  }, [resolvido])

  const setTema = (t: Tema) => {
    setTemaState(t)
    try {
      localStorage.setItem(CHAVE, t)
    } catch {
      /* ignora */
    }
  }
  return <TemaContext.Provider value={{ tema, resolvido, setTema }}>{children}</TemaContext.Provider>
}

export function useTema() {
  const ctx = useContext(TemaContext)
  if (!ctx) throw new Error('useTema fora do ThemeProvider')
  return ctx
}
