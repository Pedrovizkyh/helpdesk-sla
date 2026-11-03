import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { Relogio } from '../common/relogio';
import { prazoVencido } from './calculo-sla';
import { SlaService } from './sla.service';

@Injectable()
export class VerificacaoSlaService {
  private rodando = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly relogio: Relogio,
    private readonly sla: SlaService,
    @InjectPinoLogger(VerificacaoSlaService.name)
    private readonly logger: PinoLogger,
  ) {}

  /** Só dispara se o ScheduleModule estiver ligado (RUN_SCHEDULER=true). */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'verificar-sla' })
  async executarAgendado() {
    if (this.rodando) return;
    this.rodando = true;
    try {
      await this.verificar();
    } catch (erro) {
      this.logger.error({ err: erro }, 'falha na verificação de SLA');
    } finally {
      this.rodando = false;
    }
  }

  /** Busca chamados vencidos ainda não marcados e marca cada um. */
  async verificar(): Promise<number> {
    const agora = this.relogio.agora();
    const candidatos = await this.prisma.chamado.findMany({
      where: {
        slaEstourado: false,
        status: { in: ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE'] },
        OR: [
          { respondidoEm: null, venceRespostaEm: { lt: agora } },
          {
            status: { not: 'AGUARDANDO_CLIENTE' },
            venceResolucaoEm: { lt: agora },
          },
        ],
      },
      orderBy: { venceResolucaoEm: 'asc' },
      take: 500,
    });

    let marcados = 0;
    for (const chamado of candidatos) {
      const tipo = prazoVencido(chamado, agora);
      if (tipo && (await this.sla.marcarEstourado(chamado.id, tipo, agora))) {
        marcados++;
      }
    }
    this.logger.info(
      { candidatos: candidatos.length, marcados },
      'verificação de SLA concluída',
    );
    return marcados;
  }
}
