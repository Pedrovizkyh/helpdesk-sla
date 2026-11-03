import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'

export function NaoEncontradoPage() {
  return (
    <EmptyState
      className="min-h-[70dvh]"
      titulo="Página não encontrada"
      descricao="O endereço não existe ou você não tem acesso a ele."
      acao={
        <Button asChild>
          <Link to="/chamados">Voltar para os chamados</Link>
        </Button>
      }
    />
  )
}
