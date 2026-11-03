import { useState } from 'react'
import { Info, Loader2, RotateCcw, Save } from 'lucide-react'
import { usePoliticas, useSalvarPolitica } from '@/hooks/queries'
import { formatarDuracao, PRIORIDADE_LABEL } from '@/lib/format'
import type { Politica } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cabecalho } from '@/components/app-shell'
import { IconePrioridade } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const TOM = {
  CRITICA: 'bg-danger-soft text-danger-fg',
  ALTA: 'bg-orange-soft text-orange-fg',
  MEDIA: 'bg-info-soft text-info-fg',
  BAIXA: 'bg-neutral-soft text-neutral-fg',
}

/** Edição em horas + minutos para não obrigar o gestor a fazer conta. */
function CampoDuracao({ id, rotulo, minutos, onChange }: { id: string; rotulo: string; minutos: number; onChange: (m: number) => void }) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{rotulo}</legend>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Label htmlFor={`${id}-h`} className="sr-only">Horas</Label>
          <Input id={`${id}-h`} type="number" min={0} max={1440} value={h} onChange={(e) => onChange(Math.max(0, Number(e.target.value)) * 60 + m)} className="pr-8 tabular-nums" />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">h</span>
        </div>
        <div className="relative flex-1">
          <Label htmlFor={`${id}-m`} className="sr-only">Minutos</Label>
          <Input id={`${id}-m`} type="number" min={0} max={59} step={5} value={m} onChange={(e) => onChange(h * 60 + Math.min(59, Math.max(0, Number(e.target.value))))} className="pr-10 tabular-nums" />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">min</span>
        </div>
      </div>
    </fieldset>
  )
}

function CartaoPolitica({ p }: { p: Politica }) {
  const [resp, setResp] = useState(p.minutosResposta)
  const [resol, setResol] = useState(p.minutosResolucao)
  const salvar = useSalvarPolitica()

  const alterado = resp !== p.minutosResposta || resol !== p.minutosResolucao
  const invalido = resp < 5 || resol < 15 || resp >= resol

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        salvar.mutate({ prioridade: p.prioridade, minutosResposta: resp, minutosResolucao: resol })
      }}
      className={cn('bg-card shadow-soft space-y-4 rounded-xl border p-5 transition-shadow', alterado && 'ring-primary/40 ring-2')}
    >
      <div className="flex items-center gap-3">
        <span className={cn('inline-flex size-9 items-center justify-center rounded-lg', TOM[p.prioridade])}>
          <IconePrioridade prioridade={p.prioridade} className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold">{PRIORIDADE_LABEL[p.prioridade]}</h2>
          <p className="text-muted-foreground text-xs">
            Hoje: {formatarDuracao(p.minutosResposta)} para responder · {formatarDuracao(p.minutosResolucao)} para resolver
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoDuracao id={`${p.prioridade}-resp`} rotulo="Primeira resposta" minutos={resp} onChange={setResp} />
        <CampoDuracao id={`${p.prioridade}-resol`} rotulo="Resolução" minutos={resol} onChange={setResol} />
      </div>
      {invalido && alterado && (
        <p className="text-danger-fg text-xs" role="alert">
          A resposta precisa ter ao menos 5 min e ser menor que a resolução (mínimo 15 min).
        </p>
      )}
      <div className="flex justify-end gap-2">
        {alterado && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setResp(p.minutosResposta); setResol(p.minutosResolucao) }}>
            <RotateCcw /> Desfazer
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!alterado || invalido || salvar.isPending}>
          {salvar.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Salvar
        </Button>
      </div>
    </form>
  )
}

export function PoliticasPage() {
  const { data, isPending } = usePoliticas()
  return (
    <div className="pb-12">
      <Cabecalho titulo="Políticas de SLA" descricao="Prazos por prioridade, contados a partir da abertura do chamado" />
      <div className="space-y-5 px-4 sm:px-8">
        <div className="bg-info-soft text-info-fg flex gap-3 rounded-xl p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Mudanças valem só para chamados abertos daqui em diante: os prazos ficam gravados em cada chamado na abertura.
            O prazo de resolução pausa enquanto o chamado aguarda o cliente.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {isPending
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)
            : data?.map((p) => <CartaoPolitica key={`${p.id}-${p.minutosResposta}-${p.minutosResolucao}`} p={p} />)}
        </div>
      </div>
    </div>
  )
}
