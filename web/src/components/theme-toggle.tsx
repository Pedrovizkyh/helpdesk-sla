import { Monitor, Moon, Sun } from 'lucide-react'
import { useTema, type Tema } from '@/lib/theme'
import { cn } from '@/lib/utils'

const OPCOES: { valor: Tema; Icone: typeof Sun; rotulo: string }[] = [
  { valor: 'light', Icone: Sun, rotulo: 'Tema claro' },
  { valor: 'dark', Icone: Moon, rotulo: 'Tema escuro' },
  { valor: 'system', Icone: Monitor, rotulo: 'Tema do sistema' },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { tema, setTema } = useTema()
  return (
    <div role="radiogroup" aria-label="Tema" className={cn('bg-muted inline-flex rounded-lg p-0.5', className)}>
      {OPCOES.map(({ valor, Icone, rotulo }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={tema === valor}
          aria-label={rotulo}
          title={rotulo}
          onClick={() => setTema(valor)}
          className={cn(
            'text-muted-foreground inline-flex size-7 items-center justify-center rounded-md transition-all',
            tema === valor ? 'bg-card text-foreground shadow-soft' : 'hover:text-foreground',
          )}
        >
          <Icone className="size-3.5" />
        </button>
      ))}
    </div>
  )
}
