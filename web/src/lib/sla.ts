import type { Chamado } from './types'

export type EstadoSla = 'no-prazo' | 'perto' | 'estourado' | 'pausado' | 'cumprido' | 'nenhum'

export interface InfoSla {
  estado: EstadoSla
  alvo: 'resposta' | 'resolucao' | null
  restanteMin: number
  /** 0..1 do tempo já consumido */
  consumido: number
  vence: Date | null
}

const MIN = 60_000

function progresso(inicio: number, fim: number, agora: number) {
  const total = Math.max(1, fim - inicio)
  return Math.min(1, Math.max(0, (agora - inicio) / total))
}

/** Estado de um prazo isolado (resposta ou resolução). */
export function estadoPrazo(
  c: Chamado,
  alvo: 'resposta' | 'resolucao',
  agora: number,
): InfoSla {
  const inicio = new Date(c.criadoEm).getTime()
  const vence = new Date(alvo === 'resposta' ? c.venceRespostaEm : c.venceResolucaoEm)
  const fim = vence.getTime()
  const cumpridoEm = alvo === 'resposta' ? c.respondidoEm : c.resolvidoEm
  const extraPausa = alvo === 'resolucao' ? c.minutosPausados * MIN : 0

  if (c.status === 'CANCELADO') {
    return { estado: 'nenhum', alvo, restanteMin: 0, consumido: 0, vence }
  }
  if (cumpridoEm) {
    const t = new Date(cumpridoEm).getTime()
    return {
      estado: t > fim ? 'estourado' : 'cumprido',
      alvo,
      restanteMin: (fim - t) / MIN,
      consumido: progresso(inicio, fim - extraPausa, t - extraPausa),
      vence,
    }
  }
  if (alvo === 'resolucao' && c.status === 'AGUARDANDO_CLIENTE' && c.pausadoEm) {
    const pausa = new Date(c.pausadoEm).getTime()
    return {
      estado: 'pausado',
      alvo,
      restanteMin: (fim - pausa) / MIN,
      consumido: progresso(inicio, fim - extraPausa, pausa - extraPausa),
      vence,
    }
  }
  const restanteMin = (fim - agora) / MIN
  const consumido = progresso(inicio, fim - extraPausa, agora - extraPausa)
  const estado: EstadoSla =
    restanteMin <= 0 ? 'estourado' : 1 - consumido < 0.2 ? 'perto' : 'no-prazo'
  return { estado, alvo, restanteMin, consumido, vence }
}

/** O prazo que importa agora: resposta se ainda não respondeu, senão resolução. */
export function slaPrincipal(c: Chamado, agora: number): InfoSla {
  if (c.status === 'CANCELADO') {
    return { estado: 'nenhum', alvo: null, restanteMin: 0, consumido: 0, vence: null }
  }
  if (c.status === 'RESOLVIDO' || c.status === 'FECHADO') {
    return {
      estado: c.slaEstourado ? 'estourado' : 'cumprido',
      alvo: null,
      restanteMin: 0,
      consumido: 1,
      vence: null,
    }
  }
  const resposta = estadoPrazo(c, 'resposta', agora)
  if (!c.respondidoEm) return resposta
  const resolucao = estadoPrazo(c, 'resolucao', agora)
  if (c.slaEstourado && resolucao.estado !== 'pausado') {
    return { ...resolucao, estado: 'estourado' }
  }
  return resolucao
}
