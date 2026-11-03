import { Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';
import { MailerService } from './mailer.service';
import { NotificacoesModule } from './notificacoes.module';

/** Carregado só com RUN_WORKER=true (pode rodar no mesmo processo da API). */
@Module({
  imports: [NotificacoesModule],
  providers: [EmailProcessor, MailerService],
})
export class EmailWorkerModule {}
