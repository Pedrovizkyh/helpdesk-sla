import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  Chamado,
  ChamadoDetalhe,
  Comentario,
  Metricas,
  Pagina,
  Pessoa,
  Politica,
  Prioridade,
  Status,
} from '@/lib/types'

export interface FiltrosChamados {
  status?: Status[]
  prioridade?: Prioridade[]
  tecnicoId?: string
  slaEstourado?: boolean
  busca?: string
  pagina?: number
}

function query(f: FiltrosChamados) {
  const p = new URLSearchParams()
  if (f.status?.length) p.set('status', f.status.join(','))
  if (f.prioridade?.length) p.set('prioridade', f.prioridade.join(','))
  if (f.tecnicoId) p.set('tecnicoId', f.tecnicoId)
  if (f.slaEstourado) p.set('slaEstourado', 'true')
  if (f.busca) p.set('busca', f.busca)
  p.set('pagina', String(f.pagina ?? 1))
  p.set('porPagina', '15')
  return p.toString()
}

export const useChamados = (f: FiltrosChamados) =>
  useQuery({
    queryKey: ['chamados', f],
    queryFn: () => api<Pagina<Chamado>>(`/chamados?${query(f)}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

export const useChamado = (id: string) =>
  useQuery({
    queryKey: ['chamado', id],
    queryFn: () => api<ChamadoDetalhe>(`/chamados/${id}`),
    refetchInterval: 60_000,
  })

export const useTecnicos = (habilitado: boolean) =>
  useQuery({
    queryKey: ['tecnicos'],
    queryFn: () => api<Pessoa[]>('/usuarios/tecnicos'),
    enabled: habilitado,
    staleTime: 5 * 60_000,
  })

export const useEmpresas = (habilitado: boolean) =>
  useQuery({
    queryKey: ['empresas'],
    queryFn: () => api<{ id: string; nome: string }[]>('/empresas'),
    enabled: habilitado,
    staleTime: 5 * 60_000,
  })

export const usePoliticas = () =>
  useQuery({ queryKey: ['politicas'], queryFn: () => api<Politica[]>('/sla/politicas') })

export const useMetricas = (dias: number) =>
  useQuery({
    queryKey: ['metricas', dias],
    queryFn: () => {
      const de = new Date(Date.now() - dias * 86_400_000).toISOString()
      return api<Metricas>(`/metricas?de=${encodeURIComponent(de)}`)
    },
    placeholderData: keepPreviousData,
  })

function erro(e: Error) {
  toast.error('Não deu certo', { description: e.message })
}

/** Invalida lista e detalhe depois de qualquer ação no chamado. */
function useAcaoChamado<TVars>(id: string, fn: (v: TVars) => Promise<unknown>, sucesso: string | ((v: TVars) => string)) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, v) => {
      toast.success(typeof sucesso === 'function' ? sucesso(v) : sucesso)
      void qc.invalidateQueries({ queryKey: ['chamado', id] })
      void qc.invalidateQueries({ queryKey: ['chamados'] })
      void qc.invalidateQueries({ queryKey: ['metricas'] })
    },
    onError: erro,
  })
}

export const useComentar = (id: string) =>
  useAcaoChamado(
    id,
    (v: { texto: string; interno: boolean }) =>
      api<Comentario>(`/chamados/${id}/comentarios`, { method: 'POST', json: v }),
    (v) => (v.interno ? 'Nota interna adicionada' : 'Comentário enviado'),
  )

export const useAssumir = (id: string) =>
  useAcaoChamado(id, () => api(`/chamados/${id}/assumir`, { method: 'POST' }), 'Chamado assumido')

export const useMudarStatus = (id: string) =>
  useAcaoChamado(
    id,
    (status: Status) => api(`/chamados/${id}/status`, { method: 'PATCH', json: { status } }),
    'Status atualizado',
  )

export const useAtribuir = (id: string) =>
  useAcaoChamado(
    id,
    (tecnicoId: string) => api(`/chamados/${id}/atribuir`, { method: 'PATCH', json: { tecnicoId } }),
    'Técnico atribuído',
  )

export const useMudarPrioridade = (id: string) =>
  useAcaoChamado(
    id,
    (prioridade: Prioridade) => api(`/chamados/${id}/prioridade`, { method: 'PATCH', json: { prioridade } }),
    'Prioridade alterada e prazos recalculados',
  )

export function useAbrirChamado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      titulo: string
      descricao: string
      categoria: string
      prioridade: Prioridade
      empresaId?: string
    }) => api<Chamado>('/chamados', { method: 'POST', json: dto }),
    onSuccess: (c) => {
      toast.success(`Chamado #${c.numero} aberto`, { description: 'Os prazos de SLA já estão correndo.' })
      void qc.invalidateQueries({ queryKey: ['chamados'] })
    },
    onError: erro,
  })
}

export function useSalvarPolitica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: Pick<Politica, 'prioridade' | 'minutosResposta' | 'minutosResolucao'>) =>
      api<Politica>(`/sla/politicas/${p.prioridade}`, {
        method: 'PUT',
        json: { minutosResposta: p.minutosResposta, minutosResolucao: p.minutosResolucao },
      }),
    onSuccess: () => {
      toast.success('Política salva', { description: 'Vale para os próximos chamados abertos.' })
      void qc.invalidateQueries({ queryKey: ['politicas'] })
    },
    onError: erro,
  })
}
