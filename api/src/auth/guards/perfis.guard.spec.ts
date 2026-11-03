import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfisGuard } from './perfis.guard';
import { PERFIS_KEY } from '../decorators/perfis.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { UsuarioLogado } from '../usuario-logado';

function contexto(
  metadados: Record<string, unknown>,
  user?: UsuarioLogado,
): ExecutionContext {
  const handler = () => undefined;
  for (const [k, v] of Object.entries(metadados)) {
    Reflect.defineMetadata(k, v, handler);
  }
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const cliente: UsuarioLogado = { id: '1', perfil: 'CLIENTE', empresaId: 'e1' };
const gestor: UsuarioLogado = { id: '2', perfil: 'GESTOR', empresaId: null };

describe('PerfisGuard', () => {
  const guard = new PerfisGuard(new Reflector());

  it('libera rota sem @Perfis()', () => {
    expect(guard.canActivate(contexto({}, cliente))).toBe(true);
  });

  it('libera quando o perfil está na lista', () => {
    const ctx = contexto({ [PERFIS_KEY]: ['GESTOR', 'TECNICO'] }, gestor);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bloqueia com 403 quando o perfil não está na lista', () => {
    const ctx = contexto({ [PERFIS_KEY]: ['GESTOR'] }, cliente);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('bloqueia quando não há usuário na requisição', () => {
    const ctx = contexto({ [PERFIS_KEY]: ['GESTOR'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('libera rota @Public() mesmo com @Perfis()', () => {
    const ctx = contexto({ [IS_PUBLIC_KEY]: true, [PERFIS_KEY]: ['GESTOR'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
