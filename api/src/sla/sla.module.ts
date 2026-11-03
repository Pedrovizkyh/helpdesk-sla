import { Module } from '@nestjs/common';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';
import { VerificacaoSlaService } from './verificacao-sla.service';

@Module({
  controllers: [SlaController],
  providers: [SlaService, VerificacaoSlaService],
  exports: [SlaService, VerificacaoSlaService],
})
export class SlaModule {}
