import type { Perfil, Status } from './types'

// Espelho do mapa da API (api/src/chamados/transicoes.ts), só para decidir quais botões mostrar.
export const TRANSICOES: Record<Status, Partial<Record<Status, Perfil[]>>> = {
  ABERTO: { EM_ATENDIMENTO: ['TECNICO', 'GESTOR'], CANCELADO: ['CLIENTE', 'GESTOR'] },
  EM_ATENDIMENTO: {
    RESOLVIDO: ['TECNICO', 'GESTOR'],
    AGUARDANDO_CLIENTE: ['TECNICO', 'GESTOR'],
  },
  AGUARDANDO_CLIENTE: { EM_ATENDIMENTO: ['CLIENTE', 'TECNICO', 'GESTOR'] },
  RESOLVIDO: {
    FECHADO: ['CLIENTE', 'GESTOR'],
    EM_ATENDIMENTO: ['CLIENTE', 'TECNICO', 'GESTOR'],
  },
  FECHADO: {},
  CANCELADO: {},
}

export function acoesPermitidas(status: Status, perfil: Perfil): Status[] {
  return (Object.entries(TRANSICOES[status]) as [Status, Perfil[]][])
    .filter(([, perfis]) => perfis.includes(perfil))
    .map(([para]) => para)
}
