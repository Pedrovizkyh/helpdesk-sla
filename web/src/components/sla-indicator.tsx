import { AlarmClock, CheckCircle2, CirclePause, Flame, Timer } from 'lucide-react'
import { formatarDataHora, formatarDuracao } from '@/lib/format'
import { estadoPrazo, slaPrincipal, type EstadoSla, type InfoSla } from '@/lib/sla'
import type { Chamado } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const ESTILO: Record<EstadoSla, { classe: string; barra: string; Icone: typeof Timer; rotulo: string }> = {
  'no-prazo': { classe: 'text-success-fg bg-success-soft ring-success/25', barra: 'bg-success', Icone: Timer, rotulo: 'No prazo' },
  perto: { classe: 'text-warning-fg bg-warning-soft ring-warning/35', barra: 'bg-warning', Icone: AlarmClock, rotulo: 'Perto de vencer' },
  estourado: { classe: 'text-danger-fg bg-danger-soft ring-danger/30', barra: 'bg-danger', Icone: Flame, rotulo: 'Estourado' },
  pausado: { classe: 'text-neutral-fg bg-neutral-soft ring-foreground/10', barra: 'bg-muted-foreground/50', Icone: CirclePause, rotulo: 'Pausado' },
  cumprido: { classe: 'text-success-fg bg-success-soft ring-success/25', barra: 'bg-success', Icone: CheckCircle2, rotulo: 'Cumprido' },
  nenhum: { classe: 'text-muted-foreground bg-muted ring-transparent', barra: 'bg-muted', Icone: Timer, rotulo: '—' },
}

function textoCurto(info: InfoSla) {
  switch (info.estado) {
    case 'no-prazo':
    case 'perto':
      return formatarDuracao(info.restanteMin)
    case 'estourado':
      return info.alvo && info.restanteMin < 0 ? `há ${formatarDuracao(-info.restanteMin)}` : 'Estourado'
    case 'pausado':
      return 'Pausado'
    case 'cumprido':
      return 'Cumprido'
    default:
      return '—'
  }
}

const NOME_ALVO = { resposta: 'Resposta', resolucao: 'Resolução' }

/** Versão compacta para a lista: pílula com ícone, cor e tempo restante. */
export function SlaPill({ chamado, agora }: { chamado: Chamado; agora: number }) {
  const info = slaPrincipal(chamado, agora)
  const e = ESTILO[info.estado]
  if (info.estado === 'nenhum') return <span className="text-muted-foreground text-xs">—</span>
  const descricao = `${e.rotulo}${info.alvo ? ` · ${NOME_ALVO[info.alvo]}` : ''}${
    info.vence ? ` · vence ${formatarDataHora(info.vence.toISOString())}` : ''
  }`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`SLA: ${descricao}`}
          className={cn(
            'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium tabular-nums ring-1 ring-inset whitespace-nowrap',
            e.classe,
            info.estado === 'estourado' && 'animate-[pulse_2.4s_ease-in-out_infinite]',
          )}
        >
          <e.Icone className="size-3.5" aria-hidden />
          {info.alvo && <span className="opacity-70 font-normal">{NOME_ALVO[info.alvo].slice(0, 4)}.</span>}
          {textoCurto(info)}
        </button>
      </TooltipTrigger>
      <TooltipContent>{descricao}</TooltipContent>
    </Tooltip>
  )
}

/** Versão detalhada: um bloco por prazo, com barra de progresso. */
export function SlaDetalhe({ chamado, agora }: { chamado: Chamado; agora: number }) {
  return (
    <div className="space-y-4">
      {(['resposta', 'resolucao'] as const).map((alvo) => {
        let info = estadoPrazo(chamado, alvo, agora)
        if (alvo === 'resolucao' && chamado.slaEstourado && chamado.respondidoEm && info.estado !== 'pausado' && info.estado !== 'nenhum' && !chamado.resolvidoEm) {
          info = { ...info, estado: info.restanteMin <= 0 ? 'estourado' : info.estado }
        }
        const e = ESTILO[info.estado]
        const pct = Math.round(info.consumido * 100)
        return (
          <div key={alvo}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {alvo === 'resposta' ? 'Primeira resposta' : 'Resolução'}
              </span>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ring-1 ring-inset', e.classe)}>
                <e.Icone className="size-3" aria-hidden />
                {info.estado === 'no-prazo' || info.estado === 'perto'
                  ? `${formatarDuracao(info.restanteMin)} restantes`
                  : info.estado === 'estourado' && info.restanteMin < 0 && !(alvo === 'resposta' ? chamado.respondidoEm : chamado.resolvidoEm)
                    ? `Estourado há ${formatarDuracao(-info.restanteMin)}`
                    : e.rotulo}
              </span>
            </div>
            <div
              className="bg-muted h-1.5 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tempo consumido do prazo de ${alvo === 'resposta' ? 'resposta' : 'resolução'}`}
            >
              <div className={cn('h-full rounded-full transition-[width] duration-700', e.barra)} style={{ width: `${Math.max(pct, 3)}%` }} />
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs">
              {info.estado === 'pausado'
                ? 'Relógio parado enquanto aguarda o cliente'
                : `Vence ${info.vence ? formatarDataHora(info.vence.toISOString()) : '—'}`}
            </p>
          </div>
        )
      })}
    </div>
  )
}
