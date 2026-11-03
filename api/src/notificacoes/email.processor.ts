import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmailJob, FILA_EMAILS } from './constantes';
import { MailerService } from './mailer.service';

/** Worker: consome a fila "emails". Se o envio falhar, o BullMQ tenta de novo. */
// drainDelay/stalledInterval maiores reduzem comandos no Redis ocioso (Upstash grátis)
@Processor(FILA_EMAILS, {
  concurrency: 5,
  drainDelay: 30,
  stalledInterval: 120_000,
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly mailer: MailerService,
    @InjectPinoLogger(EmailProcessor.name) private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<EmailJob>) {
    await this.mailer.enviar(job.data);
    this.logger.info(
      {
        chamadoId: job.data.chamadoId,
        jobId: job.id,
        tentativa: job.attemptsMade + 1,
      },
      'e-mail enviado',
    );
  }

  @OnWorkerEvent('failed')
  falhou(job: Job<EmailJob> | undefined, erro: Error) {
    this.logger.warn(
      {
        chamadoId: job?.data.chamadoId,
        jobId: job?.id,
        tentativa: job?.attemptsMade,
        max: job?.opts.attempts,
        err: erro.message,
      },
      'falha ao enviar e-mail',
    );
  }
}
