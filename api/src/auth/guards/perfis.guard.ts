import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Perfil } from '../../generated/prisma/enums';
import { PERFIS_KEY } from '../decorators/perfis.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { UsuarioLogado } from '../usuario-logado';

@Injectable()
export class PerfisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const alvos = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, alvos)) {
      return true;
    }
    const perfis = this.reflector.getAllAndOverride<Perfil[] | undefined>(
      PERFIS_KEY,
      alvos,
    );
    if (!perfis || perfis.length === 0) return true;

    const usuario = context
      .switchToHttp()
      .getRequest<{ user?: UsuarioLogado }>().user;
    if (!usuario || !perfis.includes(usuario.perfil)) {
      throw new ForbiddenException('Seu perfil não tem acesso a este recurso');
    }
    return true;
  }
}
