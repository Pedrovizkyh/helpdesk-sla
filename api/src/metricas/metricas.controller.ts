import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfis } from '../auth/decorators/perfis.decorator';
import { PeriodoDto } from './dto/periodo.dto';
import { MetricasService } from './metricas.service';

@ApiTags('metricas')
@ApiBearerAuth()
@Perfis('GESTOR')
@Controller('metricas')
export class MetricasController {
  constructor(private readonly metricas: MetricasService) {}

  @Get()
  calcular(@Query() periodo: PeriodoDto) {
    return this.metricas.calcular(periodo);
  }
}
