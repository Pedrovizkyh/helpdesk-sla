import type { Perfil } from '../generated/prisma/enums';

export interface UsuarioLogado {
  id: string;
  perfil: Perfil;
  empresaId: string | null;
}

export interface JwtPayload {
  sub: string;
  perfil: Perfil;
  empresaId: string | null;
}
