import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Perfil, StatusChamado } from '../generated/prisma/enums';

/**
 * Mapa único do ciclo de vida: status atual → status permitidos → perfis que podem.
 * Qualquer par que não está aqui é recusado com 422.
 */
export const TRANSICOES: Record<
  StatusChamado,
  Partial<Record<StatusChamado, readonly Perfil[]>>
> = {
  ABERTO: {
    EM_ATENDIMENTO: ['TECNICO', 'GESTOR'],
    CANCELADO: ['CLIENTE', 'GESTOR'],
  },
  EM_ATENDIMENTO: {
    RESOLVIDO: ['TECNICO', 'GESTOR'],
    AGUARDANDO_CLIENTE: ['TECNICO', 'GESTOR'],
  },
  AGUARDANDO_CLIENTE: {
    EM_ATENDIMENTO: ['CLIENTE', 'TECNICO', 'GESTOR'],
  },
  RESOLVIDO: {
    FECHADO: ['CLIENTE', 'GESTOR'],
    EM_ATENDIMENTO: ['CLIENTE', 'TECNICO', 'GESTOR'],
  },
  FECHADO: {},
  CANCELADO: {},
};

export function proximosStatus(de: StatusChamado): StatusChamado[] {
  return Object.keys(TRANSICOES[de]) as StatusChamado[];
}

export function transicaoExiste(de: StatusChamado, para: StatusChamado) {
  return TRANSICOES[de][para] !== undefined;
}

/** Lança 422 se a transição não existe e 403 se o perfil não pode fazê-la. */
export function validarTransicao(
  de: StatusChamado,
  para: StatusChamado,
  perfil: Perfil,
): void {
  const perfis = TRANSICOES[de][para];
  if (!perfis) {
    throw new UnprocessableEntityException(
      `Transição inválida: ${de} → ${para}`,
    );
  }
  if (!perfis.includes(perfil)) {
    throw new ForbiddenException(
      `Perfil ${perfil} não pode mudar ${de} → ${para}`,
    );
  }
}
