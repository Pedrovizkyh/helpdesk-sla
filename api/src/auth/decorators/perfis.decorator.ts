import { SetMetadata } from '@nestjs/common';
import type { Perfil } from '../../generated/prisma/enums';

export const PERFIS_KEY = 'perfis';
/** Restringe a rota aos perfis informados. Sem o decorator, qualquer usuário logado passa. */
export const Perfis = (...perfis: Perfil[]) => SetMetadata(PERFIS_KEY, perfis);
