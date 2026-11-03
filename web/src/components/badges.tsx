import {
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CircleSlash,
  Clock4,
  Lock,
  OctagonAlert,
} from 'lucide-react'
import { PRIORIDADE_LABEL, STATUS_LABEL } from '@/lib/format'
import type { Prioridade, Status } from '@/lib/types'
import { cn } from '@/lib/utils'

const TOM_STATUS: Record<Status, { classe: string; Icone: typeof CircleDot }> = {
  ABERTO: { classe: 'bg-info-soft text-info-fg ring-info/25', Icone: CircleDashed },
  EM_ATENDIMENTO: { classe: 'bg-brand-soft text-brand-fg ring-primary/25', Icone: CircleDot },
  AGUARDANDO_CLIENTE: { classe: 'bg-warning-soft text-warning-fg ring-warning/30', Icone: Clock4 },
  RESOLVIDO: { classe: 'bg-success-soft text-success-fg ring-success/25', Icone: CheckCircle2 },
  FECHADO: { classe: 'bg-neutral-soft text-neutral-fg ring-foreground/10', Icone: Lock },
  CANCELADO: { classe: 'bg-neutral-soft text-neutral-fg ring-foreground/10 line-through decoration-1', Icone: CircleSlash },
}

const pill =
  'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset'

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { classe, Icone } = TOM_STATUS[status]
  return (
    <span className={cn(pill, classe, className)}>
      <Icone className="size-3.5 shrink-0" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}

const TOM_PRIORIDADE: Record<Prioridade, string> = {
  CRITICA: 'bg-danger-soft text-danger-fg ring-danger/25',
  ALTA: 'bg-orange-soft text-orange-fg ring-orange/25',
  MEDIA: 'bg-info-soft text-info-fg ring-info/20',
  BAIXA: 'bg-neutral-soft text-neutral-fg ring-foreground/10',
}
const BARRAS: Record<Prioridade, number> = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 }

/** Ícone de barras (estilo sinal) que repete a prioridade sem depender só da cor. */
export function IconePrioridade({ prioridade, className }: { prioridade: Prioridade; className?: string }) {
  if (prioridade === 'CRITICA') return <OctagonAlert className={cn('size-3.5', className)} aria-hidden />
  const n = BARRAS[prioridade]
  return (
    <svg viewBox="0 0 14 14" className={cn('size-3.5', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1 + i * 4.5}
          y={9 - i * 3.5}
          width="3"
          height={4 + i * 3.5}
          rx="1"
          fill="currentColor"
          opacity={i < n ? 1 : 0.25}
        />
      ))}
    </svg>
  )
}

export function PrioridadeBadge({ prioridade, className }: { prioridade: Prioridade; className?: string }) {
  return (
    <span className={cn(pill, TOM_PRIORIDADE[prioridade], className)}>
      <IconePrioridade prioridade={prioridade} />
      {PRIORIDADE_LABEL[prioridade]}
    </span>
  )
}
