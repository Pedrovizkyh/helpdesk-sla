import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { BarChart3, Gauge, Inbox, LogOut, Menu, ShieldCheck } from 'lucide-react'
import { useAuth, useUsuario } from '@/lib/auth'
import { PERFIL_LABEL } from '@/lib/format'
import type { Perfil } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const NAV: { para: string; rotulo: string; Icone: typeof Inbox; perfis: Perfil[] }[] = [
  { para: '/chamados', rotulo: 'Chamados', Icone: Inbox, perfis: ['CLIENTE', 'TECNICO', 'GESTOR'] },
  { para: '/painel', rotulo: 'Painel', Icone: BarChart3, perfis: ['GESTOR'] },
  { para: '/politicas', rotulo: 'Políticas de SLA', Icone: Gauge, perfis: ['GESTOR'] },
]

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const usuario = useUsuario()
  const { sair } = useAuth()
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-6">
        <Logo />
      </div>
      <nav aria-label="Principal" className="flex-1 space-y-0.5 px-3">
        <p className="text-muted-foreground px-2 pb-2 text-[11px] font-medium tracking-wider uppercase">Espaço de trabalho</p>
        {NAV.filter((n) => n.perfis.includes(usuario.perfil)).map(({ para, rotulo, Icone }) => (
          <NavLink
            key={para}
            to={para}
            onClick={aoNavegar}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icone className={cn('size-4 transition-colors', isActive ? 'text-primary' : 'opacity-70 group-hover:opacity-100')} />
                {rotulo}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 p-3">
        <div className="bg-card shadow-soft rounded-xl border p-3">
          <div className="flex items-center gap-2.5">
            <UserAvatar nome={usuario.nome} perfil={usuario.perfil} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{usuario.nome}</p>
              <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                <ShieldCheck className="size-3" aria-hidden />
                {PERFIL_LABEL[usuario.perfil]}
                {usuario.empresa && ` · ${usuario.empresa.nome}`}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={sair} className="text-muted-foreground">
              <LogOut /> Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppShell() {
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <a href="#conteudo" className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-dvh border-r lg:block">
        <Navegacao />
      </aside>

      <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur lg:hidden">
        <Logo />
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-sidebar w-72 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Navegacao aoNavegar={() => setAberto(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main id="conteudo" key={pathname} className="animate-fade-up min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

export function Cabecalho({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string
  descricao?: string
  acoes?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="text-muted-foreground mt-1 text-sm">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}
