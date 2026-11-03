import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { EmailJob, FILA_EMAILS } from './constantes';
import {
  emailChamadoAberto,
  emailRespostaTecnico,
  emailSlaEstourado,
} from './templates';

/** Produtor: só coloca e-mails na fila. Quem envia é o worker. */
@Injectable()
export class NotificacoesService {
  private readonly webUrl: string;

  constructor(
    @InjectQueue(FILA_EMAILS) private readonly fila: Queue<EmailJob>,
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
    @InjectPinoLogger(NotificacoesService.name)
    private readonly logger: PinoLogger,
  ) {
    this.webUrl = config.get('WEB_URL');
  }

  async chamadoAberto(chamadoId: string) {
    const c = await this.dados(chamadoId);
    await this.enfileirar('chamado-aberto', {
      para: await this.emailsGestores(),
      chamadoId,
      ...emailChamadoAberto(c, this.webUrl),
    });
  }

  async respostaPublica(chamadoId: string, autor: string, texto: string) {
    const c = await this.dados(chamadoId);
    await this.enfileirar('resposta-tecnico', {
      para: [c.emailSolicitante],
      chamadoId,
      ...emailRespostaTecnico(c, autor, texto, this.webUrl),
    });
  }

  async slaEstourado(chamadoId: string, tipo: 'resposta' | 'resolucao') {
    const c = await this.dados(chamadoId);
    await this.enfileirar('sla-estourado', {
      para: await this.emailsGestores(),
      chamadoId,
      ...emailSlaEstourado(c, tipo, this.webUrl),
    });
  }

  /** Falha ao enfileirar nunca derruba a requisição: só registra no log. */
  private async enfileirar(nome: string, job: EmailJob) {
    if (job.para.length === 0) return;
    try {
      const criado = await this.fila.add(nome, job);
      this.logger.info(
        { chamadoId: job.chamadoId, jobId: criado.id, tipo: nome },
        'e-mail enfileirado',
      );
    } catch (erro) {
      this.logger.error(
        { chamadoId: job.chamadoId, tipo: nome, err: erro },
        'falha ao enfileirar e-mail',
      );
    }
  }

  private async emailsGestores() {
    const gestores = await this.prisma.usuario.findMany({
      where: { perfil: 'GESTOR' },
      select: { email: true },
    });
    return gestores.map((g) => g.email);
  }

  private async dados(chamadoId: string) {
    const c = await this.prisma.chamado.findUniqueOrThrow({
      where: { id: chamadoId },
      include: {
        empresa: { select: { nome: true } },
        solicitante: { select: { email: true } },
      },
    });
    return {
      id: c.id,
      numero: c.numero,
      titulo: c.titulo,
      prioridade: c.prioridade,
      empresa: c.empresa.nome,
      emailSolicitante: c.solicitante.email,
    };
  }
}
