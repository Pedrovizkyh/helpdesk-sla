export type Perfil = 'CLIENTE' | 'TECNICO' | 'GESTOR'
export type Prioridade = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'
export type Status =
  | 'ABERTO'
  | 'EM_ATENDIMENTO'
  | 'AGUARDANDO_CLIENTE'
  | 'RESOLVIDO'
  | 'FECHADO'
  | 'CANCELADO'
export type TipoEvento =
  | 'ABERTO'
  | 'ATRIBUIDO'
  | 'STATUS_ALTERADO'
  | 'PRIORIDADE_ALTERADA'
  | 'COMENTARIO'
  | 'NOTA_INTERNA'
  | 'PRIMEIRA_RESPOSTA'
  | 'SLA_ESTOURADO'

export interface Pessoa {
  id: string
  nome: string
  perfil: Perfil
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  empresa: { id: string; nome: string } | null
}

export interface Chamado {
  id: string
  numero: number
  titulo: string
  descricao: string
  categoria: string
  prioridade: Prioridade
  status: Status
  venceRespostaEm: string
  venceResolucaoEm: string
  respondidoEm: string | null
  resolvidoEm: string | null
  pausadoEm: string | null
  minutosPausados: number
  slaEstourado: boolean
  criadoEm: string
  atualizadoEm: string
  solicitante: Pessoa
  tecnico: Pessoa | null
  empresa: { id: string; nome: string }
  _count?: { comentarios: number }
}

export interface Comentario {
  id: string
  texto: string
  interno: boolean
  criadoEm: string
  autor: Pessoa
}

export interface Evento {
  id: string
  tipo: TipoEvento
  valorAnterior: string | null
  valorNovo: string | null
  criadoEm: string
  autor: Pessoa | null
}

export interface ChamadoDetalhe extends Chamado {
  comentarios: Comentario[]
  eventos: Evento[]
}

export interface Pagina<T> {
  itens: T[]
  total: number
  pagina: number
  porPagina: number
}

export interface Politica {
  id: string
  prioridade: Prioridade
  minutosResposta: number
  minutosResolucao: number
}

export interface Metricas {
  periodo: { de: string; ate: string }
  total: number
  porStatus: Record<Status, number>
  porPrioridade: Partial<Record<Prioridade, number>>
  tempoMedioRespostaMin: number | null
  tempoMedioResolucaoMin: number | null
  percentualDentroSla: number | null
  estouradosEmAberto: number
  porTecnico: { id: string; nome: string; total: number; resolvidos: number; estourados: number }[]
  porDia: { dia: string; abertos: number; resolvidos: number }[]
}
