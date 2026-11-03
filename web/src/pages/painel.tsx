import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock, Flame, Gauge, Inbox, MessageSquareReply, Table2, LineChart as IconeGrafico } from 'lucide-react'
import { useMetricas } from '@/hooks/queries'
import { formatarDia, formatarDuracao, STATUS_LABEL, STATUS_ORDEM } from '@/lib/format'
import type { Metricas } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cabecalho } from '@/components/app-shell'
import { StatusBadge } from '@/components/badges'
import { EmptyState } from '@/components/empty-state'
import { UserAvatar } from '@/components/user-avatar'
import { Skeleton } from '@/components/ui/skeleton'

const PERIODOS = [7, 30, 90]

function Stat({
  rotulo,
  valor,
  detalhe,
  Icone,
  tom = 'neutro',
}: {
  rotulo: string
  valor: ReactNode
  detalhe?: ReactNode
  Icone: typeof Inbox
  tom?: 'neutro' | 'bom' | 'alerta' | 'critico'
}) {
  const tons = {
    neutro: 'bg-brand-soft text-brand-fg',
    bom: 'bg-success-soft text-success-fg',
    alerta: 'bg-warning-soft text-warning-fg',
    critico: 'bg-danger-soft text-danger-fg',
  }
  return (
    <div className="bg-card shadow-soft hover:shadow-lift rounded-xl border p-4 transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{rotulo}</span>
        <span className={cn('inline-flex size-8 items-center justify-center rounded-lg', tons[tom])}>
          <Icone className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{valor}</p>
      {detalhe && <p className="text-muted-foreground mt-1 text-xs">{detalhe}</p>}
    </div>
  )
}

const SERIES = [
  { chave: 'abertos', nome: 'Abertos', cor: 'var(--chart-1)' },
  { chave: 'resolvidos', nome: 'Resolvidos', cor: 'var(--chart-2)' },
] as const

function DicaGrafico({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="bg-popover text-popover-foreground shadow-lift rounded-lg border px-3 py-2 text-xs">
      <p className="mb-1 font-medium">{formatarDia(label)}</p>
      {SERIES.map((s) => (
        <p key={s.chave} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: s.cor }} />
          <span className="text-muted-foreground">{s.nome}</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">{payload.find((p) => p.dataKey === s.chave)?.value ?? 0}</span>
        </p>
      ))}
    </div>
  )
}

