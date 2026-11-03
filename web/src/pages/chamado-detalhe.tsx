import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  CircleSlash,
  Clock4,
  Flame,
  Hand,
  Loader2,
  Lock,
  MessageSquareReply,
  PlayCircle,
  RotateCcw,
  Send,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react'
import {
  useAssumir,
  useAtribuir,
  useChamado,
  useComentar,
  useMudarPrioridade,
  useMudarStatus,
  useTecnicos,
} from '@/hooks/queries'
import { useAgora } from '@/hooks/use-agora'
import { ApiError } from '@/lib/api'
import { useUsuario } from '@/lib/auth'
import {
  EVENTO_LABEL,
  formatarDataHora,
  PERFIL_LABEL,
  PRIORIDADE_LABEL,
  PRIORIDADE_ORDEM,
  STATUS_LABEL,
  tempoRelativo,
} from '@/lib/format'
import { acoesPermitidas } from '@/lib/transicoes'
import type { ChamadoDetalhe, Comentario, Evento, Prioridade, Status, Usuario } from '@/lib/types'
import { cn } from '@/lib/utils'
import { IconePrioridade, PrioridadeBadge, StatusBadge } from '@/components/badges'
import { EmptyState } from '@/components/empty-state'
import { SlaDetalhe } from '@/components/sla-indicator'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

type ItemLinha = { tipo: 'comentario'; em: string; c: Comentario } | { tipo: 'evento'; em: string; e: Evento }

const ICONE_EVENTO: Partial<Record<Evento['tipo'], typeof Zap>> = {
  ABERTO: Sparkles,
  ATRIBUIDO: UserPlus,
  STATUS_ALTERADO: ArrowRightLeft,
  PRIORIDADE_ALTERADA: Zap,
  PRIMEIRA_RESPOSTA: MessageSquareReply,
  SLA_ESTOURADO: Flame,
}

function descreverEvento(e: Evento) {
  switch (e.tipo) {
    case 'STATUS_ALTERADO':
      return (
        <>
          mudou o status de <strong className="font-medium">{STATUS_LABEL[e.valorAnterior as Status]}</strong> para{' '}
          <strong className="font-medium">{STATUS_LABEL[e.valorNovo as Status]}</strong>
        </>
      )
    case 'PRIORIDADE_ALTERADA':
      return (
        <>
          mudou a prioridade de <strong className="font-medium">{PRIORIDADE_LABEL[e.valorAnterior as Prioridade]}</strong> para{' '}
          <strong className="font-medium">{PRIORIDADE_LABEL[e.valorNovo as Prioridade]}</strong> e os prazos foram recalculados
        </>
      )
    case 'ATRIBUIDO':
      return e.valorAnterior ? (
        <>
          passou o chamado de {e.valorAnterior} para <strong className="font-medium">{e.valorNovo}</strong>
        </>
      ) : (
        <>
          atribuiu a <strong className="font-medium">{e.valorNovo}</strong>
        </>
      )
    case 'SLA_ESTOURADO':
      return <>Prazo de {e.valorNovo === 'resposta' ? 'primeira resposta' : 'resolução'} estourado</>
    default:
      return EVENTO_LABEL[e.tipo]
  }
}

