import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import type { UsuarioLogado } from '../auth/usuario-logado';

/**
 * Filtro de visibilidade aplicado em TODA query de chamados.
 * Cliente: só da própria empresa. Técnico: atribuídos a ele ou na fila sem dono (abertos). Gestor: todos.
 */
export function escopoChamados(u: UsuarioLogado): Prisma.ChamadoWhereInput {
  switch (u.perfil) {
    case 'CLIENTE':
      if (!u.empresaId) throw new ForbiddenException('Cliente sem empresa');
      return { empresaId: u.empresaId };
    case 'TECNICO':
      return {
        OR: [{ tecnicoId: u.id }, { tecnicoId: null, status: 'ABERTO' }],
      };
    case 'GESTOR':
      return {};
  }
}

/** Cliente nunca recebe notas internas nem eventos que as revelem. */
export function filtroComentarios(
  u: UsuarioLogado,
): Prisma.ComentarioWhereInput {
  return u.perfil === 'CLIENTE' ? { interno: false } : {};
}

export function filtroEventos(
  u: UsuarioLogado,
): Prisma.EventoHistoricoWhereInput {
  return u.perfil === 'CLIENTE' ? { tipo: { not: 'NOTA_INTERNA' } } : {};
}
