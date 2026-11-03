import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';
import { VerificacaoSlaService } from './verificacao-sla.service';

@Module({
  imports: [NotificacoesModule],
  controllers: [SlaController],
  providers: [SlaService, VerificacaoSlaService],
  exports: [SlaService, VerificacaoSlaService],
})
export class SlaModule {}
