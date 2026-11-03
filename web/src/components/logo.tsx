import { useId } from 'react'
import { cn } from '@/lib/utils'

export function LogoMarca({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.62 0.2 285)" />
          <stop offset="1" stopColor="oklch(0.5 0.22 265)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="2.5" />
      <path d="M16 7.5a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 11.5V16l3 2" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMarca />
      <span className="text-[15px] font-semibold tracking-tight">
        Helpdesk<span className="text-muted-foreground font-normal"> SLA</span>
      </span>
    </div>
  )
}