function LinhaEvento({ e, agora }: { e: Evento; agora: number }) {
  const Icone = ICONE_EVENTO[e.tipo] ?? ArrowRightLeft
  const alerta = e.tipo === 'SLA_ESTOURADO'
  return (
    <li className="relative flex gap-3 pl-1">
      <span
        className={cn(
          'ring-background relative z-10 mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-4',
          alerta ? 'bg-danger-soft text-danger-fg' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icone className="size-3" aria-hidden />
      </span>
      <p className={cn('text-muted-foreground pt-0.5 text-[13px]', alerta && 'text-danger-fg')}>
        {e.autor && !alerta && <span className="text-foreground font-medium">{e.autor.nome} </span>}
        {!e.autor && !alerta && <span className="text-foreground font-medium">Sistema </span>}
        {descreverEvento(e)}
        <time dateTime={e.criadoEm} title={formatarDataHora(e.criadoEm)} className="ml-1.5 text-xs opacity-70">
          {tempoRelativo(e.criadoEm, agora)}
        </time>
      </p>
    </li>
  )
}

function CartaoComentario({ c, agora }: { c: Comentario; agora: number }) {
  return (
    <li className="relative flex gap-3">
      <UserAvatar nome={c.autor.nome} perfil={c.autor.perfil} className="relative z-10 size-8 ring-4" />
      <div
        className={cn(
          'min-w-0 flex-1 rounded-xl border shadow-soft',
          c.interno ? 'bg-note border-note-border' : 'bg-card',
        )}
      >
        <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2.5', c.interno && 'border-note-border')}>
          <span className="text-sm font-medium">{c.autor.nome}</span>
          <span className="text-muted-foreground text-xs">{PERFIL_LABEL[c.autor.perfil]}</span>
          {c.interno && (
            <span className="text-note-fg inline-flex items-center gap-1 rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-medium ring-1 ring-note-border ring-inset dark:bg-black/20">
              <Lock className="size-3" aria-hidden /> Nota interna · só a equipe vê
            </span>
          )}
          <time dateTime={c.criadoEm} title={formatarDataHora(c.criadoEm)} className="text-muted-foreground ml-auto text-xs">
            {tempoRelativo(c.criadoEm, agora)}
          </time>
        </div>
        <p className={cn('px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap', c.interno && 'text-note-fg')}>{c.texto}</p>
      </div>
    </li>
  )
}

function Compositor({ chamado, usuario }: { chamado: ChamadoDetalhe; usuario: Usuario }) {
  const [texto, setTexto] = useState('')
  const [interno, setInterno] = useState(false)
  const comentar = useComentar(chamado.id)
  const staff = usuario.perfil !== 'CLIENTE'
  const encerrado = chamado.status === 'FECHADO' || chamado.status === 'CANCELADO'

  if (encerrado) {
    return (
      <p className="text-muted-foreground bg-muted/50 rounded-xl border border-dashed p-4 text-center text-sm">
        Chamado {STATUS_LABEL[chamado.status].toLowerCase()}. Não recebe novos comentários.
      </p>
    )
  }

  const enviar = (e?: FormEvent) => {
    e?.preventDefault()
    if (!texto.trim()) return
    comentar.mutate({ texto: texto.trim(), interno }, { onSuccess: () => setTexto('') })
  }
  const atalho = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar()
  }
  const aguardando = usuario.perfil === 'CLIENTE' && chamado.status === 'AGUARDANDO_CLIENTE'

  return (
    <form
      onSubmit={enviar}
      className={cn(
        'shadow-soft rounded-xl border transition-colors focus-within:ring-2 focus-within:ring-ring/40',
        interno ? 'bg-note border-note-border' : 'bg-card',
      )}
    >
      {staff && (
        <div role="radiogroup" aria-label="Tipo de comentário" className="flex gap-1 border-b border-inherit p-1.5">
          {[
            { v: false, rotulo: 'Resposta pública', Icone: MessageSquareReply },
            { v: true, rotulo: 'Nota interna', Icone: Lock },
          ].map(({ v, rotulo, Icone }) => (
            <button
              key={rotulo}
              type="button"
              role="radio"
              aria-checked={interno === v}
              onClick={() => setInterno(v)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                interno === v ? (v ? 'bg-note-border/50 text-note-fg' : 'bg-muted text-foreground') : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icone className="size-3.5" /> {rotulo}
            </button>
          ))}
        </div>
      )}
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={atalho}
        aria-label={interno ? 'Escrever nota interna' : 'Escrever comentário'}
        placeholder={
          interno
            ? 'Anotação para a equipe. O cliente não vê.'
            : aguardando
              ? 'Responda o técnico; o atendimento é retomado automaticamente.'
              : 'Escreva uma resposta…'
        }
        className="min-h-24 resize-y border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <span className="text-muted-foreground hidden text-xs sm:block">Ctrl + Enter para enviar</span>
        <Button type="submit" size="sm" className="ml-auto" disabled={!texto.trim() || comentar.isPending}>
          {comentar.isPending ? <Loader2 className="animate-spin" /> : interno ? <Lock /> : <Send />}
          {interno ? 'Salvar nota' : 'Enviar'}
        </Button>
      </div>
    </form>
  )
}

const ACAO: Record<string, { rotulo: string; Icone: typeof Zap; variante?: 'default' | 'outline' | 'destructive' }> = {
  'EM_ATENDIMENTO>RESOLVIDO': { rotulo: 'Marcar como resolvido', Icone: CheckCircle2 },
  'EM_ATENDIMENTO>AGUARDANDO_CLIENTE': { rotulo: 'Pedir informação ao cliente', Icone: Clock4, variante: 'outline' },
  'AGUARDANDO_CLIENTE>EM_ATENDIMENTO': { rotulo: 'Retomar atendimento', Icone: PlayCircle, variante: 'outline' },
  'RESOLVIDO>FECHADO': { rotulo: 'Confirmar solução e fechar', Icone: CheckCircle2 },
  'RESOLVIDO>EM_ATENDIMENTO': { rotulo: 'Reabrir chamado', Icone: RotateCcw, variante: 'outline' },
  'ABERTO>CANCELADO': { rotulo: 'Cancelar chamado', Icone: CircleSlash, variante: 'destructive' },
}

function Acoes({ chamado, usuario }: { chamado: ChamadoDetalhe; usuario: Usuario }) {
  const assumir = useAssumir(chamado.id)
  const mudarStatus = useMudarStatus(chamado.id)
  const atribuir = useAtribuir(chamado.id)
  const mudarPrioridade = useMudarPrioridade(chamado.id)
  const ehGestor = usuario.perfil === 'GESTOR'
  const staff = usuario.perfil !== 'CLIENTE'
  const tecnicos = useTecnicos(ehGestor)
  const responsavel = !chamado.tecnico || chamado.tecnico.id === usuario.id || ehGestor
  const final = ['RESOLVIDO', 'FECHADO', 'CANCELADO'].includes(chamado.status)

  const podeAssumir = staff && chamado.status === 'ABERTO' && responsavel
  const transicoes = (staff && !responsavel ? [] : acoesPermitidas(chamado.status, usuario.perfil)).filter(
    (s) => !(chamado.status === 'ABERTO' && s === 'EM_ATENDIMENTO'),
  )

  const botoes = transicoes.map((para) => {
    const a = ACAO[`${chamado.status}>${para}`]!
    const ocupado = mudarStatus.isPending && mudarStatus.variables === para
    const botao = (
      <Button key={para} variant={a.variante ?? 'default'} className="w-full justify-start" disabled={mudarStatus.isPending} onClick={para === 'CANCELADO' ? undefined : () => mudarStatus.mutate(para)}>
        {ocupado ? <Loader2 className="animate-spin" /> : <a.Icone />}
        {usuario.perfil === 'CLIENTE' && para === 'EM_ATENDIMENTO' && chamado.status === 'AGUARDANDO_CLIENTE' ? 'Já respondi, retomar' : a.rotulo}
      </Button>
    )
    if (para !== 'CANCELADO') return botao
    return (
      <Dialog key={para}>
        <DialogTrigger asChild>{botao}</DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar o chamado #{chamado.numero}?</DialogTitle>
            <DialogDescription>Ele sai da fila e não pode ser reaberto.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Voltar</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive" onClick={() => mudarStatus.mutate('CANCELADO')}>
                Cancelar chamado
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  })

  const nada = !podeAssumir && botoes.length === 0 && !(ehGestor && !['FECHADO', 'CANCELADO'].includes(chamado.status)) && !(staff && responsavel && !final)
  if (nada) return null

  return (
    <section aria-labelledby="titulo-acoes" className="bg-card shadow-soft space-y-3 rounded-xl border p-4">
      <h2 id="titulo-acoes" className="text-sm font-semibold">Ações</h2>
      {podeAssumir && (
        <Button className="w-full justify-start" onClick={() => assumir.mutate(undefined)} disabled={assumir.isPending}>
          {assumir.isPending ? <Loader2 className="animate-spin" /> : <Hand />}
          Assumir e iniciar atendimento
        </Button>
      )}
      {botoes}
      {ehGestor && !['FECHADO', 'CANCELADO'].includes(chamado.status) && (
        <div className="space-y-1.5 pt-1">
          <label htmlFor="atribuir" className="text-muted-foreground text-xs font-medium">
            Responsável
          </label>
          <Select value={chamado.tecnico?.id ?? ''} onValueChange={(v) => atribuir.mutate(v)} disabled={atribuir.isPending}>
            <SelectTrigger id="atribuir" className="w-full">
              <SelectValue placeholder="Atribuir a um técnico" />
            </SelectTrigger>
            <SelectContent>
              {tecnicos.data?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome} <span className="text-muted-foreground text-xs">· {PERFIL_LABEL[t.perfil]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {staff && responsavel && !final && (
        <div className="space-y-1.5">
          <label htmlFor="prioridade" className="text-muted-foreground text-xs font-medium">
            Prioridade <span className="font-normal">(recalcula os prazos)</span>
          </label>
          <Select value={chamado.prioridade} onValueChange={(v) => mudarPrioridade.mutate(v as Prioridade)} disabled={mudarPrioridade.isPending}>
            <SelectTrigger id="prioridade" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADE_ORDEM.map((p) => (
                <SelectItem key={p} value={p}>
                  <IconePrioridade prioridade={p} /> {PRIORIDADE_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </section>
  )
}

function Carregando() {
  return (
    <div className="grid gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function ChamadoDetalhePage() {
  const { id = '' } = useParams()
  const usuario = useUsuario()
  const agora = useAgora(15_000)
  const { data: chamado, isPending, error } = useChamado(id)

  const linha = useMemo<ItemLinha[]>(() => {
    if (!chamado) return []
    return [
      ...chamado.comentarios.map((c) => ({ tipo: 'comentario' as const, em: c.criadoEm, c })),
      ...chamado.eventos
        .filter((e) => e.tipo !== 'COMENTARIO' && e.tipo !== 'NOTA_INTERNA' && e.tipo !== 'ABERTO')
        .map((e) => ({ tipo: 'evento' as const, em: e.criadoEm, e })),
    ].sort((a, b) => a.em.localeCompare(b.em))
  }, [chamado])

  if (isPending) return <Carregando />
  if (error || !chamado) {
    return (
      <EmptyState
        className="min-h-[60dvh]"
        titulo={error instanceof ApiError && error.status === 404 ? 'Chamado não encontrado' : 'Não foi possível carregar'}
        descricao={error instanceof ApiError && error.status === 404 ? 'Ele não existe ou não está visível para o seu perfil.' : error?.message}
        acao={
          <Button asChild variant="outline">
            <Link to="/chamados">Voltar para a lista</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="px-4 pt-6 pb-12 sm:px-8 sm:pt-8">
      <Link to="/chamados" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors">
        <ArrowLeft className="size-4" /> Chamados
      </Link>

      <header className="mt-4 mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground font-mono text-sm">#{chamado.numero}</span>
          <StatusBadge status={chamado.status} />
          <PrioridadeBadge prioridade={chamado.prioridade} />
          {chamado.slaEstourado && (
            <span className="bg-danger-soft text-danger-fg ring-danger/30 inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset">
              <Flame className="size-3.5" /> SLA estourado
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{chamado.titulo}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <article className="bg-card shadow-soft rounded-xl border p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <UserAvatar nome={chamado.solicitante.nome} perfil={chamado.solicitante.perfil} className="size-8" />
              <div>
                <p className="text-sm font-medium">{chamado.solicitante.nome}</p>
                <p className="text-muted-foreground text-xs">
                  abriu em {formatarDataHora(chamado.criadoEm)} · {chamado.empresa.nome}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{chamado.descricao}</p>
          </article>

          <section aria-labelledby="titulo-atividade">
            <h2 id="titulo-atividade" className="mb-4 text-sm font-semibold">
              Atividade
            </h2>
            {linha.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ainda sem atividade. A primeira resposta aparece aqui.</p>
            ) : (
              <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
                {linha.map((item) =>
                  item.tipo === 'comentario' ? (
                    <CartaoComentario key={item.c.id} c={item.c} agora={agora} />
                  ) : (
                    <LinhaEvento key={item.e.id} e={item.e} agora={agora} />
                  ),
                )}
              </ol>
            )}
          </section>

          <Compositor chamado={chamado} usuario={usuario} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section aria-labelledby="titulo-sla" className="bg-card shadow-soft rounded-xl border p-4">
            <h2 id="titulo-sla" className="mb-4 text-sm font-semibold">SLA</h2>
            <SlaDetalhe chamado={chamado} agora={agora} />
          </section>

          <Acoes chamado={chamado} usuario={usuario} />

          <section aria-labelledby="titulo-detalhes" className="bg-card shadow-soft rounded-xl border p-4">
            <h2 id="titulo-detalhes" className="mb-3 text-sm font-semibold">Detalhes</h2>
            <dl className="space-y-2.5 text-sm">
              {[
                ['Responsável', chamado.tecnico ? (
                  <span key="t" className="flex items-center gap-1.5"><UserAvatar nome={chamado.tecnico.nome} perfil="TECNICO" className="size-5 text-[9px]" />{chamado.tecnico.nome}</span>
                ) : <span key="s" className="text-muted-foreground italic">Sem dono</span>],
                ['Empresa', chamado.empresa.nome],
                ['Categoria', chamado.categoria],
                ['Aberto em', formatarDataHora(chamado.criadoEm)],
                ['Respondido em', chamado.respondidoEm ? formatarDataHora(chamado.respondidoEm) : '—'],
                ['Resolvido em', chamado.resolvidoEm ? formatarDataHora(chamado.resolvidoEm) : '—'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
