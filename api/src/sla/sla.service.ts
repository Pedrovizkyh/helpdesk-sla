import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Prioridade } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { TipoVencimento } from './calculo-sla';
import { AtualizarPoliticaDto } from './dto/atualizar-politica.dto';

@Injectable()
export class SlaService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(SlaService.name) private readonly logger: PinoLogger,
  ) {}

  listarPoliticas() {
    return this.prisma.politicaSla.findMany({ orderBy: { prioridade: 'asc' } });
  }

  async politicaDe(prioridade: Prioridade) {
    const politica = await this.prisma.politicaSla.findUnique({
      where: { prioridade },
    });
    if (!politica) {
      throw new BadRequestException(`Sem política de SLA para ${prioridade}`);
    }
    return politica;
  }

  async atualizarPolitica(prioridade: Prioridade, dto: AtualizarPoliticaDto) {
    if (dto.minutosResposta >= dto.minutosResolucao) {
      throw new BadRequestException(
        'O prazo de resposta precisa ser menor que o de resolução',
      );
    }
    const { minutosResposta, minutosResolucao } = dto;
    const politica = await this.prisma.politicaSla.upsert({
      where: { prioridade },
      create: { prioridade, minutosResposta, minutosResolucao },
      update: { minutosResposta, minutosResolucao },
    });
    this.logger.info(
      { prioridade, minutosResposta, minutosResolucao },
      'política de SLA atualizada',
    );
    return politica;
  }

  /**
   * Marca o SLA como estourado uma única vez (idempotente) e registra no histórico.
   * Retorna true só para quem de fato marcou.
   */
  async marcarEstourado(
    chamadoId: string,
    tipo: TipoVencimento,
    agora: Date,
  ): Promise<boolean> {
    const marcou = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.chamado.updateMany({
        where: { id: chamadoId, slaEstourado: false },
        data: { slaEstourado: true },
      });
      if (count === 0) return false;
      await tx.eventoHistorico.create({
        data: {
          chamadoId,
          tipo: 'SLA_ESTOURADO',
          valorNovo: tipo,
          criadoEm: agora,
        },
      });
      return true;
    });
    if (marcou) {
      this.logger.warn({ chamadoId, tipo }, 'SLA estourado');
    }
    return marcou;
  }
}
