import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useAbrirChamado, useEmpresas, usePoliticas } from '@/hooks/queries'
import { useUsuario } from '@/lib/auth'
import { formatarDuracao, PRIORIDADE_LABEL, PRIORIDADE_ORDEM } from '@/lib/format'
import type { Prioridade } from '@/lib/types'
import { cn } from '@/lib/utils'
import { IconePrioridade } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const CATEGORIAS = ['Sistemas', 'Rede', 'Hardware', 'Acessos', 'E-mail', 'Segurança', 'Dúvida', 'Outro']
const TOM: Record<Prioridade, string> = {
  CRITICA: 'text-danger-fg',
  ALTA: 'text-orange-fg',
  MEDIA: 'text-info-fg',
  BAIXA: 'text-neutral-fg',
}

export function NovoChamadoDialog({ children }: { children: ReactNode }) {
  const usuario = useUsuario()
  const ehGestor = usuario.perfil === 'GESTOR'
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Sistemas')
  const [prioridade, setPrioridade] = useState<Prioridade>('MEDIA')
  const [empresaId, setEmpresaId] = useState('')
  const politicas = usePoliticas()
  const empresas = useEmpresas(ehGestor && aberto)
  const abrir = useAbrirChamado()
  const navigate = useNavigate()

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    abrir.mutate(
      { titulo, descricao, categoria, prioridade, empresaId: ehGestor ? empresaId : undefined },
      {
        onSuccess: (c) => {
          setAberto(false)
          setTitulo('')
          setDescricao('')
          navigate(`/chamados/${c.id}`)
        },
      },
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo chamado</DialogTitle>
          <DialogDescription>Descreva o problema. Os prazos de SLA começam a contar na abertura.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          {ehGestor && (
            <div className="space-y-1.5">
              <Label htmlFor="empresa">Empresa</Label>
              <Select value={empresaId} onValueChange={setEmpresaId} required>
                <SelectTrigger id="empresa" className="w-full">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.data?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" required minLength={5} maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Sistema de faturamento fora do ar" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" required minLength={10} maxLength={5000} rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que acontece, desde quando e quem é afetado" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="categoria" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-medium">Prioridade</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORIDADE_ORDEM.map((p) => {
                const pol = politicas.data?.find((x) => x.prioridade === p)
                return (
                  <label
                    key={p}
                    className={cn(
                      'relative flex cursor-pointer flex-col gap-1 rounded-lg border p-2.5 text-sm transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      prioridade === p ? 'border-primary bg-brand-soft/60 shadow-soft' : 'hover:bg-muted/60',
                    )}
                  >
                    <input type="radio" name="prioridade" value={p} checked={prioridade === p} onChange={() => setPrioridade(p)} className="sr-only" />
                    <span className={cn('flex items-center gap-1.5 font-medium', TOM[p])}>
                      <IconePrioridade prioridade={p} />
                      {PRIORIDADE_LABEL[p]}
                    </span>
                    {pol && (
                      <span className="text-muted-foreground text-[11px] leading-tight">
                        {formatarDuracao(pol.minutosResposta)} / {formatarDuracao(pol.minutosResolucao)}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
            <p className="text-muted-foreground text-xs">Prazo de primeira resposta / resolução.</p>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={abrir.isPending || (ehGestor && !empresaId)}>
              {abrir.isPending && <Loader2 className="animate-spin" />}
              Abrir chamado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
