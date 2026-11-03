import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Building2, Flame, Headset, Loader2, LineChart, Lock, Mail, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const SENHA_DEMO = 'demo1234'
const DEMOS = [
  { perfil: 'Gestor', email: 'gestor@helpdesk.test', descricao: 'Vê tudo, atribui, métricas e SLA', Icone: LineChart, tom: 'bg-success-soft text-success-fg' },
  { perfil: 'Técnico', email: 'tecnico@helpdesk.test', descricao: 'Atende a fila e os seus chamados', Icone: Headset, tom: 'bg-brand-soft text-brand-fg' },
  { perfil: 'Cliente', email: 'cliente@acme.test', descricao: 'Abre e acompanha os da Acme', Icone: Building2, tom: 'bg-info-soft text-info-fg' },
]

function PainelVitrine() {
  return (
    <div className="relative hidden overflow-hidden lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_20%,oklch(0.6_0.2_285/0.55),transparent),radial-gradient(50%_50%_at_80%_80%,oklch(0.55_0.18_245/0.45),transparent)] bg-[oklch(0.2_0.06_275)]" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'linear-gradient(oklch(1 0 0/.4) 1px,transparent 1px),linear-gradient(90deg,oklch(1 0 0/.4) 1px,transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-12 text-white">
        <p className="text-sm font-medium text-white/70">Atendimento com prazo garantido</p>
        <div className="mx-auto w-full max-w-md space-y-3">
          {[
            { n: 1042, t: 'Sistema de faturamento fora do ar', s: 'Vence em 4min', c: 'bg-amber-300/20 text-amber-100 ring-amber-200/30', I: Timer, d: '0ms' },
            { n: 1039, t: 'VPN não conecta para a equipe remota', s: '21h restantes', c: 'bg-emerald-300/20 text-emerald-100 ring-emerald-200/30', I: Timer, d: '120ms' },
            { n: 1031, t: 'Impressora do 2º andar com falha', s: 'Estourado há 2h', c: 'bg-rose-400/25 text-rose-100 ring-rose-200/30', I: Flame, d: '240ms' },
          ].map((x, i) => (
            <div
              key={x.n}
              style={{ animationDelay: x.d }}
              className={cn(
                'animate-fade-up flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-md',
                i === 1 && 'translate-x-6',
              )}
            >
              <span className="font-mono text-xs text-white/50">#{x.n}</span>
              <span className="flex-1 truncate text-sm font-medium">{x.t}</span>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset', x.c)}>
                <x.I className="size-3" /> {x.s}
              </span>
            </div>
          ))}
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-balance">
            Cada chamado com seu relógio. Nenhum prazo esquecido.
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/70">
            SLA por prioridade, pausa automática enquanto aguarda o cliente e alertas por e-mail quando algo estoura.
          </p>
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState<string | null>(null)

  async function fazerLogin(e: string, s: string, origem: string) {
    setEnviando(origem)
    try {
      const u = await entrar(e, s)
      toast.success(`Olá, ${u.nome.split(' ')[0]}!`)
      navigate('/chamados', { replace: true })
    } catch (erro) {
      toast.error('Não foi possível entrar', { description: (erro as Error).message })
    } finally {
      setEnviando(null)
    }
  }

  const enviar = (ev: FormEvent) => {
    ev.preventDefault()
    void fazerLogin(email, senha, 'form')
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-muted-foreground mt-1 text-sm">Acesse com sua conta ou use um perfil de demonstração.</p>

          <form onSubmit={enviar} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 pl-9" placeholder="voce@empresa.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input id="senha" type="password" autoComplete="current-password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} className="h-10 pl-9" placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" className="h-10 w-full" disabled={!!enviando}>
              {enviando === 'form' ? <Loader2 className="animate-spin" /> : null}
              Entrar
            </Button>
          </form>

          <div className="text-muted-foreground my-8 flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            Entrar como demonstração
            <span className="bg-border h-px flex-1" />
          </div>

          <div className="space-y-2">
            {DEMOS.map((d) => (
              <button
                key={d.email}
                type="button"
                disabled={!!enviando}
                onClick={() => void fazerLogin(d.email, SENHA_DEMO, d.email)}
                className="group bg-card hover:border-primary/40 hover:shadow-lift shadow-soft flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-px disabled:opacity-60"
              >
                <span className={cn('inline-flex size-9 items-center justify-center rounded-lg', d.tom)}>
                  <d.Icone className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{d.perfil}</span>
                  <span className="text-muted-foreground block truncate text-xs">{d.descricao}</span>
                </span>
                {enviando === d.email ? (
                  <Loader2 className="text-muted-foreground size-4 animate-spin" />
                ) : (
                  <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Senha de todos os perfis de demonstração: <code className="bg-muted rounded px-1 py-0.5 font-mono">{SENHA_DEMO}</code>
          </p>
        </div>
      </div>
      <PainelVitrine />
    </div>
  )
}
