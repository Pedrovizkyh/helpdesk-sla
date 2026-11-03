import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Relogio } from '../common/relogio';
import { agregarMetricas } from './agregar';
import { PeriodoDto } from './dto/periodo.dto';

const DIA = 86_400_000;

@Injectable()
export class MetricasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relogio: Relogio,
  ) {}

  async calcular(p: PeriodoDto) {
    const agora = this.relogio.agora();
    const ate = p.ate ? fimDoDia(new Date(p.ate)) : agora;
    const de = p.de ? new Date(p.de) : new Date(ate.getTime() - 30 * DIA);
    if (de > ate)
      throw new BadRequestException('"de" precisa ser antes de "ate"');
    if (ate.getTime() - de.getTime() > 366 * DIA) {
      throw new BadRequestException('Período máximo de 1 ano');
    }

    const linhas = await this.prisma.chamado.findMany({
      where: { criadoEm: { gte: de, lte: ate } },
      select: {
        status: true,
        prioridade: true,
        criadoEm: true,
        respondidoEm: true,
        resolvidoEm: true,
        minutosPausados: true,
        slaEstourado: true,
        tecnico: { select: { id: true, nome: true } },
      },
    });
    return agregarMetricas(linhas, de, ate);
  }
}

function fimDoDia(d: Date) {
  // datas sem hora (YYYY-MM-DD) incluem o dia inteiro
  return new Date(d.getTime() + DIA - 1);
}
