import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioLogado } from '../usuario-logado';

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioLogado =>
    ctx.switchToHttp().getRequest<{ user: UsuarioLogado }>().user,
);
