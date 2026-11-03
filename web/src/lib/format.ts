import type { Perfil, Prioridade, Status, TipoEvento } from './types'

export const STATUS_LABEL: Record<Status, string> = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
  CANCELADO: 'Cancelado',
}

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Média',
  BAIXA: 'Baixa',
}

export const PERFIL_LABEL: Record<Perfil, string> = {
  CLIENTE: 'Cliente',
  TECNICO: 'Técnico',
  GESTOR: 'Gestor',
}

export const EVENTO_LABEL: Record<TipoEvento, string> = {
  ABERTO: 'abriu o chamado',
  ATRIBUIDO: 'atribuiu',
  STATUS_ALTERADO: 'mudou o status',
  PRIORIDADE_ALTERADA: 'mudou a prioridade',
  COMENTARIO: 'comentou',
  NOTA_INTERNA: 'adicionou nota interna',
  PRIMEIRA_RESPOSTA: 'registrou a primeira resposta',
  SLA_ESTOURADO: 'SLA estourado',
}

export const STATUS_ORDEM: Status[] = [
  'ABERTO',
  'EM_ATENDIMENTO',
  'AGUARDANDO_CLIENTE',
  'RESOLVIDO',
  'FECHADO',
  'CANCELADO',
]
export const PRIORIDADE_ORDEM: Prioridade[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA']

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export const formatarDataHora = (iso: string) => dataHora.format(new Date(iso)).replace('.', '')
export const formatarDia = (iso: string) => dataCurta.format(new Date(`${iso}T12:00:00`)).replace('.', '')

export function tempoRelativo(iso: string, agora = Date.now()) {
  const seg = (new Date(iso).getTime() - agora) / 1000
  const abs = Math.abs(seg)
  if (abs < 60) return 'agora'
  if (abs < 3600) return relativo.format(Math.round(seg / 60), 'minute')
  if (abs < 86400) return relativo.format(Math.round(seg / 3600), 'hour')
  return relativo.format(Math.round(seg / 86400), 'day')
}

/** 95 → "1h 35min"; 3000 → "2d 2h" */
export function formatarDuracao(minutos: number) {
  const m = Math.max(0, Math.round(minutos))
  if (m < 60) return `${m}min`
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const r = m % 60
  if (d > 0) return h ? `${d}d ${h}h` : `${d}d`
  return r ? `${h}h ${r}min` : `${h}h`
}

export const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
