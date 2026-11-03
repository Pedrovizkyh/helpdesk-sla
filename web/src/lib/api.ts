const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const CHAVE_TOKEN = 'helpdesk.token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function salvarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    /* armazenamento indisponível: sessão só em memória */
  }
}

let aoExpirar: (() => void) | null = null
export const quandoSessaoExpirar = (fn: () => void) => {
  aoExpirar = fn
}

export async function api<T>(caminho: string, opcoes: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...resto } = opcoes
  const token = lerToken()
  let resposta: Response
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...resto,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : resto.body,
    })
  } catch {
    throw new ApiError(0, 'Não foi possível falar com o servidor. Ele pode estar acordando; tente de novo em alguns segundos.')
  }

  if (resposta.status === 401 && token && !caminho.startsWith('/auth/login')) {
    aoExpirar?.()
  }
  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null)
  if (!resposta.ok) {
    const msg = corpo?.message
    throw new ApiError(resposta.status, Array.isArray(msg) ? msg.join('; ') : (msg ?? 'Erro inesperado'))
  }
  return corpo as T
}
