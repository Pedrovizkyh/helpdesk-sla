import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { useAuth } from '@/lib/auth'
import type { Perfil } from '@/lib/types'
import { AppShell } from '@/components/app-shell'
import { LoginPage } from '@/pages/login'
import { ChamadosPage } from '@/pages/chamados'
import { ChamadoDetalhePage } from '@/pages/chamado-detalhe'
import { PoliticasPage } from '@/pages/politicas'
import { NaoEncontradoPage } from '@/pages/nao-encontrado'
import { LogoMarca } from '@/components/logo'

function Carregando() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Carregando">
      <LogoMarca className="size-10 animate-pulse" />
    </div>
  )
}

function Protegida() {
  const { usuario, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (!usuario) return <Navigate to="/login" replace />
  return <AppShell />
}

function SoPerfis({ perfis }: { perfis: Perfil[] }) {
  const { usuario } = useAuth()
  return usuario && perfis.includes(usuario.perfil) ? <Outlet /> : <Navigate to="/chamados" replace />
}

function Publica() {
  const { usuario, carregando } = useAuth()
  if (carregando) return <Carregando />
  return usuario ? <Navigate to="/chamados" replace /> : <LoginPage />
}

export const router = createBrowserRouter([
  { path: '/login', element: <Publica /> },
  {
    element: <Protegida />,
    children: [
      { index: true, element: <Navigate to="/chamados" replace /> },
      { path: '/chamados', element: <ChamadosPage /> },
      { path: '/chamados/:id', element: <ChamadoDetalhePage /> },
      {
        element: <SoPerfis perfis={['GESTOR']} />,
        children: [
          { path: '/painel', lazy: async () => ({ Component: (await import('@/pages/painel')).PainelPage }) },
          { path: '/politicas', element: <PoliticasPage /> },
        ],
      },
      { path: '*', element: <NaoEncontradoPage /> },
    ],
  },
])