function GraficoDiario({ dados }: { dados: Metricas['porDia'] }) {
  const [tabela, setTabela] = useState(false)
  return (
    <section aria-labelledby="titulo-serie" className="bg-card shadow-soft rounded-xl border p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-serie" className="text-sm font-semibold">Abertos × resolvidos por dia</h2>
          <div className="text-muted-foreground mt-1.5 flex gap-4 text-xs" aria-hidden={tabela}>
            {SERIES.map((s) => (
              <span key={s.chave} className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.cor }} />
                {s.nome}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTabela((t) => !t)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
        >
          {tabela ? <IconeGrafico className="size-3.5" /> : <Table2 className="size-3.5" />}
          {tabela ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>
      {tabela ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground bg-card sticky top-0 text-xs">
              <tr>
                <th className="py-1.5 text-left font-medium">Dia</th>
                <th className="py-1.5 text-right font-medium">Abertos</th>
                <th className="py-1.5 text-right font-medium">Resolvidos</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {dados.map((d) => (
                <tr key={d.dia} className="border-t">
                  <td className="py-1.5">{formatarDia(d.dia)}</td>
                  <td className="py-1.5 text-right">{d.abertos}</td>
                  <td className="py-1.5 text-right">{d.resolvidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64" role="img" aria-label="Gráfico de linhas com chamados abertos e resolvidos por dia">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="dia"
                tickFormatter={formatarDia}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
              <Tooltip content={<DicaGrafico />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
              {SERIES.map((s) => (
                <Line
                  key={s.chave}
                  type="linear"
                  dataKey={s.chave}
                  name={s.nome}
                  stroke={s.cor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                  isAnimationActive
                  animationDuration={600}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

function PorStatus({ porStatus, total }: { porStatus: Metricas['porStatus']; total: number }) {
  const max = Math.max(1, ...Object.values(porStatus))
  return (
    <section aria-labelledby="titulo-status" className="bg-card shadow-soft rounded-xl border p-4 sm:p-5">
      <h2 id="titulo-status" className="mb-4 text-sm font-semibold">Chamados por status</h2>
      <ul className="space-y-3">
        {STATUS_ORDEM.map((s) => (
          <li key={s} className="grid grid-cols-[9.5rem_1fr_2.5rem] items-center gap-3">
            <StatusBadge status={s} className="justify-self-start" />
            <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
              <div className="bg-primary/80 h-full rounded-full transition-[width] duration-700" style={{ width: `${(porStatus[s] / max) * 100}%` }} />
            </div>
            <span className="text-right text-sm font-medium tabular-nums">
              {porStatus[s]}
              <span className="sr-only"> de {total} ({STATUS_LABEL[s]})</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function PorTecnico({ dados }: { dados: Metricas['porTecnico'] }) {
  return (
    <section aria-labelledby="titulo-tecnicos" className="bg-card shadow-soft overflow-hidden rounded-xl border">
      <h2 id="titulo-tecnicos" className="px-4 pt-4 pb-3 text-sm font-semibold sm:px-5">Desempenho por técnico</h2>
      {dados.length === 0 ? (
        <p className="text-muted-foreground px-5 pb-5 text-sm">Nenhum chamado atribuído no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground bg-muted/40 text-xs">
              <tr>
                <th className="px-4 py-2 text-left font-medium sm:px-5">Técnico</th>
                <th className="px-3 py-2 text-right font-medium">Atribuídos</th>
                <th className="px-3 py-2 text-right font-medium">Resolvidos</th>
                <th className="px-4 py-2 text-right font-medium sm:px-5">SLA estourado</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {dados.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="flex items-center gap-2">
                      <UserAvatar nome={t.nome} perfil="TECNICO" className="size-6 text-[10px]" />
                      {t.nome}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">{t.total}</td>
                  <td className="px-3 py-2.5 text-right">{t.resolvidos}</td>
                  <td className="px-4 py-2.5 text-right sm:px-5">
                    <span className={cn('inline-flex items-center gap-1', t.estourados > 0 && 'text-danger-fg')}>
                      {t.estourados > 0 && <Flame className="size-3.5" aria-hidden />}
                      {t.estourados}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function PainelPage() {
  const [dias, setDias] = useState(30)
  const { data: m, isPending, isFetching } = useMetricas(dias)
  const pct = m?.percentualDentroSla

  return (
    <div className="pb-12">
      <Cabecalho
        titulo="Painel"
        descricao="Saúde do atendimento e cumprimento do SLA"
        acoes={
          <div role="radiogroup" aria-label="Período" className="bg-muted inline-flex rounded-lg p-0.5">
            {PERIODOS.map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={dias === p}
                onClick={() => setDias(p)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  dias === p ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p} dias
              </button>
            ))}
          </div>
        }
      />
      <div className={cn('space-y-5 px-4 transition-opacity sm:px-8', isFetching && !isPending && 'opacity-70')}>
        {isPending || !m ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-[118px] rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-80 rounded-xl" />
          </>
        ) : m.total === 0 ? (
          <EmptyState titulo="Sem chamados no período" descricao="Escolha um período maior para ver as métricas." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Stat rotulo="Chamados no período" valor={m.total} Icone={Inbox} detalhe={`Últimos ${dias} dias`} />
              <Stat
                rotulo="Dentro do SLA"
                valor={pct === null || pct === undefined ? '—' : `${pct.toLocaleString('pt-BR')}%`}
                detalhe="Entre resolvidos e fechados"
                Icone={Gauge}
                tom={pct === null || pct === undefined ? 'neutro' : pct >= 90 ? 'bom' : pct >= 70 ? 'alerta' : 'critico'}
              />
              <Stat rotulo="1ª resposta média" valor={m.tempoMedioRespostaMin === null ? '—' : formatarDuracao(m.tempoMedioRespostaMin)} Icone={MessageSquareReply} />
              <Stat rotulo="Resolução média" valor={m.tempoMedioResolucaoMin === null ? '—' : formatarDuracao(m.tempoMedioResolucaoMin)} detalhe="Sem o tempo aguardando cliente" Icone={Clock} />
              <Stat
                rotulo="Estourados em aberto"
                valor={m.estouradosEmAberto}
                detalhe={
                  m.estouradosEmAberto > 0 ? (
                    <Link to="/chamados?vista=estourados" className="text-primary hover:underline">
                      Ver chamados
                    </Link>
                  ) : (
                    'Nenhum atrasado agora'
                  )
                }
                Icone={Flame}
                tom={m.estouradosEmAberto > 0 ? 'critico' : 'bom'}
              />
            </div>
            <GraficoDiario dados={m.porDia} />
            <div className="grid gap-5 xl:grid-cols-2">
              <PorStatus porStatus={m.porStatus} total={m.total} />
              <PorTecnico dados={m.porTecnico} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
