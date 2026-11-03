import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfis } from '../auth/decorators/perfis.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('empresas')
@ApiBearerAuth()
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly prisma: PrismaService) {}

  @Perfis('GESTOR')
  @Get()
  listar() {
    return this.prisma.empresa.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { usuarios: true, chamados: true } } },
    });
  }
}
