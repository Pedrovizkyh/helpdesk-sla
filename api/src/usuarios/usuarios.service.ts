import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  listarTecnicos() {
    return this.prisma.usuario.findMany({
      where: { perfil: { in: ['TECNICO', 'GESTOR'] } },
      select: { id: true, nome: true, email: true, perfil: true },
      orderBy: { nome: 'asc' },
    });
  }
}
