import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, lerToken, quandoSessaoExpirar, salvarToken } from './api'
import type { Usuario } from './types'

interface AuthValor {
  usuario: Usuario | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<Usuario>
  sair: () => void
}

const AuthContext = createContext<AuthValor | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(() => !!lerToken())
  const queryClient = useQueryClient()

  const sair = useCallback(() => {
    salvarToken(null)
    setUsuario(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    quandoSessaoExpirar(sair)
    if (!lerToken()) return
    api<Usuario>('/auth/me')
      .then(setUsuario)
      .catch(() => salvarToken(null))
      .finally(() => setCarregando(false))
  }, [sair])

  const entrar = useCallback(async (email: string, senha: string) => {
    const r = await api<{ accessToken: string; usuario: Usuario }>('/auth/login', {
      method: 'POST',
      json: { email, senha },
    })
    salvarToken(r.accessToken)
    setUsuario(r.usuario)
    return r.usuario
  }, [])

  const valor = useMemo(() => ({ usuario, carregando, entrar, sair }), [usuario, carregando, entrar, sair])
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

/** Usuário garantido (só dentro de rotas protegidas). */
export function useUsuario() {
  const { usuario } = useAuth()
  if (!usuario) throw new Error('Rota protegida sem usuário')
  return usuario
}
