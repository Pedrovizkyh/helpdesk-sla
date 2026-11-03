import { Module } from '@nestjs/common';
import { ChamadosController } from './chamados.controller';
import { ChamadosService } from './chamados.service';
import { HistoricoService } from './historico.service';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [SlaModule],
  controllers: [ChamadosController],
  providers: [ChamadosService, HistoricoService],
  exports: [ChamadosService, HistoricoService],
})
export class ChamadosModule {}
