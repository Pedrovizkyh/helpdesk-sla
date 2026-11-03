import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Ilustração leve: caixa de entrada com uma estrela, feita com os tokens do tema. */
function Ilustracao() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <ellipse cx="80" cy="104" rx="52" ry="6" className="fill-muted" />
      <rect x="34" y="30" width="92" height="64" rx="14" className="fill-card stroke-border" strokeWidth="2" />
      <path d="M34 66h26l6 10h28l6-10h26" className="fill-none stroke-border" strokeWidth="2" strokeLinejoin="round" />
      <rect x="50" y="42" width="44" height="6" rx="3" className="fill-muted" />
      <rect x="50" y="54" width="60" height="6" rx="3" className="fill-muted" />
      <g className="fill-primary">
        <path d="M124 14l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" opacity="0.9" />
        <circle cx="30" cy="22" r="3" opacity="0.4" />
        <circle cx="140" cy="48" r="2" opacity="0.5" />
      </g>
    </svg>
  )
}

export function EmptyState({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('animate-fade-up flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <Ilustracao />
      <h3 className="mt-4 text-base font-semibold">{titulo}</h3>
      {descricao && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}
