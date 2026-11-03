import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ChevronLeft, ChevronRight, Filter, MessageSquare, Plus, Search, X } from 'lucide-react'
import { useChamados, useTecnicos, type FiltrosChamados } from '@/hooks/queries'
import { useAgora } from '@/hooks/use-agora'
import { useDebounce } from '@/hooks/use-debounce'
import { useUsuario } from '@/lib/auth'
import { PRIORIDADE_LABEL, PRIORIDADE_ORDEM, STATUS_LABEL, STATUS_ORDEM, tempoRelativo } from '@/lib/format'
import type { Chamado, Prioridade, Status } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cabecalho } from '@/components/app-shell'
import { PrioridadeBadge, StatusBadge } from '@/components/badges'
import { EmptyState } from '@/components/empty-state'
import { NovoChamadoDialog } from '@/components/novo-chamado-dialog'
import { SlaPill } from '@/components/sla-indicator'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

type Vista = 'todos' | 'ativos' | 'meus' | 'sem-dono' | 'estourados'
const ATIVOS: Status[] = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE']

function MultiFiltro<T extends string>({
  rotulo,
  opcoes,
  rotulos,
  valor,
  onChange,
}: {
  rotulo: string
  opcoes: T[]
  rotulos: Record<T, string>
  valor: T[]
  onChange: (v: T[]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-9 border-dashed', valor.length && 'border-solid')}>
          <Filter className="opacity-60" />
          {rotulo}
          {valor.length > 0 && (
            <span className="bg-primary text-primary-foreground ml-0.5 rounded-full px-1.5 text-[10px] font-semibold">{valor.length}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>{rotulo}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {opcoes.map((o) => (
          <DropdownMenuCheckboxItem
            key={o}
            checked={valor.includes(o)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(marcado) => onChange(marcado ? [...valor, o] : valor.filter((x) => x !== o))}
          >
            {rotulos[o]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LinhaSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
      <Skeleton className="h-4 w-10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="hidden h-6 w-28 rounded-full md:block" />
      <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
      <Skeleton className="h-6 w-24 rounded-full" />
    </div>
  )
}

function ItemChamado({ c, agora }: { c: Chamado; agora: number }) {
  const navigate = useNavigate()
  return (
    // Clique na linha é atalho de mouse; pelo teclado o acesso é o link do título
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <li
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a,button')) navigate(`/chamados/${c.id}`)
      }}
      className="group hover:bg-muted/50 grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b px-4 py-3.5 transition-colors last:border-0 md:grid-cols-[3.5rem_minmax(0,1fr)_9.5rem_6.5rem_8.5rem_7rem]"
    >
      <span className="text-muted-foreground hidden font-mono text-xs md:block">#{c.numero}</span>
      <div className="min-w-0">
        <Link to={`/chamados/${c.id}`} className="block truncate text-sm font-medium outline-offset-4 group-hover:text-primary">
          <span className="text-muted-foreground mr-1.5 font-mono text-xs md:hidden">#{c.numero}</span>
          {c.titulo}
        </Link>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-xs">
          {c.categoria} · {c.empresa.nome} · {tempoRelativo(c.criadoEm, agora)}
          {!!c._count?.comentarios && (
            <span className="inline-flex items-center gap-0.5">
              · <MessageSquare className="size-3" aria-hidden />
              <span className="sr-only">comentários:</span>
              {c._count.comentarios}
            </span>
          )}
        </p>
      </div>
      <div className="md:hidden">
        <SlaPill chamado={c} agora={agora} />
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-1.5 md:contents">
        <span className="md:block">
          <StatusBadge status={c.status} />
        </span>
        <span className="md:block">
          <PrioridadeBadge prioridade={c.prioridade} />
        </span>
        <span className="hidden md:block">
          <SlaPill chamado={c} agora={agora} />
        </span>
        <span className="ml-auto flex items-center gap-1.5 truncate text-xs md:ml-0">
          {c.tecnico ? (
            <>
              <UserAvatar nome={c.tecnico.nome} perfil="TECNICO" className="size-6 text-[10px]" />
              <span className="truncate">{c.tecnico.nome.split(' ')[0]}</span>
            </>
          ) : (
            <span className="text-muted-foreground italic">Sem dono</span>
          )}
        </span>
      </div>
    </li>
  )
}

export function ChamadosPage() {
  const usuario = useUsuario()
  const agora = useAgora()
  const [params, setParams] = useSearchParams()
  const vista = (params.get('vista') as Vista) ?? 'todos'
  const pagina = Number(params.get('pagina') ?? 1)
  const [busca, setBusca] = useState(params.get('busca') ?? '')
  const [status, setStatus] = useState<Status[]>([])
  const [prioridade, setPrioridade] = useState<Prioridade[]>([])
  const [tecnicoId, setTecnicoId] = useState('')
  const buscaDebounced = useDebounce(busca)
  const staff = usuario.perfil !== 'CLIENTE'
  const tecnicos = useTecnicos(usuario.perfil === 'GESTOR')

  const mudar = (chave: string, valor: string | null) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(chave, valor)
    else p.delete(chave)
    if (chave !== 'pagina') p.delete('pagina')
    setParams(p, { replace: true })
  }

  useEffect(() => {
    if ((params.get('busca') ?? '') !== buscaDebounced) mudar('busca', buscaDebounced || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaDebounced])

  const filtros = useMemo<FiltrosChamados>(() => {
    const f: FiltrosChamados = { busca: buscaDebounced || undefined, pagina, prioridade, status }
    if (vista === 'ativos' && !status.length) f.status = ATIVOS
    if (vista === 'meus') f.tecnicoId = usuario.id
    if (vista === 'sem-dono') f.tecnicoId = 'nenhum'
    if (vista === 'estourados') f.slaEstourado = true
    if (tecnicoId && vista !== 'meus' && vista !== 'sem-dono') f.tecnicoId = tecnicoId
    return f
  }, [buscaDebounced, pagina, prioridade, status, vista, tecnicoId, usuario.id])

  const { data, isPending, isFetching } = useChamados(filtros)
  const temFiltro = !!(busca || status.length || prioridade.length || tecnicoId)
  const limpar = () => {
    setBusca('')
    setStatus([])
    setPrioridade([])
    setTecnicoId('')
  }

  const VISTAS: { id: Vista; rotulo: string; mostrar: boolean }[] = [
    { id: 'todos', rotulo: 'Todos', mostrar: true },
    { id: 'ativos', rotulo: 'Em andamento', mostrar: true },
    { id: 'meus', rotulo: 'Meus', mostrar: staff },
    { id: 'sem-dono', rotulo: 'Fila sem dono', mostrar: staff },
    { id: 'estourados', rotulo: 'SLA estourado', mostrar: true },
  ]

  const descricao = {
    CLIENTE: `Chamados da ${usuario.empresa?.nome ?? 'sua empresa'}`,
    TECNICO: 'Seus chamados e a fila sem dono',
    GESTOR: 'Todos os chamados de todas as empresas',
  }[usuario.perfil]

  const total = data?.total ?? 0
  const porPagina = data?.porPagina ?? 15
  const ultimaPagina = Math.max(1, Math.ceil(total / porPagina))

  return (
    <div className="pb-10">
      <Cabecalho
        titulo="Chamados"
        descricao={descricao}
        acoes={
          usuario.perfil !== 'TECNICO' && (
            <NovoChamadoDialog>
              <Button>
                <Plus /> Novo chamado
              </Button>
            </NovoChamadoDialog>
          )
        }
      />

      <div className="space-y-3 px-4 sm:px-8">
        <div role="tablist" aria-label="Visões" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {VISTAS.filter((v) => v.mostrar).map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={vista === v.id}
              onClick={() => mudar('vista', v.id === 'todos' ? null : v.id)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                vista === v.id ? 'bg-card text-foreground shadow-soft ring-1 ring-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {v.rotulo}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título ou #número" className="h-9 pl-9" aria-label="Buscar chamados" />
          </div>
          <MultiFiltro rotulo="Status" opcoes={STATUS_ORDEM} rotulos={STATUS_LABEL} valor={status} onChange={(v) => { setStatus(v); mudar('pagina', null) }} />
          <MultiFiltro rotulo="Prioridade" opcoes={PRIORIDADE_ORDEM} rotulos={PRIORIDADE_LABEL} valor={prioridade} onChange={(v) => { setPrioridade(v); mudar('pagina', null) }} />
          {usuario.perfil === 'GESTOR' && vista !== 'meus' && vista !== 'sem-dono' && (
            <Select value={tecnicoId || 'todos'} onValueChange={(v) => { setTecnicoId(v === 'todos' ? '' : v); mudar('pagina', null) }}>
              <SelectTrigger className="w-44 data-[size=default]:h-9" aria-label="Filtrar por técnico">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os técnicos</SelectItem>
                <SelectItem value="nenhum">Sem dono</SelectItem>
                {tecnicos.data?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limpar} className="text-muted-foreground h-9">
              <X /> Limpar
            </Button>
          )}
        </div>

        <div className={cn('bg-card shadow-soft overflow-hidden rounded-xl border transition-opacity', isFetching && !isPending && 'opacity-70')}>
          <div className="text-muted-foreground hidden grid-cols-[3.5rem_minmax(0,1fr)_9.5rem_6.5rem_8.5rem_7rem] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium md:grid">
            <span>#</span>
            <span>Chamado</span>
            <span>Status</span>
            <span>Prioridade</span>
            <span>SLA</span>
            <span>Responsável</span>
          </div>
          {isPending ? (
            Array.from({ length: 6 }, (_, i) => <LinhaSkeleton key={i} />)
          ) : data && data.itens.length > 0 ? (
            <ul>
              {data.itens.map((c) => (
                <ItemChamado key={c.id} c={c} agora={agora} />
              ))}
            </ul>
          ) : (
            <EmptyState
              titulo={temFiltro || vista !== 'todos' ? 'Nada por aqui com esses filtros' : 'Nenhum chamado ainda'}
              descricao={temFiltro || vista !== 'todos' ? 'Tente outra visão ou limpe os filtros.' : 'Quando um chamado for aberto, ele aparece nesta lista.'}
              acao={
                temFiltro ? (
                  <Button variant="outline" onClick={limpar}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>

        {total > 0 && (
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span className="tabular-nums">
              {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, total)} de {total}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" aria-label="Página anterior" disabled={pagina <= 1} onClick={() => mudar('pagina', String(pagina - 1))}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon-sm" aria-label="Próxima página" disabled={pagina >= ultimaPagina} onClick={() => mudar('pagina', String(pagina + 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
