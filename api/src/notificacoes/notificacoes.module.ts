import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FILA_EMAILS, OPCOES_JOB_EMAIL } from './constantes';
import { NotificacoesService } from './notificacoes.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: FILA_EMAILS,
      defaultJobOptions: OPCOES_JOB_EMAIL,
    }),
  ],
  providers: [NotificacoesService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
