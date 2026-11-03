import { iniciais } from '@/lib/format'
import type { Perfil } from '@/lib/types'
import { cn } from '@/lib/utils'

const TOM: Record<Perfil, string> = {
  CLIENTE: 'bg-info-soft text-info-fg',
  TECNICO: 'bg-brand-soft text-brand-fg',
  GESTOR: 'bg-success-soft text-success-fg',
}

export function UserAvatar({ nome, perfil, className }: { nome: string; perfil: Perfil; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-background select-none',
        TOM[perfil],
        className,
      )}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  )
}
